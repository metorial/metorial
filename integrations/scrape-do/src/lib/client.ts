import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  requestAxios
} from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://api.scrape.do',
  timeout: 130000
});

let asyncAxios = createAxios({
  baseURL: 'https://q.scrape.do',
  timeout: 30000
});

export interface ScrapeOptions {
  url: string;
  render?: boolean;
  super?: boolean;
  geoCode?: string;
  regionalGeoCode?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  sessionId?: string;
  customHeaders?: boolean;
  extraHeaders?: boolean;
  forwardHeaders?: boolean;
  setCookies?: string;
  timeout?: number;
  retryTimeout?: number;
  disableRetry?: boolean;
  disableRedirection?: boolean;
  output?: 'raw' | 'markdown';
  transparentResponse?: boolean;
  callback?: string;
  pureCookies?: boolean;
  // Render-specific options
  waitUntil?: 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  customWait?: number;
  waitSelector?: string;
  width?: number;
  height?: number;
  blockResources?: boolean;
  playWithBrowser?: string;
  returnJSON?: boolean;
  showFrames?: boolean;
  showWebsocketRequests?: boolean;
  // Screenshot options
  screenShot?: boolean;
  fullScreenShot?: boolean;
  particularScreenShot?: string;
}

export interface GoogleSearchOptions {
  query: string;
  device?: 'desktop' | 'mobile';
  gl?: string;
  hl?: string;
  cr?: string;
  lr?: string;
  location?: string;
  uule?: string;
  start?: number;
  num?: number;
  safe?: string;
  tbs?: string;
  nfpr?: string;
  includeHtml?: boolean;
  googleDomain?: string;
}

export interface AmazonPdpOptions {
  asin: string;
  geocode: string;
  zipcode?: string;
  countryName?: string;
  currency?: string;
  language?: string;
  includeHtml?: boolean;
  super?: boolean;
}

export interface AmazonSearchOptions {
  keyword: string;
  geocode: string;
  zipcode?: string;
  countryName?: string;
  currency?: string;
  page?: number;
  language?: string;
  includeHtml?: boolean;
  super?: boolean;
}

export interface AmazonOfferListingOptions {
  asin: string;
  geocode: string;
  zipcode?: string;
  countryName?: string;
  currency?: string;
  language?: string;
  includeHtml?: boolean;
  super?: boolean;
}

export interface AmazonRawOptions {
  url: string;
  geocode?: string;
  super?: boolean;
}

export interface AsyncJobRenderOptions {
  BlockResources?: boolean;
  WaitUntil?: string;
  CustomWait?: number;
  WaitSelector?: string;
  PlayWithBrowser?: Record<string, unknown>[];
  ReturnJSON?: boolean;
  ShowWebsocketRequests?: boolean;
  ShowFrames?: boolean;
  Screenshot?: boolean;
  FullScreenshot?: boolean;
  ParticularScreenshot?: string;
}

export interface CreateAsyncJobOptions {
  targets: string[];
  method?: string;
  body?: string;
  geoCode?: string;
  regionalGeoCode?: string;
  super?: boolean;
  headers?: Record<string, string>;
  forwardHeaders?: boolean;
  sessionId?: string;
  device?: string;
  setCookies?: string;
  timeout?: number;
  retryTimeout?: number;
  disableRetry?: boolean;
  transparentResponse?: boolean;
  disableRedirection?: boolean;
  output?: string;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  render?: AsyncJobRenderOptions;
}

export interface AsyncJobStatus {
  JobID: string;
  TaskIDs: string[];
  Status: string;
  StartTime: string;
  EndTime: string;
  AcquiredConcurrency: number;
  LimitConcurrency: number;
  Canceled: boolean;
  Tasks: Array<{
    TaskID: string;
    URL: string;
    Status: string;
  }>;
}

export interface AsyncTaskResult {
  TaskID: string;
  JobID: string;
  URL: string;
  Status: string;
  StartTime: string;
  EndTime: string;
  ExpiresAt: string;
  UpdateTime: string;
  Base64EncodedContent: boolean;
  StatusCode: number;
  ResponseHeaders: Record<string, string>;
  Content: string;
  ErrorMessage: string;
}

export interface AccountStats {
  IsActive: boolean;
  ConcurrentRequest: number;
  MaxMonthlyRequest: number;
  RemainingConcurrentRequest: number;
  RemainingMonthlyRequest: number;
}

export let validateWholeNumber = (
  name: string,
  value: number | undefined,
  min: number,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${name} must be a whole number between ${min} and ${max}.`);
  }
};

let accountStatsSchema = z
  .object({
    IsActive: z.boolean(),
    ConcurrentRequest: z.number(),
    MaxMonthlyRequest: z.number(),
    RemainingConcurrentRequest: z.number(),
    RemainingMonthlyRequest: z.number()
  })
  .passthrough();

let asyncJobCreatedSchema = z
  .object({
    JobID: z.string(),
    Message: z.string(),
    TaskIDs: z.array(z.string())
  })
  .passthrough();

export interface AsyncJobListOptions {
  status?: 'queuing' | 'queued' | 'pending' | 'rotating' | 'success' | 'error' | 'canceled';
  startFrom?: string;
  startTo?: string;
  sort?: 'start_time_asc' | 'start_time_desc';
}

export class ScrapeDoClient {
  private token: string;

  constructor(token: string) {
    if (!token.trim())
      throw createApiServiceError(
        'A Scrape.do API token is required. Reconnect with a valid token.'
      );
    this.token = token;
  }

  private apiError(error: unknown, operation: string) {
    return buildApiServiceError(error, {
      providerLabel: 'Scrape.do',
      reason: 'scrape_do_api_error',
      operation,
      detailKeys: ['Error', 'Code', 'error', 'message', 'errorMessage'],
      formatMessage: ({ statusLabel, message }) =>
        `Scrape.do API ${operation} failed: ${statusLabel}${message}`.replaceAll(
          this.token,
          '[redacted]'
        )
    });
  }

  private async request<T>(
    client: typeof apiAxios,
    config: Parameters<typeof apiAxios.request>[0],
    operation: string,
    preserveTargetStatus:
      | boolean
      | ((response: { status: number; headers: unknown }) => boolean) = false
  ) {
    let response = await requestAxios<T>(
      operation,
      () =>
        client.request<T>({
          ...config,
          validateStatus: () => true
        }),
      (error, name) => this.apiError(error, name)
    );
    if (
      (response.status < 200 || response.status >= 300) &&
      !(typeof preserveTargetStatus === 'function'
        ? preserveTargetStatus(response)
        : preserveTargetStatus)
    ) {
      let data: unknown = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          /* Retain non-JSON upstream error text. */
        }
      }
      throw this.apiError(
        { response: { status: response.status, statusText: response.statusText, data } },
        operation
      );
    }
    return response;
  }

  private async requestJson<T = Record<string, unknown>>(
    client: typeof apiAxios,
    config: Parameters<typeof apiAxios.request>[0],
    operation: string
  ): Promise<T> {
    let response = await this.request<unknown>(client, config, operation);
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError(
        `Scrape.do returned an invalid JSON response for ${operation}.`
      );
    }
    if (response.data.status === 'error' || typeof response.data.Error === 'string') {
      throw this.apiError(
        { response: { status: response.status, data: response.data } },
        operation
      );
    }
    return response.data as T;
  }

  async scrapeUrl(
    options: ScrapeOptions,
    method: 'GET' | 'POST' = 'GET',
    postBody?: string,
    headers?: Record<string, string>
  ): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
    let params: Record<string, unknown> = {
      token: this.token,
      url: options.url
    };

    if (options.render !== undefined) params.render = options.render;
    if (options.super !== undefined) params.super = options.super;
    if (options.geoCode) params.geoCode = options.geoCode;
    if (options.regionalGeoCode) params.regionalGeoCode = options.regionalGeoCode;
    if (options.device) params.device = options.device;
    if (options.sessionId) params.sessionId = options.sessionId;
    if (options.customHeaders !== undefined) params.customHeaders = options.customHeaders;
    if (options.extraHeaders !== undefined) params.extraHeaders = options.extraHeaders;
    if (options.forwardHeaders !== undefined) params.forwardHeaders = options.forwardHeaders;
    if (options.setCookies) params.setCookies = options.setCookies;
    if (options.timeout !== undefined) params.timeout = options.timeout;
    if (options.retryTimeout !== undefined) params.retryTimeout = options.retryTimeout;
    if (options.disableRetry !== undefined) params.disableRetry = options.disableRetry;
    if (options.disableRedirection !== undefined)
      params.disableRedirection = options.disableRedirection;
    if (options.output) params.output = options.output;
    if (options.transparentResponse !== undefined)
      params.transparentResponse = options.transparentResponse;
    if (options.callback) params.callback = options.callback;
    if (options.pureCookies !== undefined) params.pureCookies = options.pureCookies;

    // Render-specific params
    if (options.waitUntil) params.waitUntil = options.waitUntil;
    if (options.customWait !== undefined) params.customWait = options.customWait;
    if (options.waitSelector) params.waitSelector = options.waitSelector;
    if (options.width !== undefined) params.width = options.width;
    if (options.height !== undefined) params.height = options.height;
    if (options.blockResources !== undefined) params.blockResources = options.blockResources;
    if (options.playWithBrowser) params.playWithBrowser = options.playWithBrowser;
    if (options.returnJSON !== undefined) params.returnJSON = options.returnJSON;
    if (options.showFrames !== undefined) params.showFrames = options.showFrames;
    if (options.showWebsocketRequests !== undefined)
      params.showWebsocketRequests = options.showWebsocketRequests;

    // Screenshot params
    if (options.screenShot !== undefined) params.screenShot = options.screenShot;
    if (options.fullScreenShot !== undefined) params.fullScreenShot = options.fullScreenShot;
    if (options.particularScreenShot)
      params.particularScreenShot = options.particularScreenShot;

    let response = await this.request<string>(
      apiAxios,
      {
        url: '/',
        method,
        params,
        responseType: 'text',
        data: method === 'POST' ? (postBody ?? '') : undefined,
        headers,
        timeout: (options.timeout ?? 120000) + 10000
      },
      'scrape webpage',
      response =>
        options.transparentResponse === true ||
        [404, 410].includes(response.status) ||
        (response.status === 400 &&
          Number(getResponseHeaderValue(response.headers, 'scrape.do-request-cost')) > 0)
    );

    let responseHeaders: Record<string, string> = {};
    if (response.headers) {
      for (let [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        }
      }
    }

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    };
  }

  async googleSearch(options: GoogleSearchOptions): Promise<Record<string, unknown>> {
    let params: Record<string, unknown> = {
      token: this.token,
      q: options.query
    };

    if (options.device) params.device = options.device;
    if (options.gl) params.gl = options.gl;
    if (options.hl) params.hl = options.hl;
    if (options.cr) params.cr = options.cr;
    if (options.lr) params.lr = options.lr;
    if (options.location) params.location = options.location;
    if (options.uule) params.uule = options.uule;
    if (options.start !== undefined) params.start = options.start;
    if (options.num !== undefined) params.num = options.num;
    if (options.safe) params.safe = options.safe;
    if (options.tbs) params.tbs = options.tbs;
    if (options.nfpr) params.nfpr = options.nfpr;
    if (options.includeHtml !== undefined) params.include_html = options.includeHtml;
    if (options.googleDomain) params.google_domain = options.googleDomain;

    return this.requestJson(
      apiAxios,
      { url: '/plugin/google/search', params },
      'Google search'
    );
  }

  async amazonProductDetail(options: AmazonPdpOptions): Promise<Record<string, unknown>> {
    let params: Record<string, unknown> = {
      token: this.token,
      asin: options.asin,
      geocode: options.geocode
    };

    if (options.zipcode) params.zipcode = options.zipcode;
    if (options.countryName) params.countryName = options.countryName;
    if (options.currency) params.currency = options.currency;
    if (options.language) params.language = options.language;
    if (options.includeHtml !== undefined) params.include_html = options.includeHtml;
    if (options.super !== undefined) params.super = options.super;

    return this.requestJson(apiAxios, { url: '/plugin/amazon/pdp', params }, 'Amazon product');
  }

  async amazonSearch(options: AmazonSearchOptions): Promise<Record<string, unknown>> {
    let params: Record<string, unknown> = {
      token: this.token,
      keyword: options.keyword,
      geocode: options.geocode
    };

    if (options.zipcode) params.zipcode = options.zipcode;
    if (options.countryName) params.countryName = options.countryName;
    if (options.currency) params.currency = options.currency;
    if (options.page !== undefined) params.page = options.page;
    if (options.language) params.language = options.language;
    if (options.includeHtml !== undefined) params.include_html = options.includeHtml;
    if (options.super !== undefined) params.super = options.super;

    return this.requestJson(
      apiAxios,
      { url: '/plugin/amazon/search', params },
      'Amazon search'
    );
  }

  async amazonOfferListing(
    options: AmazonOfferListingOptions
  ): Promise<Record<string, unknown>> {
    let params: Record<string, unknown> = {
      token: this.token,
      asin: options.asin,
      geocode: options.geocode
    };

    if (options.zipcode) params.zipcode = options.zipcode;
    if (options.countryName) params.countryName = options.countryName;
    if (options.currency) params.currency = options.currency;
    if (options.language) params.language = options.language;
    if (options.includeHtml !== undefined) params.include_html = options.includeHtml;
    if (options.super !== undefined) params.super = options.super;

    return this.requestJson(
      apiAxios,
      { url: '/plugin/amazon/offer-listing', params },
      'Amazon offers'
    );
  }

  async amazonRawHtml(options: AmazonRawOptions): Promise<string> {
    let params: Record<string, unknown> = {
      token: this.token,
      url: options.url
    };

    if (options.geocode) params.geocode = options.geocode;
    if (options.super !== undefined) params.super = options.super;

    let response = await this.request<string>(
      apiAxios,
      {
        url: '/plugin/amazon/',
        params,
        responseType: 'text'
      },
      'Amazon HTML'
    );
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  }

  async createAsyncJob(
    options: CreateAsyncJobOptions
  ): Promise<{ JobID: string; Message: string; TaskIDs: string[] }> {
    let body: Record<string, unknown> = {
      Targets: options.targets
    };

    if (options.method) body.Method = options.method;
    if (options.body !== undefined) body.Body = options.body;
    if (options.geoCode) body.GeoCode = options.geoCode;
    if (options.regionalGeoCode) body.RegionalGeoCode = options.regionalGeoCode;
    if (options.super !== undefined) body.Super = options.super;
    if (options.headers) body.Headers = options.headers;
    if (options.forwardHeaders !== undefined) body.ForwardHeaders = options.forwardHeaders;
    if (options.sessionId) body.SessionID = options.sessionId;
    if (options.device) body.Device = options.device;
    if (options.setCookies) body.SetCookies = options.setCookies;
    if (options.timeout !== undefined) body.Timeout = options.timeout;
    if (options.retryTimeout !== undefined) body.RetryTimeout = options.retryTimeout;
    if (options.disableRetry !== undefined) body.DisableRetry = options.disableRetry;
    if (options.transparentResponse !== undefined)
      body.TransparentResponse = options.transparentResponse;
    if (options.disableRedirection !== undefined)
      body.DisableRedirection = options.disableRedirection;
    if (options.output) body.Output = options.output;
    if (options.webhookUrl) body.WebhookURL = options.webhookUrl;
    if (options.webhookHeaders) body.WebhookHeaders = options.webhookHeaders;
    if (options.render) body.Render = options.render;

    let data = await this.requestJson(
      asyncAxios,
      {
        url: '/api/v1/jobs',
        method: 'POST',
        data: body,
        headers: { 'X-Token': this.token }
      },
      'create async job'
    );
    let result = asyncJobCreatedSchema.safeParse(data);
    if (!result.success)
      throw createApiServiceError('Scrape.do returned an invalid job creation response.');
    return result.data;
  }

  async getAsyncJobStatus(jobId: string): Promise<AsyncJobStatus> {
    return this.requestJson(
      asyncAxios,
      {
        url: `/api/v1/jobs/${encodeURIComponent(jobId)}`,
        headers: { 'X-Token': this.token }
      },
      'get async job'
    );
  }

  async getAsyncTaskResult(jobId: string, taskId: string): Promise<AsyncTaskResult> {
    return this.requestJson(
      asyncAxios,
      {
        url: `/api/v1/jobs/${encodeURIComponent(jobId)}/${encodeURIComponent(taskId)}`,
        headers: { 'X-Token': this.token }
      },
      'get async task'
    );
  }

  async listAsyncJobs(
    page = 1,
    pageSize = 10,
    filters: AsyncJobListOptions = {}
  ): Promise<Record<string, unknown>> {
    return this.requestJson(
      asyncAxios,
      {
        url: '/api/v1/jobs',
        headers: { 'X-Token': this.token },
        params: {
          page,
          page_size: pageSize,
          status: filters.status,
          start_from: filters.startFrom,
          start_to: filters.startTo,
          sort: filters.sort
        }
      },
      'list async jobs'
    );
  }

  async cancelAsyncJob(jobId: string): Promise<Record<string, unknown>> {
    return this.requestJson(
      asyncAxios,
      {
        url: `/api/v1/jobs/${encodeURIComponent(jobId)}`,
        method: 'DELETE',
        headers: { 'X-Token': this.token }
      },
      'cancel async job'
    );
  }

  async getAccountStats(): Promise<AccountStats> {
    let data = await this.requestJson(
      apiAxios,
      { url: '/info', params: { token: this.token } },
      'get account stats'
    );
    let result = accountStatsSchema.safeParse(data);
    if (!result.success)
      throw createApiServiceError('Scrape.do returned invalid account statistics.');
    return result.data;
  }

  async getCurrentUser(): Promise<Record<string, unknown>> {
    return this.requestJson(
      asyncAxios,
      { url: '/api/v1/me', headers: { 'X-Token': this.token } },
      'get current user'
    );
  }
}
