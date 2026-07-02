import { createAxios } from 'slates';

let BASE_URL = 'https://api.exa.ai';

export class ExaClient {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Search API ---

  async search(params: SearchParams) {
    let response = await this.http.post('/search', params);
    return response.data as SearchResponse;
  }

  async getContents(params: GetContentsParams) {
    let response = await this.http.post('/contents', params);
    return response.data as GetContentsResponse;
  }

  async findSimilar(params: FindSimilarParams) {
    let response = await this.http.post('/findSimilar', params);
    return response.data as SearchResponse;
  }

  async answer(params: AnswerParams) {
    let response = await this.http.post('/answer', params);
    return response.data as AnswerResponse;
  }

  // --- Research API ---

  async createResearch(params: CreateResearchParams) {
    let response = await this.http.post('/research/v1', params);
    return response.data as ResearchResponse;
  }

  async getResearch(researchId: string) {
    let response = await this.http.get(`/research/v1/${researchId}`);
    return response.data as ResearchResponse;
  }

  // --- Websets API ---

  async createWebset(params: CreateWebsetParams) {
    let response = await this.http.post('/websets/v0/websets', params);
    return response.data as Webset;
  }

  async getWebset(websetId: string) {
    let response = await this.http.get(`/websets/v0/websets/${websetId}`);
    return response.data as Webset;
  }

  async listWebsets(params?: { cursor?: string; limit?: number }) {
    let response = await this.http.get('/websets/v0/websets', { params });
    return response.data as { data: Webset[]; hasMore: boolean; nextCursor?: string };
  }

  async updateWebset(websetId: string, params: UpdateWebsetParams) {
    let response = await this.http.patch(`/websets/v0/websets/${websetId}`, params);
    return response.data as Webset;
  }

  async deleteWebset(websetId: string) {
    await this.http.delete(`/websets/v0/websets/${websetId}`);
  }

  async cancelWebset(websetId: string) {
    let response = await this.http.post(`/websets/v0/websets/${websetId}/cancel`);
    return response.data as Webset;
  }

  // --- Webset Searches ---

  async createWebsetSearch(websetId: string, params: WebsetSearchParams) {
    let response = await this.http.post(`/websets/v0/websets/${websetId}/searches`, params);
    return response.data;
  }

  async getWebsetSearch(websetId: string, searchId: string) {
    let response = await this.http.get(`/websets/v0/websets/${websetId}/searches/${searchId}`);
    return response.data;
  }

  async cancelWebsetSearch(websetId: string, searchId: string) {
    let response = await this.http.post(
      `/websets/v0/websets/${websetId}/searches/${searchId}/cancel`
    );
    return response.data;
  }

  // --- Webset Items ---

  async listWebsetItems(
    websetId: string,
    params?: { cursor?: string; limit?: number; status?: string }
  ) {
    let response = await this.http.get(`/websets/v0/websets/${websetId}/items`, { params });
    return response.data as { data: WebsetItem[]; hasMore: boolean; nextCursor?: string };
  }

  async getWebsetItem(websetId: string, itemId: string) {
    let response = await this.http.get(`/websets/v0/websets/${websetId}/items/${itemId}`);
    return response.data as WebsetItem;
  }

  async deleteWebsetItem(websetId: string, itemId: string) {
    await this.http.delete(`/websets/v0/websets/${websetId}/items/${itemId}`);
  }

  // --- Enrichments ---

  async createEnrichment(websetId: string, params: CreateEnrichmentParams) {
    let response = await this.http.post(`/websets/v0/websets/${websetId}/enrichments`, params);
    return response.data as WebsetEnrichment;
  }

  async getEnrichment(websetId: string, enrichmentId: string) {
    let response = await this.http.get(
      `/websets/v0/websets/${websetId}/enrichments/${enrichmentId}`
    );
    return response.data as WebsetEnrichment;
  }

  async updateEnrichment(
    websetId: string,
    enrichmentId: string,
    params: UpdateEnrichmentParams
  ) {
    let response = await this.http.patch(
      `/websets/v0/websets/${websetId}/enrichments/${enrichmentId}`,
      params
    );
    return response.data as WebsetEnrichment;
  }

  async deleteEnrichment(websetId: string, enrichmentId: string) {
    await this.http.delete(`/websets/v0/websets/${websetId}/enrichments/${enrichmentId}`);
  }

  async cancelEnrichment(websetId: string, enrichmentId: string) {
    let response = await this.http.post(
      `/websets/v0/websets/${websetId}/enrichments/${enrichmentId}/cancel`
    );
    return response.data as WebsetEnrichment;
  }

  // --- Imports ---

  async createImport(params: CreateImportParams) {
    let response = await this.http.post('/websets/v0/imports', params);
    return response.data;
  }

  async getImport(importId: string) {
    let response = await this.http.get(`/websets/v0/imports/${importId}`);
    return response.data;
  }

  async listImports(params?: { cursor?: string; limit?: number }) {
    let response = await this.http.get('/websets/v0/imports', { params });
    return response.data;
  }

  // --- Monitors ---

  async createMonitor(websetId: string, params: CreateMonitorParams) {
    let response = await this.http.post(`/websets/v0/websets/${websetId}/monitors`, params);
    return response.data;
  }

  async getMonitor(websetId: string, monitorId: string) {
    let response = await this.http.get(
      `/websets/v0/websets/${websetId}/monitors/${monitorId}`
    );
    return response.data;
  }

  async listMonitors(websetId: string, params?: { cursor?: string; limit?: number }) {
    let response = await this.http.get(`/websets/v0/websets/${websetId}/monitors`, { params });
    return response.data;
  }

  async updateMonitor(websetId: string, monitorId: string, params: UpdateMonitorParams) {
    let response = await this.http.patch(
      `/websets/v0/websets/${websetId}/monitors/${monitorId}`,
      params
    );
    return response.data;
  }

  async deleteMonitor(websetId: string, monitorId: string) {
    await this.http.delete(`/websets/v0/websets/${websetId}/monitors/${monitorId}`);
  }

  // --- Exports ---

  async createExport(websetId: string, params: CreateExportParams) {
    let response = await this.http.post(`/websets/v0/websets/${websetId}/exports`, params);
    return response.data;
  }

  async getExport(websetId: string, exportId: string) {
    let response = await this.http.get(`/websets/v0/websets/${websetId}/exports/${exportId}`);
    return response.data;
  }

  // --- Webhooks ---

  async createWebhook(params: CreateWebhookParams) {
    let response = await this.http.post('/websets/v0/webhooks', params);
    return response.data as WebhookResponse;
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/websets/v0/webhooks/${webhookId}`);
    return response.data as WebhookResponse;
  }

  async listWebhooks(params?: { cursor?: string; limit?: number }) {
    let response = await this.http.get('/websets/v0/webhooks', { params });
    return response.data as { data: WebhookResponse[]; hasMore: boolean; nextCursor?: string };
  }

  async updateWebhook(webhookId: string, params: UpdateWebhookParams) {
    let response = await this.http.patch(`/websets/v0/webhooks/${webhookId}`, params);
    return response.data as WebhookResponse;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/websets/v0/webhooks/${webhookId}`);
  }

  // --- Events ---

  async listEvents(params?: { cursor?: string; limit?: number; type?: string }) {
    let response = await this.http.get('/websets/v0/events', { params });
    return response.data as { data: WebsetEvent[]; hasMore: boolean; nextCursor?: string };
  }

  async getEvent(eventId: string) {
    let response = await this.http.get(`/websets/v0/events/${eventId}`);
    return response.data as WebsetEvent;
  }
}

// --- Types ---

export interface ContentOptions {
  text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean };
  highlights?: boolean | { maxCharacters?: number; query?: string };
  summary?: { query?: string };
  livecrawl?: 'always' | 'preferred' | 'fallback' | 'never';
  subpages?: number;
  extras?: { links?: number; imageLinks?: number };
}

export interface SearchParams {
  query: string;
  type?: 'neural' | 'auto' | 'fast' | 'deep';
  category?:
    | 'company'
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
  id: string;
  title: string;
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
  urls: string[];
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
  };
  enrichments?: Array<{
    description: string;
    format?: string;
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
  format?: string;
}

export interface UpdateEnrichmentParams {
  description?: string;
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
  };
  cadence: {
    cron: string;
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
