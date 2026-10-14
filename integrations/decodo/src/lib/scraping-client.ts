import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

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
  url?: string;
  target?: string;
  createdAt: string;
  updatedAt: string;
}

let validateScrapeParams = (params: ScrapeParams) => {
  if (!params.url?.trim() && !params.query?.trim()) {
    throw createApiServiceError(
      'Provide a target URL or a query for a supported target template.'
    );
  }
  if ((params.target ?? 'universal') === 'universal' && !params.url?.trim()) {
    throw createApiServiceError('The universal target requires a URL.');
  }
  if (params.payload !== undefined && params.httpMethod !== 'POST') {
    throw createApiServiceError('Set httpMethod to POST when supplying a payload.');
  }
  for (let [index, action] of (params.browserActions ?? []).entries()) {
    if (
      ['click', 'input', 'wait_for_element'].includes(action.type) &&
      !action.selector?.value
    ) {
      throw createApiServiceError(`Browser action ${index + 1} requires an element selector.`);
    }
    if (action.type === 'input' && action.value === undefined) {
      throw createApiServiceError(`Browser action ${index + 1} requires an input value.`);
    }
    if (action.type === 'wait' && action.waitTimeS === undefined) {
      throw createApiServiceError(`Browser action ${index + 1} requires waitTimeS.`);
    }
    if (
      action.type === 'fetch_resource' &&
      index !== (params.browserActions?.length ?? 0) - 1
    ) {
      throw createApiServiceError(
        'The fetch_resource action must be the last browser action.'
      );
    }
    for (let value of [action.x, action.y, action.waitTimeS, action.timeoutS]) {
      if (value !== undefined && !Number.isSafeInteger(value)) {
        throw createApiServiceError(
          'Browser action pixel amounts and times must be whole numbers.'
        );
      }
    }
    if ([action.waitTimeS, action.timeoutS].some(value => value !== undefined && value < 0)) {
      throw createApiServiceError('Browser action times must not be negative.');
    }
  }
};

let toSnakeCase = (params: ScrapeParams): Record<string, unknown> => {
  validateScrapeParams(params);
  let body: Record<string, unknown> = {};
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
  if (params.headers !== undefined) {
    body.headers = params.headers;
    body.force_headers = params.forceHeaders ?? true;
  }
  if (params.forceHeaders !== undefined) body.force_headers = params.forceHeaders;
  if (params.cookies !== undefined) {
    body.cookies = params.cookies;
    body.force_cookies = params.forceCookies ?? true;
  }
  if (params.forceCookies !== undefined) body.force_cookies = params.forceCookies;
  if (params.sessionId !== undefined) body.session_id = params.sessionId;
  if (params.successfulStatusCodes !== undefined)
    body.successful_status_codes = params.successfulStatusCodes;
  if (params.browserActions !== undefined) {
    body.browser_actions = params.browserActions.map(action => {
      let mapped: Record<string, unknown> = { type: action.type };
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

let scrapeResponseSchema = z.object({
  results: z.array(
    z.object({
      content: z.unknown(),
      headers: z.record(z.string(), z.string()).nullish(),
      cookies: z.array(z.unknown()).nullish(),
      status_code: z.number(),
      task_id: z.string(),
      created_at: z.string(),
      updated_at: z.string()
    })
  )
});
let taskResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  url: z.string().nullish(),
  target: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string()
});
let mapTask = (data: unknown): AsyncTaskResult => {
  let parsed = taskResponseSchema.safeParse(data);
  if (!parsed.success)
    throw createApiServiceError('Decodo returned an invalid task response.');
  let task = parsed.data;
  return {
    taskId: task.id,
    status: task.status,
    url: task.url ?? undefined,
    target: task.target ?? undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at
  };
};
let mapResults = (data: unknown): { results: ScrapeResult[] } => {
  let parsed = scrapeResponseSchema.safeParse(data);
  if (!parsed.success)
    throw createApiServiceError('Decodo returned an invalid scraping response.');
  return {
    results: parsed.data.results.map(result => ({
      content: result.content,
      headers: result.headers ?? {},
      cookies: result.cookies ?? [],
      statusCode: result.status_code,
      taskId: result.task_id,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }))
  };
};

// PNG content is base64 in the JSON response; retain it in the legacy output too.
export let getScreenshotBytes = (content: unknown): Uint8Array | undefined => {
  if (typeof content !== 'string' || !content.startsWith('iVBORw0KGgo')) return undefined;
  let bytes = Buffer.from(content, 'base64');
  if (bytes.toString('base64') !== content) {
    throw createApiServiceError('Decodo returned an invalid base64 PNG screenshot.');
  }
  return new Uint8Array(bytes);
};

export class ScrapingClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(basicToken: string, authMethod?: string) {
    if (!basicToken.trim() || (authMethod !== undefined && authMethod !== 'basic')) {
      throw createApiServiceError(
        'Connect using Basic Auth (Web Scraping API) authentication.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://scraper-api.decodo.com',
      authHeader: { value: `Basic ${basicToken}` },
      headers: { Accept: 'application/json' },
      timeout: 150_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Decodo Scraping',
          reason: 'decodo_scraping_api_error'
        })
    });
  }

  async scrapeRealtime(params: ScrapeParams): Promise<{ results: ScrapeResult[] }> {
    let response = await this.axios.post('/v2/scrape', toSnakeCase(params));
    return mapResults(response.data);
  }

  async createAsyncTask(params: ScrapeParams): Promise<AsyncTaskResult> {
    let response = await this.axios.post('/v3/task', toSnakeCase(params));
    return mapTask(response.data);
  }

  async getAsyncTaskResults(taskId: string): Promise<{ results: ScrapeResult[] }> {
    if (!taskId.trim()) throw createApiServiceError('Provide a non-empty scrape task ID.');
    let response = await this.axios.get(`/v3/task/${encodeURIComponent(taskId)}/results`);
    return mapResults(response.data);
  }

  async getAsyncTaskStatus(taskId: string): Promise<AsyncTaskResult> {
    if (!taskId.trim()) throw createApiServiceError('Provide a non-empty scrape task ID.');
    let response = await this.axios.get(`/v3/task/${encodeURIComponent(taskId)}`);
    return mapTask(response.data);
  }
}
