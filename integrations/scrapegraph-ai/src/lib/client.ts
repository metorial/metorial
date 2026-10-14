import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.scrapegraphai.com/v1';
let CURRENT_BASE_URL = 'https://v2-api.scrapegraphai.com/api';

let validateWholeNumber = (
  value: number | undefined,
  name: string,
  min: number,
  max?: number
) => {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max)) {
    throw createApiServiceError(
      `${name} must be a whole number ${max === undefined ? `of at least ${min}` : `between ${min} and ${max}`}.`,
      { reason: 'invalid_input' }
    );
  }
};

let validateSource = (sources: (string | undefined)[], names: string[]) => {
  if (sources.filter(source => source !== undefined).length !== 1) {
    throw createApiServiceError(`Provide exactly one of ${names.join(', ')}.`, {
      reason: 'invalid_input'
    });
  }
  if (sources.some(source => source !== undefined && !source.trim())) {
    throw createApiServiceError('The content source must not be empty.', {
      reason: 'invalid_input'
    });
  }
};

let validatePrompt = (prompt: string | undefined) => {
  if (!prompt?.trim()) {
    throw createApiServiceError('Provide a non-empty prompt.', { reason: 'invalid_input' });
  }
};

export interface SmartScraperParams {
  websiteUrl?: string;
  websiteHtml?: string;
  websiteMarkdown?: string;
  userPrompt: string;
  outputSchema?: Record<string, unknown>;
  plainText?: boolean;
  stealth?: boolean;
  waitMs?: number;
  countryCode?: string;
  numberOfScrolls?: number;
}

export interface SearchScraperParams {
  userPrompt: string;
  numResults?: number;
  extractionMode?: boolean;
  locationGeoCode?: string;
  timeRange?: string;
  outputSchema?: Record<string, unknown>;
}

export interface CrawlParams {
  url: string;
  prompt?: string;
  depth?: number;
  breadth?: number;
  maxPages?: number;
  extractionMode?: boolean;
  schema?: Record<string, unknown>;
  rules?: {
    includePaths?: string[];
    excludePaths?: string[];
    sameDomain?: boolean;
    exclude?: string[];
  };
  sitemap?: boolean;
  webhookUrl?: string;
  waitMs?: number;
}

export interface MarkdownifyParams {
  websiteUrl: string;
  stealth?: boolean;
  waitMs?: number;
  countryCode?: string;
}

export interface ScrapeParams {
  websiteUrl: string;
  branding?: boolean;
  stealth?: boolean;
  waitMs?: number;
  countryCode?: string;
}

export interface SitemapParams {
  websiteUrl: string;
  stealth?: boolean;
}

export interface AgenticScraperParams {
  url: string;
  steps: string[];
  useSession?: boolean;
  aiExtraction?: boolean;
  userPrompt?: string;
  outputSchema?: Record<string, unknown>;
}

export class Client {
  private axios;
  private currentAxios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a non-empty ScrapeGraphAI API key.', {
        reason: 'invalid_auth'
      });
    }
    let authHeader = { name: 'SGAI-APIKEY', value: config.token };
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'ScrapeGraphAI',
        reason: 'api_error',
        nestedKeys: ['error', 'errors', 'details']
      });
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader,
      errorAdapter
    });
    this.currentAxios = createAuthenticatedAxios({
      baseURL: CURRENT_BASE_URL,
      authHeader,
      errorAdapter
    });
  }

  async smartScraper(params: SmartScraperParams) {
    validateSource(
      [params.websiteUrl, params.websiteHtml, params.websiteMarkdown],
      ['websiteUrl', 'websiteHtml', 'websiteMarkdown']
    );
    validatePrompt(params.userPrompt);
    validateWholeNumber(params.waitMs, 'waitMs', 0);
    validateWholeNumber(params.numberOfScrolls, 'numberOfScrolls', 0);
    let body: Record<string, unknown> = {
      user_prompt: params.userPrompt
    };

    if (params.websiteUrl) body.website_url = params.websiteUrl;
    if (params.websiteHtml) body.website_html = params.websiteHtml;
    if (params.websiteMarkdown) body.website_markdown = params.websiteMarkdown;
    if (params.outputSchema) body.output_schema = params.outputSchema;
    if (params.plainText !== undefined) body.plain_text = params.plainText;
    if (params.stealth !== undefined) body.stealth = params.stealth;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;
    if (params.countryCode) body.country_code = params.countryCode;
    if (params.numberOfScrolls !== undefined) body.number_of_scrolls = params.numberOfScrolls;

    let response = await this.axios.post('/smartscraper', body);
    return response.data;
  }

  async searchScraper(params: SearchScraperParams) {
    validatePrompt(params.userPrompt);
    validateWholeNumber(params.numResults, 'numResults', 3, 20);
    let body: Record<string, unknown> = {
      user_prompt: params.userPrompt
    };

    if (params.numResults !== undefined) body.num_results = params.numResults;
    if (params.extractionMode !== undefined) body.extraction_mode = params.extractionMode;
    if (params.locationGeoCode) body.location_geo_code = params.locationGeoCode;
    if (params.timeRange) body.time_range = params.timeRange;
    if (params.outputSchema) body.output_schema = params.outputSchema;

    let response = await this.axios.post('/searchscraper', body);
    return response.data;
  }

  async crawl(params: CrawlParams) {
    if (params.extractionMode !== false) validatePrompt(params.prompt);
    validateWholeNumber(params.depth, 'depth', 0);
    validateWholeNumber(params.breadth, 'breadth', 1);
    validateWholeNumber(params.maxPages, 'maxPages', 1);
    validateWholeNumber(params.waitMs, 'waitMs', 0);
    let body: Record<string, unknown> = {
      url: params.url
    };

    if (params.prompt) body.prompt = params.prompt;
    if (params.depth !== undefined) body.depth = params.depth;
    if (params.breadth !== undefined) body.breadth = params.breadth;
    if (params.maxPages !== undefined) body.max_pages = params.maxPages;
    if (params.extractionMode !== undefined) body.extraction_mode = params.extractionMode;
    if (params.schema) body.data_schema = params.schema;
    if (params.rules) {
      let rules: Record<string, unknown> = {};
      if (params.rules.includePaths) rules.include_paths = params.rules.includePaths;
      if (params.rules.excludePaths) rules.exclude_paths = params.rules.excludePaths;
      if (params.rules.sameDomain !== undefined) rules.same_domain = params.rules.sameDomain;
      if (params.rules.exclude) rules.exclude = params.rules.exclude;
      body.rules = rules;
    }
    if (params.sitemap !== undefined) body.sitemap = params.sitemap;
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;

    let response = await this.axios.post('/crawl', body);
    return response.data;
  }

  async markdownify(params: MarkdownifyParams) {
    validateWholeNumber(params.waitMs, 'waitMs', 0);
    let body: Record<string, unknown> = {
      website_url: params.websiteUrl
    };

    if (params.stealth !== undefined) body.stealth = params.stealth;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;
    if (params.countryCode) body.country_code = params.countryCode;

    let response = await this.axios.post('/markdownify', body);
    return response.data;
  }

  async scrape(params: ScrapeParams) {
    validateWholeNumber(params.waitMs, 'waitMs', 0);
    let body: Record<string, unknown> = {
      website_url: params.websiteUrl
    };

    if (params.branding !== undefined) body.branding = params.branding;
    if (params.stealth !== undefined) body.stealth = params.stealth;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;
    if (params.countryCode) body.country_code = params.countryCode;

    let response = await this.axios.post('/scrape', body);
    return response.data;
  }

  async sitemap(params: SitemapParams) {
    let body: Record<string, unknown> = {
      website_url: params.websiteUrl
    };

    if (params.stealth !== undefined) body.stealth = params.stealth;

    let response = await this.axios.post('/sitemap', body);
    return response.data;
  }

  async agenticScraper(params: AgenticScraperParams) {
    if (!params.steps.length || params.steps.some(step => !step.trim())) {
      throw createApiServiceError('Provide at least one non-empty browser action in steps.', {
        reason: 'invalid_input'
      });
    }
    if (params.aiExtraction) validatePrompt(params.userPrompt);
    let body: Record<string, unknown> = {
      url: params.url,
      steps: params.steps
    };

    if (params.useSession !== undefined) body.use_session = params.useSession;
    if (params.aiExtraction !== undefined) body.ai_extraction = params.aiExtraction;
    if (params.userPrompt) body.user_prompt = params.userPrompt;
    if (params.outputSchema) body.output_schema = params.outputSchema;

    let response = await this.axios.post('/agentic-scrapper', body);
    return response.data;
  }

  async getCredits() {
    let response = await this.axios.get('/credits');
    return response.data;
  }

  async getRequestStatus(service: string, requestId: string) {
    if (!requestId.trim()) {
      throw createApiServiceError('Provide a non-empty requestId.', {
        reason: 'invalid_input'
      });
    }
    let response = await this.axios.get(`/${service}/${encodeURIComponent(requestId)}`);
    return response.data;
  }

  async extract(params: {
    url?: string;
    html?: string;
    markdown?: string;
    prompt: string;
    schema?: Record<string, unknown>;
    mode?: 'normal' | 'reader' | 'prune';
  }) {
    validateSource([params.url, params.html, params.markdown], ['url', 'html', 'markdown']);
    validatePrompt(params.prompt);
    for (let content of [params.html, params.markdown]) {
      if (content !== undefined && Buffer.byteLength(content, 'utf8') > 2 * 1024 * 1024) {
        throw createApiServiceError('HTML and Markdown sources must not exceed 2 MB.', {
          reason: 'invalid_input'
        });
      }
    }
    let response = await this.currentAxios.post<{
      id: string;
      json: unknown;
      raw?: string | null;
      usage?: { promptTokens: number; completionTokens: number };
      metadata?: Record<string, unknown>;
    }>('/extract', pickDefined(params));
    return response.data;
  }

  async generateSchema(params: {
    prompt: string;
    existingSchema?: Record<string, unknown>;
    model?: string;
  }) {
    validatePrompt(params.prompt);
    let response = await this.currentAxios.post<{
      schema: Record<string, unknown>;
      refinedPrompt?: string;
      usage?: { promptTokens: number; completionTokens: number };
    }>(
      '/schema',
      pickDefined({
        prompt: params.prompt,
        existing_schema: params.existingSchema,
        model: params.model
      })
    );
    return response.data;
  }

  async listHistory(params: {
    page?: number;
    limit?: number;
    service?: 'scrape' | 'extract' | 'search' | 'monitor' | 'crawl' | 'schema';
    sessionId?: string;
  }) {
    validateWholeNumber(params.page, 'page', 1);
    validateWholeNumber(params.limit, 'limit', 1);
    if (params.sessionId !== undefined && params.sessionId.length > 128) {
      throw createApiServiceError('sessionId must not exceed 128 characters.', {
        reason: 'invalid_input'
      });
    }
    let response = await this.currentAxios.get<{
      data: {
        id: string;
        userId: string;
        sessionId: string | null;
        service: string;
        status: string;
        error: unknown;
        elapsedMs: number | null;
        requestParentId: string | null;
        createdAt: string;
      }[];
      pagination: { page: number; limit: number; total: number };
    }>('/history', { params: pickDefined(params) });
    return response.data;
  }
}
