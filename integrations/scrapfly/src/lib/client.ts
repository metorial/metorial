import { buildApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';

let parseErrorData = (value: unknown): unknown => {
  let data = value;
  if (data instanceof ArrayBuffer) {
    data = Buffer.from(data).toString('utf8');
  } else if (data instanceof Uint8Array) {
    data = Buffer.from(data).toString('utf8');
  }
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return data;
    }
  }
  if (isApiErrorRecord(data)) {
    if (isApiErrorRecord(data.result) && isApiErrorRecord(data.result.error)) {
      return data.result.error;
    }
    if (isApiErrorRecord(data.error)) return data.error;
  }
  return data;
};

export class Client {
  private http;

  constructor(private token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.scrapfly.io',
      contentType: false,
      timeout: 155000,
      errorMapping: {
        extractResponseData: response => parseErrorData(response.data),
        mapAxiosError: (error, inferred) => {
          let data = parseErrorData(error.response?.data);
          return {
            ...inferred,
            retryable:
              isApiErrorRecord(data) && typeof data.retryable === 'boolean'
                ? data.retryable
                : inferred.retryable
          };
        }
      },
      errorAdapter: error => {
        let adapted = buildApiServiceError(error, {
          providerLabel: 'Scrapfly',
          reason: 'scrapfly_api_error',
          detailKeys: ['message', 'description', 'detail', 'error_description', 'code'],
          nestedKeys: ['error', 'errors', 'result'],
          extractUpstreamCode: (_failure, response, helpers) => {
            let data = response?.data;
            return helpers.isRecord(data) && typeof data.code === 'string'
              ? data.code
              : undefined;
          },
          extractResponse: (failure, helpers) => {
            let response = helpers.getResponse(failure);
            let data =
              helpers.isRecord(failure) && helpers.isRecord(failure.data)
                ? failure.data
                : undefined;
            let baggage = helpers.isRecord(data?.baggage) ? data.baggage : undefined;
            let upstream = helpers.isRecord(data?.upstream) ? data.upstream : undefined;
            let status = response?.status ?? upstream?.status ?? data?.status;
            return {
              ...response,
              status:
                typeof status === 'number' || typeof status === 'string' ? status : undefined,
              data: response?.data ?? baggage?.response
            };
          }
        });
        if (
          isApiErrorRecord(error) &&
          isApiErrorRecord(error.data) &&
          typeof error.data.retryable === 'boolean'
        ) {
          adapted.data.retryable = error.data.retryable;
        }
        return adapted;
      }
    });
  }

  private params(extra: Record<string, any> = {}): Record<string, any> {
    return { key: this.token, ...extra };
  }

  // ── Scrape API ──────────────────────────────────────────────────────

  async scrape(options: ScrapeOptions): Promise<any> {
    let params: Record<string, any> = {
      ...this.params(),
      url: options.url
    };

    if (options.method) params.method = options.method;
    if (options.country) params.country = options.country;
    if (options.proxyPool) params.proxy_pool = options.proxyPool;
    if (options.asp !== undefined) params.asp = options.asp;
    if (options.renderJs !== undefined) params.render_js = options.renderJs;
    if (options.renderingWait !== undefined) params.rendering_wait = options.renderingWait;
    if (options.waitForSelector) params.wait_for_selector = options.waitForSelector;
    if (options.format) params.format = options.format;
    if (options.js) params.js = options.js;
    if (options.jsScenario) params.js_scenario = options.jsScenario;
    if (options.timeout !== undefined) params.timeout = options.timeout;
    if (options.retry !== undefined) params.retry = options.retry;
    if (options.cache !== undefined) params.cache = options.cache;
    if (options.cacheTtl !== undefined) params.cache_ttl = options.cacheTtl;
    if (options.cacheClear !== undefined) params.cache_clear = options.cacheClear;
    if (options.session) params.session = options.session;
    if (options.sessionStickyProxy !== undefined)
      params.session_sticky_proxy = options.sessionStickyProxy;
    if (options.correlationId) params.correlation_id = options.correlationId;
    if (options.tags && options.tags.length > 0) params.tags = options.tags.join(',');
    if (options.lang) params.lang = options.lang;
    if (options.os) params.os = options.os;
    if (options.debug !== undefined) params.debug = options.debug;
    if (options.dns !== undefined) params.dns = options.dns;
    if (options.ssl !== undefined) params.ssl = options.ssl;
    if (options.autoScroll !== undefined) params.auto_scroll = options.autoScroll;
    if (options.costBudget !== undefined) params.cost_budget = options.costBudget;
    if (options.geolocation) params.geolocation = options.geolocation;
    if (options.renderingStage) params.rendering_stage = options.renderingStage;
    if (options.webhookName) params.webhook_name = options.webhookName;
    if (options.proxifiedResponse !== undefined)
      params.proxified_response = options.proxifiedResponse;
    if (options.extractionTemplate) params.extraction_template = options.extractionTemplate;
    if (options.extractionPrompt) params.extraction_prompt = options.extractionPrompt;
    if (options.extractionModel) params.extraction_model = options.extractionModel;

    let headers: Record<string, string> = {};
    if (options.customHeaders) {
      for (let [headerKey, headerValue] of Object.entries(options.customHeaders)) {
        params[`headers[${headerKey}]`] = headerValue;
      }
    }

    let method = (options.method ?? 'GET').toLowerCase();
    let response = await this.http.request({
      method,
      url: '/scrape',
      params,
      headers,
      data: options.body
    });

    return response.data;
  }

  // ── Screenshot API ──────────────────────────────────────────────────

  async screenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    let params: Record<string, any> = {
      ...this.params(),
      url: options.url
    };

    if (options.format) params.format = options.format;
    if (options.capture) params.capture = options.capture;
    if (options.resolution) params.resolution = options.resolution;
    if (options.country) params.country = options.country;
    if (options.timeout !== undefined) params.timeout = options.timeout;
    if (options.renderingWait !== undefined) params.rendering_wait = options.renderingWait;
    if (options.waitForSelector) params.wait_for_selector = options.waitForSelector;
    if (options.options) params.options = options.options;
    if (options.autoScroll !== undefined) params.auto_scroll = options.autoScroll;
    if (options.js) params.js = options.js;
    if (options.cache !== undefined) params.cache = options.cache;
    if (options.cacheTtl !== undefined) params.cache_ttl = options.cacheTtl;
    if (options.cacheClear !== undefined) params.cache_clear = options.cacheClear;
    if (options.visionDeficiency) params.vision_deficiency = options.visionDeficiency;
    if (options.asp !== undefined) params.asp = options.asp;
    if (options.proxyPool) params.proxy_pool = options.proxyPool;
    if (options.webhookName) params.webhook_name = options.webhookName;

    let response = await this.http.get('/screenshot', {
      params,
      responseType: 'arraybuffer'
    });

    let screenshotUrl = response.headers['x-scrapfly-screenshot-url'] ?? '';
    let upstreamStatusCode = response.headers['x-scrapfly-upstream-http-code'] ?? '';
    let upstreamUrl = response.headers['x-scrapfly-upstream-url'] ?? '';
    let apiCost = response.headers['x-scrapfly-api-cost'] ?? '';

    return {
      screenshotUrl,
      upstreamStatusCode: upstreamStatusCode
        ? Number.parseInt(upstreamStatusCode, 10)
        : undefined,
      upstreamUrl: upstreamUrl || undefined,
      apiCost: apiCost ? Number.parseInt(apiCost, 10) : undefined,

      imageBase64: Buffer.from(response.data).toString('base64'),
      imageFormat: options.format ?? 'jpg'
    };
  }

  // ── Extraction API ──────────────────────────────────────────────────

  async extract(options: ExtractionOptions): Promise<any> {
    let params: Record<string, any> = {
      ...this.params()
    };

    if (options.extractionTemplate) params.extraction_template = options.extractionTemplate;
    if (options.extractionPrompt) params.extraction_prompt = options.extractionPrompt;
    if (options.extractionModel) params.extraction_model = options.extractionModel;
    if (options.contentType) params.content_type = options.contentType;
    if (options.charset) params.charset = options.charset;
    if (options.url) params.url = options.url;
    if (options.webhookName) params.webhook_name = options.webhookName;

    let response = await this.http.post('/extraction', options.body, {
      params,
      headers: {
        'Content-Type': options.contentType ?? 'text/html'
      }
    });

    return response.data;
  }

  // ── Crawler API ─────────────────────────────────────────────────────

  async createCrawl(options: CrawlOptions): Promise<any> {
    let body: Record<string, any> = {
      url: options.url
    };

    if (options.pageLimit !== undefined) body.page_limit = options.pageLimit;
    if (options.maxDepth !== undefined) body.max_depth = options.maxDepth;
    if (options.maxDuration !== undefined) body.max_duration = options.maxDuration;
    if (options.maxApiCredit !== undefined) body.max_api_credit = options.maxApiCredit;
    if (options.excludePaths) body.exclude_paths = options.excludePaths;
    if (options.includeOnlyPaths) body.include_only_paths = options.includeOnlyPaths;
    if (options.ignoreBasePathRestriction !== undefined)
      body.ignore_base_path_restriction = options.ignoreBasePathRestriction;
    if (options.followExternalLinks !== undefined)
      body.follow_external_links = options.followExternalLinks;
    if (options.allowedExternalDomains)
      body.allowed_external_domains = options.allowedExternalDomains;
    if (options.followInternalSubdomains !== undefined)
      body.follow_internal_subdomains = options.followInternalSubdomains;
    if (options.allowedInternalSubdomains)
      body.allowed_internal_subdomains = options.allowedInternalSubdomains;
    if (options.renderingDelay !== undefined) body.rendering_delay = options.renderingDelay;
    if (options.maxConcurrency !== undefined) body.max_concurrency = options.maxConcurrency;
    if (options.customHeaders) body.headers = options.customHeaders;
    if (options.delay) body.delay = options.delay;
    if (options.userAgent) body.user_agent = options.userAgent;
    if (options.useSitemaps !== undefined) body.use_sitemaps = options.useSitemaps;
    if (options.respectRobotsTxt !== undefined)
      body.respect_robots_txt = options.respectRobotsTxt;
    if (options.cache !== undefined) body.cache = options.cache;
    if (options.cacheTtl !== undefined) body.cache_ttl = options.cacheTtl;
    if (options.cacheClear !== undefined) body.cache_clear = options.cacheClear;
    if (options.contentFormats) body.content_formats = options.contentFormats;
    if (options.extractionRules) body.extraction_rules = options.extractionRules;
    if (options.webhookName) body.webhook_name = options.webhookName;
    if (options.webhookEvents) body.webhook_events = options.webhookEvents;
    if (options.proxyPool) body.proxy_pool = options.proxyPool;
    if (options.country) body.country = options.country;
    if (options.asp !== undefined) body.asp = options.asp;
    if (options.ignoreNoFollow !== undefined) body.ignore_no_follow = options.ignoreNoFollow;

    let response = await this.http.post('/crawl', body, {
      params: this.params(),
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  }

  async getCrawlStatus(crawlerUuid: string): Promise<any> {
    let response = await this.http.get(`/crawl/${encodeURIComponent(crawlerUuid)}/status`, {
      params: this.params()
    });
    return response.data;
  }

  async getCrawlUrls(crawlerUuid: string, status?: string): Promise<any> {
    let response = await this.http.get(`/crawl/${encodeURIComponent(crawlerUuid)}/urls`, {
      params: this.params(status ? { status } : {}),
      responseType: 'text'
    });
    return response.data;
  }

  async getCrawlContents(
    crawlerUuid: string,
    format?: string,
    options: { limit?: number; offset?: number; url?: string } = {}
  ): Promise<any> {
    let params: Record<string, any> = this.params();
    if (format) params.formats = format;
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.offset !== undefined) params.offset = options.offset;
    if (options.url !== undefined) params.url = options.url;
    let response = await this.http.get(`/crawl/${encodeURIComponent(crawlerUuid)}/contents`, {
      params,
      headers: { Accept: 'application/json' }
    });
    return response.data;
  }

  async cancelCrawl(crawlerUuid: string): Promise<void> {
    await this.http.post(`/crawl/${encodeURIComponent(crawlerUuid)}/cancel`, undefined, {
      params: this.params()
    });
  }

  // ── Account API ─────────────────────────────────────────────────────

  async getAccount(): Promise<any> {
    let response = await this.http.get('/account', {
      params: this.params()
    });
    return response.data;
  }
}

// ── Types ───────────────────────────────────────────────────────────────

export interface ScrapeOptions {
  url: string;
  method?: string;
  body?: string;
  country?: string;
  proxyPool?: string;
  asp?: boolean;
  renderJs?: boolean;
  renderingWait?: number;
  waitForSelector?: string;
  format?: string;
  js?: string;
  jsScenario?: string;
  timeout?: number;
  retry?: boolean;
  cache?: boolean;
  cacheTtl?: number;
  cacheClear?: boolean;
  session?: string;
  sessionStickyProxy?: boolean;
  correlationId?: string;
  tags?: string[];
  lang?: string;
  os?: string;
  debug?: boolean;
  dns?: boolean;
  ssl?: boolean;
  autoScroll?: boolean;
  costBudget?: number;
  geolocation?: string;
  renderingStage?: string;
  webhookName?: string;
  proxifiedResponse?: boolean;
  extractionTemplate?: string;
  extractionPrompt?: string;
  extractionModel?: string;
  customHeaders?: Record<string, string>;
}

export interface ScreenshotOptions {
  url: string;
  format?: string;
  capture?: string;
  resolution?: string;
  country?: string;
  timeout?: number;
  renderingWait?: number;
  waitForSelector?: string;
  options?: string;
  autoScroll?: boolean;
  js?: string;
  cache?: boolean;
  cacheTtl?: number;
  cacheClear?: boolean;
  visionDeficiency?: string;
  asp?: boolean;
  proxyPool?: string;
  webhookName?: string;
}

export interface ScreenshotResult {
  screenshotUrl: string;
  upstreamStatusCode?: number;
  upstreamUrl?: string;
  apiCost?: number;
  imageBase64: string;
  imageFormat: string;
}

export interface ExtractionOptions {
  body: string;
  contentType?: string;
  charset?: string;
  url?: string;
  extractionTemplate?: string;
  extractionPrompt?: string;
  extractionModel?: string;
  webhookName?: string;
}

export interface CrawlOptions {
  url: string;
  pageLimit?: number;
  maxDepth?: number;
  maxDuration?: number;
  maxApiCredit?: number;
  excludePaths?: string[];
  includeOnlyPaths?: string[];
  ignoreBasePathRestriction?: boolean;
  followExternalLinks?: boolean;
  allowedExternalDomains?: string[];
  followInternalSubdomains?: boolean;
  allowedInternalSubdomains?: string[];
  renderingDelay?: number;
  maxConcurrency?: number;
  customHeaders?: Record<string, string>;
  delay?: string;
  userAgent?: string;
  useSitemaps?: boolean;
  respectRobotsTxt?: boolean;
  cache?: boolean;
  cacheTtl?: number;
  cacheClear?: boolean;
  contentFormats?: string[];
  extractionRules?: any;
  webhookName?: string;
  webhookEvents?: string[];
  proxyPool?: string;
  country?: string;
  asp?: boolean;
  ignoreNoFollow?: boolean;
}
