import { createApiServiceError, createAxios, pickDefined } from 'slates';
import {
  credential,
  id,
  integer,
  pageInput,
  requireValue,
  safeJson,
  text,
  upstream,
  url,
  type z
} from './contracts';
import {
  answerSchema,
  contentsSchema,
  enrichmentSchema,
  itemSchema,
  legacyExportSchema,
  mapItem,
  monitorSchema,
  pageSchema,
  researchSchema,
  searchSchema,
  teamSchema,
  websetSchema
} from './models';

export class ExaClient {
  private readonly http: ReturnType<typeof createAxios>;
  constructor(
    private readonly token: string,
    input?: unknown
  ) {
    credential(token);
    if (input !== undefined) safeJson(input, [token]);
    this.http = createAxios({
      baseURL: 'https://api.exa.ai',
      headers: { 'x-api-key': token, 'Content-Type': 'application/json' },
      timeout: 60000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      maxBodyLength: 2 * 1024 * 1024,
      errorMapping: {
        defaults: { message: 'Exa request failed.' },
        extractResponseData: () => ({})
      }
    });
  }
  private async request<T extends z.ZodType>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    schema: T,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<z.infer<T>> {
    safeJson({ data: data ?? null, params: params ?? null }, [this.token]);
    try {
      const response = await this.http.request({ method, url: path, data, params });
      const headers =
        typeof response.headers.toJSON === 'function'
          ? response.headers.toJSON()
          : response.headers;
      safeJson(
        {
          body: response.data,
          headers,
          status: response.status,
          statusText: response.statusText
        },
        [this.token]
      );
      requireValue(
        [200, 201].includes(response.status),
        'Exa returned an unexpected success receipt. The operation may have taken effect; inspect the resource before retrying.'
      );
      const parsed = schema.safeParse(response.data);
      requireValue(
        parsed.success,
        'Exa returned an invalid or incomplete receipt. The operation may have taken effect or incurred cost; inspect it before retrying.'
      );
      return parsed.data;
    } catch (error) {
      throw upstream(
        error,
        `${method} ${path.split('/').filter(Boolean).slice(0, 3).join('/')}`
      );
    }
  }
  async search(params: SearchParams) {
    text(params.query, 10000);
    this.validateSearch(params);
    const { maxAgeHours, ...native } = params;
    let contents = native.contents;
    if (maxAgeHours !== undefined) {
      integer(maxAgeHours, -1, 720);
      contents = { ...contents, maxAgeHours };
    }
    return this.request('POST', '/search', searchSchema, { ...native, contents });
  }
  private validateSearch(params: Omit<SearchParams, 'query'>) {
    if (params.numResults !== undefined) integer(params.numResults, 1, 100);
    for (const name of [
      'startPublishedDate',
      'endPublishedDate',
      'startCrawlDate',
      'endCrawlDate'
    ] as const)
      if (params[name] !== undefined)
        requireValue(
          Number.isFinite(Date.parse(params[name]!)),
          'Provide valid ISO date filters.'
        );
    requireValue(
      !(
        ['company', 'people'].includes(params.category ?? '') &&
        (params.startPublishedDate !== undefined ||
          params.endPublishedDate !== undefined ||
          params.excludeDomains !== undefined)
      ),
      'Company and people search do not support publication dates or excludeDomains. Remove these filters.'
    );
    for (const name of ['includeDomains', 'excludeDomains'] as const)
      if (params[name]) {
        requireValue(params[name]!.length <= 1200, 'Use at most 1200 domain filters.');
        params[name]!.forEach(s => text(s, 2048));
      }
    for (const name of ['includeText', 'excludeText'] as const)
      if (params[name]) {
        requireValue(params[name]!.length <= 50, 'Use at most 50 text filters.');
        params[name]!.forEach(s => text(s, 4096));
      }
    for (const option of [params.contents?.text, params.contents?.highlights])
      if (option && typeof option === 'object' && option.maxCharacters !== undefined)
        integer(option.maxCharacters, 1, 1000000);
    if (params.contents?.subpages !== undefined) integer(params.contents.subpages, 0, 100);
    for (const value of Object.values(params.contents?.extras ?? {}))
      if (value !== undefined) integer(value, 0, 1000);
  }
  async getContents(params: GetContentsParams) {
    requireValue(
      Boolean(params.urls?.length) !== Boolean(params.ids?.length),
      'Provide either URLs or temporary document IDs, not both.'
    );
    const values = params.urls ?? params.ids!;
    requireValue(
      values.length >= 1 && values.length <= 100,
      'Use between 1 and 100 URLs or document IDs.'
    );
    values.forEach(v => {
      text(v, 2048);
      if (params.urls) url(v);
    });
    if (params.maxAgeHours !== undefined) integer(params.maxAgeHours, -1, 720);
    if (params.livecrawlTimeout !== undefined) integer(params.livecrawlTimeout, 1, 90000);
    this.validateSearch({ contents: params });
    return this.request('POST', '/contents', contentsSchema, params);
  }
  async findSimilar(params: FindSimilarParams) {
    url(params.url);
    this.validateSearch(params);
    return this.request('POST', '/findSimilar', searchSchema, params);
  }
  async answer(params: AnswerParams) {
    text(params.query, 10000);
    return this.request('POST', '/answer', answerSchema, params);
  }
  async createResearch(params: CreateResearchParams) {
    text(params.instructions, 4096);
    return this.request('POST', '/research/v1', researchSchema, {
      ...params,
      model: params.model ?? 'exa-research-fast'
    });
  }
  async getResearch(researchId: string) {
    const result = await this.request(
      'GET',
      `/research/v1/${id(researchId)}`,
      researchSchema,
      undefined,
      { stream: false }
    );
    requireValue(result.researchId === researchId, 'Exa returned a different research ID.');
    return result;
  }
  async createWebset(params: CreateWebsetParams) {
    if (params.search) {
      text(params.search.query, 5000);
      if (params.search.count !== undefined)
        requireValue(
          Number.isFinite(params.search.count) && params.search.count >= 1,
          'Provide a positive native count.'
        );
      this.criteria(params.search.criteria);
    }
    if (params.title !== undefined) text(params.title);
    if (params.externalId !== undefined) text(params.externalId, 300);
    for (const e of params.enrichments ?? []) this.enrichment(e);
    const { entityDescription: _entityDescription, ...nativeSearch } = params.search ?? {};
    const search = params.search
      ? {
          ...nativeSearch,
          entity: params.search.entity
            ? {
                type: params.search.entity,
                ...(params.search.entity === 'custom'
                  ? { description: params.search.entityDescription }
                  : {})
              }
            : undefined
        }
      : undefined;
    if (params.search?.entity === 'custom')
      text(params.search.entityDescription ?? '', 200, 2);
    return this.request('POST', '/websets/v0/websets', websetSchema, { ...params, search });
  }
  async getWebset(websetId: string) {
    const result = await this.request(
      'GET',
      `/websets/v0/websets/${id(websetId)}`,
      websetSchema
    );
    this.websetIdentity(result, websetId);
    return result;
  }
  private websetIdentity(result: z.infer<typeof websetSchema>, value: string) {
    requireValue(
      result.id === value || result.externalId === value,
      'Exa returned a different Webset. Use its native ID for dependent resources.'
    );
  }
  async listWebsets(params: { cursor?: string; limit?: number; search?: string } = {}) {
    pageInput(params);
    if (params.search !== undefined) text(params.search, 50, 2);
    const result = await this.request(
      'GET',
      '/websets/v0/websets',
      pageSchema(websetSchema),
      undefined,
      params
    );
    requireValue(
      !result.hasMore || result.nextCursor !== params.cursor,
      'Exa returned a repeated continuation cursor.'
    );
    return result;
  }
  async updateWebset(websetId: string, params: UpdateWebsetParams) {
    requireValue(
      params.externalId === undefined,
      'The current Webset update endpoint supports title and metadata only. Omit externalId; assign it when creating a Webset.'
    );
    requireValue(
      params.title !== undefined || params.metadata !== undefined,
      'Provide title or metadata to update.'
    );
    if (params.title !== undefined) text(params.title);
    const result = await this.request(
      'POST',
      `/websets/v0/websets/${id(websetId)}`,
      websetSchema,
      pickDefined(params)
    );
    this.websetIdentity(result, websetId);
    return result;
  }
  async deleteWebset(websetId: string) {
    const result = await this.request(
      'DELETE',
      `/websets/v0/websets/${id(websetId)}`,
      websetSchema
    );
    this.websetIdentity(result, websetId);
    return result;
  }
  async cancelWebset(websetId: string) {
    const result = await this.request(
      'POST',
      `/websets/v0/websets/${id(websetId)}/cancel`,
      websetSchema
    );
    this.websetIdentity(result, websetId);
    return result;
  }
  async listWebsetItems(
    websetId: string,
    params: { cursor?: string; limit?: number; status?: string; sourceId?: string } = {}
  ) {
    pageInput(params);
    requireValue(
      params.status === undefined,
      'The native item list supports sourceId and cursors, not status. Omit status; inspect native evaluations and enrichmentResults.'
    );
    const { status: _status, ...native } = params;
    const result = await this.request(
      'GET',
      `/websets/v0/websets/${id(websetId)}/items`,
      pageSchema(itemSchema),
      undefined,
      native
    );
    requireValue(
      result.data.every(item => item.websetId === websetId),
      'Exa item list contains a different parent Webset.'
    );
    requireValue(
      !result.hasMore || result.nextCursor !== params.cursor,
      'Exa returned a repeated continuation cursor.'
    );
    return { ...result, data: result.data.map(mapItem) };
  }
  async getWebsetItem(websetId: string, itemId: string) {
    const result = await this.request(
      'GET',
      `/websets/v0/websets/${id(websetId)}/items/${id(itemId)}`,
      itemSchema
    );
    this.childIdentity(result, websetId, itemId);
    return mapItem(result);
  }
  async deleteWebsetItem(websetId: string, itemId: string) {
    const result = await this.request(
      'DELETE',
      `/websets/v0/websets/${id(websetId)}/items/${id(itemId)}`,
      itemSchema
    );
    this.childIdentity(result, websetId, itemId);
    return result;
  }
  private childIdentity(
    result: { id: string; websetId: string },
    parent: string,
    resource: string
  ) {
    requireValue(
      result.id === resource && result.websetId === parent,
      'Exa returned a different resource or parent. Inspect the requested resource before retrying a mutation.'
    );
  }
  private criteria(criteria?: Array<{ description: string }>) {
    if (criteria) {
      requireValue(
        criteria.length >= 1 && criteria.length <= 5,
        'Use between 1 and 5 criteria.'
      );
      criteria.forEach(c => text(c.description, 1000));
    }
  }
  private enrichment(params: {
    description?: string;
    format?: string;
    options?: Array<{ label: string }>;
  }) {
    if (params.description !== undefined) text(params.description, 5000);
    if (params.format !== undefined)
      requireValue(
        ['text', 'date', 'number', 'options', 'email', 'phone', 'url'].includes(params.format),
        'Use a native enrichment format: text, date, number, options, email, phone or url.'
      );
    if (params.options) {
      requireValue(
        params.options.length >= 1 && params.options.length <= 150,
        'Use between 1 and 150 options.'
      );
      params.options.forEach(o => text(o.label));
    }
  }
  async createEnrichment(websetId: string, params: CreateEnrichmentParams) {
    this.enrichment(params);
    const result = await this.request(
      'POST',
      `/websets/v0/websets/${id(websetId)}/enrichments`,
      enrichmentSchema,
      params
    );
    requireValue(result.websetId === websetId, 'Exa returned a different enrichment parent.');
    return result;
  }
  async updateEnrichment(
    websetId: string,
    enrichmentId: string,
    params: UpdateEnrichmentParams
  ) {
    this.enrichment(params);
    requireValue(
      Object.values(params).some(v => v !== undefined),
      'Provide an enrichment field to update.'
    );
    const result = await this.request(
      'PATCH',
      `/websets/v0/websets/${id(websetId)}/enrichments/${id(enrichmentId)}`,
      enrichmentSchema,
      params
    );
    this.childIdentity(result, websetId, enrichmentId);
    return result;
  }
  async deleteEnrichment(websetId: string, enrichmentId: string) {
    const result = await this.request(
      'DELETE',
      `/websets/v0/websets/${id(websetId)}/enrichments/${id(enrichmentId)}`,
      enrichmentSchema
    );
    this.childIdentity(result, websetId, enrichmentId);
    return result;
  }
  async createMonitor(websetId: string, params: CreateMonitorParams) {
    requireValue(
      params.behavior.type === 'search',
      'The current Websets monitor supports search behavior. Refresh is retained only for input compatibility; use documented enrichment operations externally.'
    );
    requireValue(
      Boolean(params.behavior.config),
      'Search monitors require explicit behavior config and count. Provide searchCount.'
    );
    requireValue(
      Number.isFinite(params.behavior.config!.count) && params.behavior.config!.count >= 1,
      'Provide a positive native count.'
    );
    if (params.behavior.config!.query !== undefined)
      text(params.behavior.config!.query, 10000, 2);
    this.criteria(params.behavior.config!.criteria);
    params.behavior.config!.criteria?.forEach(c => text(c.description, 1000, 2));
    const fields = params.cadence.cron.trim().split(/\s+/);
    requireValue(
      fields.length === 5 &&
        /^\d+$/.test(fields[0]!) &&
        /^\d+$/.test(fields[1]!) &&
        Number(fields[0]) < 60 &&
        Number(fields[1]) < 24 &&
        fields.slice(2).every(f => /^[0-9*,/-]+$/.test(f)),
      'Use a five-field Unix cron with fixed minute/hour, at most once per day. More complex cadence requires direct native validation.'
    );
    const result = await this.request('POST', '/websets/v0/monitors', monitorSchema, {
      websetId,
      ...params
    });
    if (
      result.websetId !== websetId ||
      result.behavior.type !== params.behavior.type ||
      result.behavior.config.count !== params.behavior.config!.count ||
      (params.behavior.config!.query !== undefined &&
        result.behavior.config.query !== params.behavior.config!.query) ||
      result.cadence.cron.trim().split(/\s+/).join(' ') !== fields.join(' ') ||
      (params.cadence.timezone !== undefined &&
        result.cadence.timezone !== params.cadence.timezone)
    ) {
      const error = createApiServiceError(
        `Monitor ${result.id} may already exist with different settings. Inspect its native parent and configuration and reconcile it before retrying; do not repeat creation blindly.`,
        { reason: 'unconfirmed_monitor_creation', parent: {} }
      );
      error.data.monitorId = result.id;
      error.data.websetId = result.websetId;
      error.data.requestedWebsetId = websetId;
      error.data.outcome = 'uncertain';
      throw error;
    }
    return result;
  }
  async deleteMonitor(websetId: string, monitorId: string) {
    const path = `/websets/v0/monitors/${id(monitorId)}`;
    const before = await this.request('GET', path, monitorSchema);
    this.childIdentity(before, websetId, monitorId);
    const result = await this.request('DELETE', path, monitorSchema);
    this.childIdentity(result, websetId, monitorId);
    return result;
  }
  async createExport(websetId: string, params: CreateExportParams) {
    const result = await this.request(
      'POST',
      `/websets/v0/websets/${id(websetId)}/exports`,
      legacyExportSchema,
      params
    );
    requireValue(
      result.websetId === undefined || result.websetId === websetId,
      'Exa returned a different legacy export parent. Inspect before retrying.'
    );
    return result;
  }
  async getExport(websetId: string, exportId: string) {
    const result = await this.request(
      'GET',
      `/websets/v0/websets/${id(websetId)}/exports/${id(exportId)}`,
      legacyExportSchema
    );
    requireValue(
      result.id === exportId &&
        (result.websetId === undefined || result.websetId === websetId),
      'Exa returned a different legacy export resource.'
    );
    return result;
  }
  async getTeamInfo() {
    return this.request('GET', '/v0/teams/me', teamSchema);
  }
}

// --- Types ---

export interface ContentOptions {
  maxAgeHours?: number;
  text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean };
  highlights?: boolean | { maxCharacters?: number; query?: string };
  summary?: { query?: string };
  livecrawl?: 'always' | 'preferred' | 'fallback' | 'never';
  subpages?: number;
  extras?: { links?: number; imageLinks?: number };
}

export interface SearchParams {
  query: string;
  type?: 'neural' | 'auto' | 'fast' | 'deep' | 'instant' | 'deep-lite' | 'deep-reasoning';
  category?:
    | 'company'
    | 'publication'
    | 'research paper'
    | 'news'
    | 'tweet'
    | 'personal site'
    | 'financial report'
    | 'people';
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  includeText?: string[];
  excludeText?: string[];
  contents?: ContentOptions;
  moderation?: boolean;
  maxAgeHours?: number;
}

export interface SearchResult {
  id?: string;
  title?: string;
  url: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
  subpages?: SearchResult[];
  extras?: { links?: string[]; imageLinks?: string[] };
}

export interface SearchResponse {
  requestId: string;
  searchType?: string;
  results: SearchResult[];
  costDollars?: { total: number };
}

export interface GetContentsParams {
  urls?: string[];
  ids?: string[];
  maxAgeHours?: number;
  text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean };
  highlights?: boolean | { maxCharacters?: number; query?: string };
  summary?: { query?: string };
  subpages?: number;
  livecrawlTimeout?: number;
  extras?: { links?: number; imageLinks?: number };
}

export interface GetContentsResponse {
  requestId: string;
  results: SearchResult[];
  costDollars?: { total: number };
}

export interface FindSimilarParams {
  url: string;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  includeText?: string[];
  excludeText?: string[];
  contents?: ContentOptions;
  moderation?: boolean;
}

export interface AnswerParams {
  query: string;
  text?: boolean;
}

export interface AnswerCitation {
  url: string;
  title?: string;
  author?: string;
  publishedDate?: string;
  text?: string;
  image?: string;
  favicon?: string;
}

export interface AnswerResponse {
  answer: string;
  citations: AnswerCitation[];
  costDollars?: { total: number };
}

export interface CreateResearchParams {
  instructions: string;
  model?: 'exa-research-fast' | 'exa-research' | 'exa-research-pro';
  outputSchema?: Record<string, unknown>;
}

export interface ResearchResponse {
  researchId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  createdAt: number;
  finishedAt?: number;
  model?: string;
  instructions?: string;
  output?: {
    content: string;
    parsed?: Record<string, unknown>;
  };
  costDollars?: {
    total: number;
    numSearches?: number;
    numPages?: number;
    reasoningTokens?: number;
  };
  error?: string;
  events?: Record<string, unknown>[];
}

// --- Webset Types ---

export interface Webset {
  id: string;
  object: string;
  status: 'idle' | 'pending' | 'running' | 'paused';
  externalId?: string;
  title?: string;
  searches?: Record<string, unknown>[];
  imports?: Record<string, unknown>[];
  enrichments?: WebsetEnrichment[];
  monitors?: Record<string, unknown>[];
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebsetParams {
  search?: {
    query: string;
    count?: number;
    entity?: 'company' | 'person' | 'article' | 'research_paper' | 'custom';
    criteria?: Array<{ description: string }>;
    entityDescription?: string;
  };
  enrichments?: Array<{
    description: string;
    format?: string;
    options?: Array<{ label: string }>;
  }>;
  externalId?: string;
  metadata?: Record<string, string>;
  title?: string;
}

export interface UpdateWebsetParams {
  metadata?: Record<string, string>;
  title?: string;
  externalId?: string;
}

export interface WebsetSearchParams {
  query: string;
  count?: number;
  entity?: 'company' | 'person' | 'article' | 'research_paper' | 'custom';
  criteria?: Array<{ description: string }>;
}

export interface WebsetItem {
  id: string;
  object: string;
  status: string;
  url: string;
  title?: string;
  source?: string;
  properties?: Record<string, unknown>;
  enrichments?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WebsetEnrichment {
  id: string;
  object: string;
  status: string;
  description: string;
  format?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnrichmentParams {
  description: string;
  options?: Array<{ label: string }>;
  format?: string;
}

export interface UpdateEnrichmentParams {
  description?: string;
  options?: Array<{ label: string }>;
  format?: string;
}

export interface CreateImportParams {
  websetId: string;
  urls?: string[];
  csv?: string;
}

export interface CreateMonitorParams {
  behavior: {
    type: 'search' | 'refresh';
    config?: { count: number; query?: string; criteria?: Array<{ description: string }> };
  };
  cadence: {
    cron: string;
    timezone?: string;
  };
}

export interface UpdateMonitorParams {
  behavior?: {
    type: 'search' | 'refresh';
  };
  cadence?: {
    cron: string;
  };
}

export interface CreateExportParams {
  format: 'csv' | 'json' | 'xlsx';
}

export interface CreateWebhookParams {
  url: string;
  events: string[];
  metadata?: Record<string, string>;
}

export interface UpdateWebhookParams {
  url?: string;
  events?: string[];
  status?: 'active' | 'inactive';
  metadata?: Record<string, string>;
}

export interface WebhookResponse {
  id: string;
  object: string;
  status: 'active' | 'inactive';
  events: string[];
  url: string;
  secret?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface WebsetEvent {
  id: string;
  object: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
}
