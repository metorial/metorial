import { createAxios } from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://api.scrape.do'
});

let asyncAxios = createAxios({
  baseURL: 'https://q.scrape.do'
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
}

export interface AmazonPdpOptions {
  asin: string;
  geocode: string;
  zipcode?: string;
  language?: string;
  includeHtml?: boolean;
  super?: boolean;
}

export interface AmazonSearchOptions {
  keyword: string;
  geocode: string;
  zipcode?: string;
  page?: number;
  language?: string;
  includeHtml?: boolean;
  super?: boolean;
}

export interface AmazonOfferListingOptions {
  asin: string;
  geocode: string;
  zipcode?: string;
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

export class ScrapeDoClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
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

    let requestConfig: Record<string, unknown> = {
      params,
      responseType: 'text' as const,
      validateStatus: () => true
    };

    if (headers) {
      requestConfig.headers = headers;
    }

    let response: any;
    if (method === 'POST') {
      response = await apiAxios.post('/', postBody || '', requestConfig);
    } else {
      response = await apiAxios.get('/', requestConfig);
    }

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

    let response = await apiAxios.get('/plugin/google/search', {
      params,
      validateStatus: () => true
    });

    return response.data;
  }

  async amazonProductDetail(options: AmazonPdpOptions): Promise<Record<string, unknown>> {
    let params: Record<string, unknown> = {
      token: this.token,
      asin: options.asin,
      geocode: options.geocode
    };

    if (options.zipcode) params.zipcode = options.zipcode;
    if (options.language) params.language = options.language;
    if (options.includeHtml !== undefined) params.include_html = options.includeHtml;
    if (options.super !== undefined) params.super = options.super;

    let response = await apiAxios.get('/plugin/amazon/pdp', {
      params,
      validateStatus: () => true
    });

    return response.data;
  }

  async amazonSearch(options: AmazonSearchOptions): Promise<Record<string, unknown>> {
    let params: Record<string, unknown> = {
      token: this.token,
      keyword: options.keyword,
      geocode: options.geocode
    };

    if (options.zipcode) params.zipcode = options.zipcode;
    if (options.page !== undefined) params.page = options.page;
    if (options.language) params.language = options.language;
    if (options.includeHtml !== undefined) params.include_html = options.includeHtml;
    if (options.super !== undefined) params.super = options.super;

    let response = await apiAxios.get('/plugin/amazon/search', {
      params,
      validateStatus: () => true
    });

    return response.data;
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
    if (options.language) params.language = options.language;
    if (options.includeHtml !== undefined) params.include_html = options.includeHtml;
    if (options.super !== undefined) params.super = options.super;

    let response = await apiAxios.get('/plugin/amazon/offer-listing', {
      params,
      validateStatus: () => true
    });

    return response.data;
  }

  async amazonRawHtml(options: AmazonRawOptions): Promise<string> {
    let params: Record<string, unknown> = {
      token: this.token,
      url: options.url
    };

    if (options.geocode) params.geocode = options.geocode;
    if (options.super !== undefined) params.super = options.super;

    let response = await apiAxios.get('/plugin/amazon/', {
      params,
      responseType: 'text',
      validateStatus: () => true
    });

    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  }

  async createAsyncJob(
    options: CreateAsyncJobOptions
  ): Promise<{ JobID: string; Message: string; TaskIDs: string[] }> {
    let body: Record<string, unknown> = {
      Targets: options.targets
    };

    if (options.method) body.Method = options.method;
    if (options.body) body.Body = options.body;
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

    let response = await asyncAxios.post('/api/v1/jobs', body, {
      headers: { 'X-Token': this.token },
      validateStatus: () => true
    });

    return response.data;
  }

  async getAsyncJobStatus(jobId: string): Promise<AsyncJobStatus> {
    let response = await asyncAxios.get(`/api/v1/jobs/${jobId}`, {
      headers: { 'X-Token': this.token },
      validateStatus: () => true
    });

    return response.data;
  }

  async getAsyncTaskResult(jobId: string, taskId: string): Promise<AsyncTaskResult> {
    let response = await asyncAxios.get(`/api/v1/jobs/${jobId}/${taskId}`, {
      headers: { 'X-Token': this.token },
      validateStatus: () => true
    });

    return response.data;
  }

  async listAsyncJobs(
    page: number = 1,
    pageSize: number = 10
  ): Promise<Record<string, unknown>> {
    let response = await asyncAxios.get('/api/v1/jobs', {
      headers: { 'X-Token': this.token },
      params: { page, page_size: pageSize },
      validateStatus: () => true
    });

    return response.data;
  }

  async cancelAsyncJob(jobId: string): Promise<Record<string, unknown>> {
    let response = await asyncAxios.delete(`/api/v1/jobs/${jobId}`, {
      headers: { 'X-Token': this.token },
      validateStatus: () => true
    });

    return response.data;
  }

  async getAccountStats(): Promise<AccountStats> {
    let response = await apiAxios.get('/info', {
      params: { token: this.token },
      validateStatus: () => true
    });

    return response.data;
  }
}
