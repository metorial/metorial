import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.zyte.com/v1';

export interface ExtractRequest {
  url: string;
  httpResponseBody?: boolean;
  httpResponseHeaders?: boolean;
  httpRequestMethod?: string;
  httpRequestBody?: string;
  httpRequestText?: string;
  customHttpRequestHeaders?: Array<{ name: string; value: string }>;
  browserHtml?: boolean;
  screenshot?: boolean;
  screenshotOptions?: {
    fullPage?: boolean;
    format?: 'png' | 'jpeg';
  };
  actions?: BrowserAction[];
  networkCapture?: NetworkCaptureRule[];
  javascript?: boolean;
  includeIframes?: boolean;
  requestHeaders?: { referer?: string };
  product?: boolean;
  productOptions?: ExtractionOptions;
  productList?: boolean;
  productListOptions?: ExtractionOptions;
  productNavigation?: boolean;
  productNavigationOptions?: ExtractionOptions;
  article?: boolean;
  articleOptions?: ExtractionOptions;
  articleList?: boolean;
  articleListOptions?: ExtractionOptions;
  articleNavigation?: boolean;
  articleNavigationOptions?: ExtractionOptions;
  forumThread?: boolean;
  forumThreadOptions?: ExtractionOptions;
  jobPosting?: boolean;
  jobPostingOptions?: ExtractionOptions;
  jobPostingNavigation?: boolean;
  jobPostingNavigationOptions?: ExtractionOptions;
  pageContent?: boolean;
  pageContentOptions?: ExtractionOptions;
  customAttributes?: Record<string, unknown>;
  serp?: boolean;
  serpOptions?: { extractFrom?: 'httpResponseBody' | 'browserHtml'; keyword?: string };
  geolocation?: string;
  ipType?: 'datacenter' | 'residential';
  device?: 'desktop' | 'mobile';
  followRedirect?: boolean;
  requestCookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
  responseCookies?: boolean;
  session?: { id?: string };
  sessionContext?: Array<{ name: string; value: string }>;
  sessionContextParameters?: Record<string, unknown>;
}

export interface ExtractionOptions {
  extractFrom?: 'httpResponseBody' | 'browserHtml' | 'browserHtmlOnly';
  model?: string;
}

export interface BrowserAction {
  action:
    | 'click'
    | 'type'
    | 'scroll'
    | 'scrollBottom'
    | 'waitForSelector'
    | 'waitForTimeout'
    | 'waitForRequest'
    | 'waitForResponse'
    | 'evaluate'
    | 'select'
    | 'setInputFiles';
  selector?: ActionSelector;
  text?: string;
  values?: string[];
  timeout?: number;
  delay?: number;
  url?: string;
  source?: string;
  onError?: 'return' | 'ignore';
}

export interface ActionSelector {
  type: 'css' | 'xpath';
  value: string;
  state?: 'attached' | 'visible' | 'hidden';
}

export interface NetworkCaptureRule {
  filterType?: 'url';
  matchType?: 'contains' | 'startsWith' | 'endsWith' | 'exact' | 'regex';
  value?: string;
  httpResponseBody?: boolean;
  httpResponseHeaders?: boolean;
}

export interface ExtractResponse {
  url: string;
  statusCode?: number;
  httpResponseBody?: string;
  httpResponseHeaders?: Array<{ name: string; value: string }>;
  browserHtml?: string;
  screenshot?: string;
  actions?: Array<{
    action: string;
    elapsedTime?: number;
    error?: string;
    status?: string;
    result?: unknown;
  }>;
  networkCapture?: Array<{
    url: string;
    method?: string;
    statusCode?: number;
    httpResponseBody?: string;
    headers?: Record<string, string>;
    request?: { method?: string };
  }>;
  product?: Record<string, unknown>;
  productList?: Record<string, unknown>;
  productNavigation?: Record<string, unknown>;
  article?: Record<string, unknown>;
  articleList?: Record<string, unknown>;
  articleNavigation?: Record<string, unknown>;
  forumThread?: Record<string, unknown>;
  jobPosting?: Record<string, unknown>;
  jobPostingNavigation?: Record<string, unknown>;
  pageContent?: Record<string, unknown>;
  customAttributes?: Record<string, unknown>;
  serp?: Record<string, unknown>;
  responseCookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Zyte API key is required. Reconnect with a valid API key.'
      );
    }
    this.token = config.token;
  }

  private getAuthHeader(): string {
    let encoded = Buffer.from(`${this.token}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  private createClient() {
    return createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: this.getAuthHeader() },
      headers: {
        'Accept-Encoding': 'gzip'
      },
      timeout: 320_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Zyte',
          reason: 'zyte_api_error',
          operation: 'extract'
        })
    });
  }

  async extract(request: ExtractRequest): Promise<ExtractResponse> {
    if (request.httpRequestBody !== undefined && request.httpRequestText !== undefined) {
      throw createApiServiceError('Use either httpRequestBody or httpRequestText, not both.');
    }
    if (
      request.customHttpRequestHeaders?.some(header => header.name.toLowerCase() === 'cookie')
    ) {
      throw createApiServiceError(
        'Use requestCookies to send cookies instead of a Cookie header.'
      );
    }
    let extractionOptions = [
      request.productOptions,
      request.articleOptions,
      request.productListOptions,
      request.productNavigationOptions,
      request.articleListOptions,
      request.articleNavigationOptions,
      request.forumThreadOptions,
      request.jobPostingOptions,
      request.jobPostingNavigationOptions,
      request.pageContentOptions
    ];
    if (extractionOptions.some(options => options?.extractFrom === 'browserHtmlOnly')) {
      throw createApiServiceError(
        'Zyte currently supports browserHtml or httpResponseBody extraction. Use browserHtml instead of browserHtmlOnly.'
      );
    }
    if (
      extractionOptions.some(options => options?.extractFrom === 'httpResponseBody') &&
      (request.browserHtml || request.screenshot)
    ) {
      throw createApiServiceError(
        'HTTP extraction cannot include browser HTML or a screenshot. Disable those outputs or use browserHtml extraction.'
      );
    }
    if (
      extractionOptions.some(
        options => options !== request.productOptions && options?.model !== undefined
      )
    ) {
      throw createApiServiceError(
        'Model pinning is supported for product extraction only. Omit modelVersion for this data type.'
      );
    }
    let networkCapture = request.networkCapture?.map(rule => {
      if (!rule.value || rule.value.length < 3 || rule.matchType === 'regex') {
        throw createApiServiceError(
          'Network capture requires a URL value of at least 3 characters and contains, startsWith, endsWith, or exact matching. Regular expressions are unsupported.'
        );
      }
      return {
        filterType: rule.filterType ?? 'url',
        matchType: rule.matchType ?? 'contains',
        value: rule.value,
        httpResponseBody: rule.httpResponseBody
      };
    });
    if (networkCapture && networkCapture.length > 10) {
      throw createApiServiceError('Use no more than 10 network capture rules.');
    }
    let client = this.createClient();
    let response = await client.post('/extract', {
      ...request,
      actions: request.actions?.map(action => this.toProviderAction(action)),
      networkCapture
    });
    if (!isApiErrorRecord(response.data) || typeof response.data.url !== 'string') {
      throw createApiServiceError(
        'Zyte returned an invalid extraction response without a URL.'
      );
    }
    let result = response.data;
    if (request.screenshot && (typeof result.screenshot !== 'string' || !result.screenshot)) {
      throw createApiServiceError(
        'Zyte did not return the requested screenshot. Try the request again.'
      );
    }
    for (let key of Object.keys(result)) {
      if (result[key] === null) delete result[key];
    }
    return result as unknown as ExtractResponse;
  }

  private toProviderAction(action: BrowserAction): Record<string, unknown> {
    if (action.action === 'setInputFiles') {
      throw createApiServiceError(
        'Zyte does not support setInputFiles browser actions. Remove this action.'
      );
    }
    let name =
      action.action === 'scroll'
        ? action.selector
          ? 'scrollTo'
          : 'scrollBottom'
        : action.action;
    let result: Record<string, unknown> = {
      action: name,
      onError: action.onError === 'ignore' ? 'continue' : action.onError
    };
    if (['click', 'type', 'select', 'waitForSelector', 'scrollTo'].includes(name)) {
      if (!action.selector) {
        throw createApiServiceError(`The ${action.action} action requires a selector.`);
      }
      result.selector = action.selector;
    }
    if (name === 'type') {
      if (action.text === undefined)
        throw createApiServiceError('The type action requires text.');
      result.text = action.text;
      if (action.delay !== undefined) {
        if (action.delay < 0) throw createApiServiceError('Action delay must be nonnegative.');
        result.delay = action.delay / 1000;
      }
    }
    if (name === 'select') {
      if (!action.values?.length)
        throw createApiServiceError('The select action requires values.');
      result.values = action.values;
    }
    if (name === 'evaluate') {
      if (!action.source)
        throw createApiServiceError('The evaluate action requires source code.');
      result.source = action.source;
    }
    if (name === 'waitForRequest' || name === 'waitForResponse') {
      if (!action.url)
        throw createApiServiceError(`The ${name} action requires a URL pattern.`);
      result.urlPattern = action.url;
    }
    if (name.startsWith('waitFor') || name === 'scrollBottom') {
      if (action.timeout !== undefined) {
        let maxMilliseconds = name === 'scrollBottom' ? 30_000 : 15_000;
        if (action.timeout < 0 || action.timeout > maxMilliseconds) {
          throw createApiServiceError(
            `The ${name} timeout must be between 0 and ${maxMilliseconds} milliseconds.`
          );
        }
        result.timeout = action.timeout / 1000;
      }
    }
    return result;
  }
}
