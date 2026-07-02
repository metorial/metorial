import { createAxios } from 'slates';

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
    httpResponseHeaders?: Array<{ name: string; value: string }>;
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
  responseCookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getAuthHeader(): string {
    let encoded = Buffer.from(`${this.token}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  private createClient() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    });
  }

  async extract(request: ExtractRequest): Promise<ExtractResponse> {
    let client = this.createClient();
    let response = await client.post('/extract', request);
    return response.data as ExtractResponse;
  }
}
