import { createAxios } from 'slates';

export interface ScrapeParams {
  url?: string;
  query?: string;
  target?: string;
  proxyPool?: string;
  headless?: string;
  parse?: boolean;
  markdown?: boolean;
  xhr?: boolean;
  geo?: string;
  domain?: string;
  locale?: string;
  deviceType?: string;
  httpMethod?: string;
  payload?: string;
  headers?: Record<string, string>;
  forceHeaders?: boolean;
  cookies?: string;
  forceCookies?: boolean;
  sessionId?: string;
  successfulStatusCodes?: string;
  browserActions?: BrowserAction[];
  callbackUrl?: string;
  passthrough?: string;
}

export interface BrowserAction {
  type: string;
  selector?: { type: string; value: string };
  value?: string;
  x?: number;
  y?: number;
  waitTimeS?: number;
  timeoutS?: number;
  onError?: string;
  filter?: string;
}

export interface ScrapeResult {
  content: any;
  headers: Record<string, string>;
  cookies: any[];
  statusCode: number;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AsyncTaskResult {
  taskId: string;
  status: string;
  url: string;
  target: string;
  createdAt: string;
  updatedAt: string;
}

let toSnakeCase = (params: ScrapeParams): Record<string, any> => {
  let body: Record<string, any> = {};
  if (params.url !== undefined) body.url = params.url;
  if (params.query !== undefined) body.query = params.query;
  if (params.target !== undefined) body.target = params.target;
  if (params.proxyPool !== undefined) body.proxy_pool = params.proxyPool;
  if (params.headless !== undefined) body.headless = params.headless;
  if (params.parse !== undefined) body.parse = params.parse;
  if (params.markdown !== undefined) body.markdown = params.markdown;
  if (params.xhr !== undefined) body.xhr = params.xhr;
  if (params.geo !== undefined) body.geo = params.geo;
  if (params.domain !== undefined) body.domain = params.domain;
  if (params.locale !== undefined) body.locale = params.locale;
  if (params.deviceType !== undefined) body.device_type = params.deviceType;
  if (params.httpMethod !== undefined) body.http_method = params.httpMethod;
  if (params.payload !== undefined) body.payload = params.payload;
  if (params.headers !== undefined) body.headers = params.headers;
  if (params.forceHeaders !== undefined) body.force_headers = params.forceHeaders;
  if (params.cookies !== undefined) body.cookies = params.cookies;
  if (params.forceCookies !== undefined) body.force_cookies = params.forceCookies;
  if (params.sessionId !== undefined) body.session_id = params.sessionId;
  if (params.successfulStatusCodes !== undefined)
    body.successful_status_codes = params.successfulStatusCodes;
  if (params.browserActions !== undefined) {
    body.browser_actions = params.browserActions.map(action => {
      let mapped: Record<string, any> = { type: action.type };
      if (action.selector) mapped.selector = action.selector;
      if (action.value !== undefined) mapped.value = action.value;
      if (action.x !== undefined) mapped.x = action.x;
      if (action.y !== undefined) mapped.y = action.y;
      if (action.waitTimeS !== undefined) mapped.wait_time_s = action.waitTimeS;
      if (action.timeoutS !== undefined) mapped.timeout_s = action.timeoutS;
      if (action.onError !== undefined) mapped.on_error = action.onError;
      if (action.filter !== undefined) mapped.filter = action.filter;
      return mapped;
    });
  }
  if (params.callbackUrl !== undefined) body.callback_url = params.callbackUrl;
  if (params.passthrough !== undefined) body.passthrough = params.passthrough;
  return body;
};

export class ScrapingClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(basicToken: string) {
    this.axios = createAxios({
      baseURL: 'https://scraper-api.decodo.com',
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async scrapeRealtime(params: ScrapeParams): Promise<{ results: ScrapeResult[] }> {
    let body = toSnakeCase(params);
    let response = await this.axios.post('/v2/scrape', body);
    let results = (response.data.results || []).map((r: any) => ({
      content: r.content,
      headers: r.headers || {},
      cookies: r.cookies || [],
      statusCode: r.status_code,
      taskId: r.task_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    return { results };
  }

  async createAsyncTask(params: ScrapeParams): Promise<AsyncTaskResult> {
    let body = toSnakeCase(params);
    let response = await this.axios.post('/v2/task', body);
    let data = response.data;
    return {
      taskId: data.id,
      status: data.status,
      url: data.url,
      target: data.target,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async getAsyncTaskResults(taskId: string): Promise<{ results: ScrapeResult[] }> {
    let response = await this.axios.get(`/v2/task/${taskId}/results`);
    let results = (response.data.results || []).map((r: any) => ({
      content: r.content,
      headers: r.headers || {},
      cookies: r.cookies || [],
      statusCode: r.status_code,
      taskId: r.task_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    return { results };
  }

  async getAsyncTaskStatus(taskId: string): Promise<AsyncTaskResult> {
    let response = await this.axios.get(`/v2/task/${taskId}`);
    let data = response.data;
    return {
      taskId: data.id,
      status: data.status,
      url: data.url,
      target: data.target,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
