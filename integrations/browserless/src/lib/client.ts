import { createAxios } from 'slates';
import { browserlessApiError } from './errors';

type QueryValue = string | number | boolean | undefined;

let headerValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
};

let filenameFromContentDisposition = (contentDisposition?: string) => {
  if (!contentDisposition) {
    return undefined;
  }

  let utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/^"|"$/g, ''));
  }

  let match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1];
};

export interface GotoOptions {
  waitUntil?:
    | 'load'
    | 'domcontentloaded'
    | 'networkidle0'
    | 'networkidle2'
    | Array<'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'>;
  timeout?: number;
}

export interface WaitForSelector {
  selector: string;
  timeout?: number;
  visible?: boolean;
  hidden?: boolean;
}

export interface WaitForFunction {
  fn: string;
  timeout?: number;
}

export interface WaitForEvent {
  event: string;
  timeout?: number;
}

export interface SharedRequestOptions {
  gotoOptions?: GotoOptions;
  waitForSelector?: WaitForSelector;
  waitForFunction?: WaitForFunction;
  waitForEvent?: WaitForEvent;
  waitForTimeout?: number;
  bestAttempt?: boolean;
  rejectResourceTypes?: string[];
  rejectRequestPattern?: string[];
  userAgent?: string;
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
  }>;
  headers?: Record<string, string>;
}

export interface ScrapeElement {
  selector: string;
}

export interface ScrapeRequest extends SharedRequestOptions {
  url: string;
  elements: ScrapeElement[];
}

export interface ContentRequest extends SharedRequestOptions {
  url?: string;
  html?: string;
}

export interface PdfOptions {
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
  format?: string;
  landscape?: boolean;
  scale?: number;
  width?: string;
  height?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  pageRanges?: string;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface PdfRequest extends SharedRequestOptions {
  url?: string;
  html?: string;
  options?: PdfOptions;
  emulateMediaType?: string;
  addScriptTag?: Array<{ url?: string; content?: string }>;
  addStyleTag?: Array<{ url?: string; content?: string }>;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  type?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  clip?: { x: number; y: number; width: number; height: number };
  omitBackground?: boolean;
  encoding?: 'base64' | 'binary';
}

export interface ScreenshotRequest extends SharedRequestOptions {
  url?: string;
  html?: string;
  options?: ScreenshotOptions;
  addScriptTag?: Array<{ url?: string; content?: string }>;
  addStyleTag?: Array<{ url?: string; content?: string }>;
}

export interface UnblockRequest {
  url: string;
  content?: boolean;
  cookies?: boolean;
  screenshot?: boolean;
  browserWSEndpoint?: boolean;
  ttl?: number;
}

export interface UnblockResponse {
  content: string | null;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
  }>;
  screenshot: string | null;
  browserWSEndpoint: string | null;
}

export interface PerformanceRequest extends SharedRequestOptions {
  url: string;
  config?: {
    extends?: string;
    settings?: {
      onlyCategories?: string[];
      onlyAudits?: string[];
    };
  };
}

export interface SearchRequest {
  query: string;
  sources?: Array<'web' | 'news' | 'images'>;
  limit?: number;
  lang?: string;
  categories?: string[];
  tbs?: string;
  scrapeOptions?: {
    formats?: string[];
    onlyMainContent?: boolean;
  };
}

export interface FunctionRequest {
  code: string;
  context?: Record<string, unknown>;
}

export interface FileResponse {
  contentBase64: string;
  mimeType: string;
  byteLength: number;
  filename?: string;
}

export interface SmartScrapeRequest {
  url: string;
  formats?: Array<'html' | 'markdown' | 'screenshot' | 'pdf' | 'links'>;
  proxy?: 'residential' | 'datacenter';
}

export interface SmartScrapeResponse {
  ok?: boolean;
  statusCode?: number | null;
  content?: unknown;
  contentType?: string | null;
  headers?: Record<string, string>;
  strategy?: string;
  attempted?: string[];
  message?: string | null;
  screenshot?: string | null;
  pdf?: string | null;
  markdown?: string | null;
  links?: string[] | null;
}

export interface ExportRequest extends SharedRequestOptions {
  url: string;
  includeResources?: boolean;
}

export interface DownloadRequest {
  code: string;
  context?: Record<string, unknown>;
}

export interface MapRequest {
  url: string;
  search?: string;
  limit?: number;
  timeout?: number;
  sitemap?: 'include' | 'skip' | 'only';
  includeSubdomains?: boolean;
  ignoreQueryParameters?: boolean;
  location?: {
    country?: string;
    languages?: string[];
  };
  proxy?: 'residential' | 'datacenter';
}

export interface CrawlStartRequest {
  url: string;
  limit?: number;
  maxDepth?: number;
  maxRetries?: number;
  allowExternalLinks?: boolean;
  allowSubdomains?: boolean;
  sitemap?: 'auto' | 'force' | 'skip';
  includePaths?: string[];
  excludePaths?: string[];
  delay?: number;
  scrapeOptions?: {
    formats?: Array<'markdown' | 'html' | 'rawText'>;
    onlyMainContent?: boolean;
    includeTags?: string[];
    excludeTags?: string[];
    waitFor?: number;
    headers?: Record<string, string>;
    timeout?: number;
    proxy?: 'residential' | 'datacenter';
  };
  webhook?: {
    url: string;
    events?: Array<'page' | 'completed' | 'failed'>;
  };
}

export interface CrawlListQuery {
  limit?: number;
  cursor?: string;
  status?: 'in-progress' | 'completed' | 'failed' | 'cancelled';
}

export class BrowserlessClient {
  private baseUrl: string;
  private token: string;
  private http;

  constructor(config: { token: string; region: string }) {
    this.token = config.token;
    this.baseUrl = `https://production-${config.region}.browserless.io`;
    this.http = createAxios({
      baseURL: this.baseUrl
    });
  }

  private buildUrl(path: string, query: Record<string, QueryValue> = {}): string {
    let params = new URLSearchParams({ token: this.token });
    for (let [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }

    return `${path}?${params.toString()}`;
  }

  private async postJson<T>(
    operation: string,
    path: string,
    request: unknown,
    query?: Record<string, QueryValue>
  ): Promise<T> {
    try {
      let response = await this.http.post(this.buildUrl(path, query), request, {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw browserlessApiError(error, operation);
    }
  }

  private async getJson<T>(
    operation: string,
    path: string,
    query?: Record<string, QueryValue>
  ): Promise<T> {
    try {
      let response = await this.http.get(this.buildUrl(path, query));
      return response.data;
    } catch (error) {
      throw browserlessApiError(error, operation);
    }
  }

  private async deleteJson<T>(operation: string, path: string): Promise<T> {
    try {
      let response = await this.http.delete(this.buildUrl(path));
      return response.data;
    } catch (error) {
      throw browserlessApiError(error, operation);
    }
  }

  private async postBinary(
    operation: string,
    path: string,
    request: unknown,
    query?: Record<string, QueryValue>
  ): Promise<FileResponse> {
    try {
      let response = await this.http.post(this.buildUrl(path, query), request, {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
      let buffer = Buffer.from(response.data);
      let mimeType =
        headerValue(response.headers?.['content-type']) ?? 'application/octet-stream';
      let filename = filenameFromContentDisposition(
        headerValue(response.headers?.['content-disposition'])
      );

      return {
        contentBase64: buffer.toString('base64'),
        mimeType,
        byteLength: buffer.byteLength,
        filename
      };
    } catch (error) {
      throw browserlessApiError(error, operation);
    }
  }

  async scrape(request: ScrapeRequest): Promise<any> {
    return await this.postJson('scrape', '/scrape', request);
  }

  async getContent(request: ContentRequest): Promise<string> {
    return await this.postJson('content', '/content', request);
  }

  async generatePdf(request: PdfRequest): Promise<FileResponse> {
    return await this.postBinary('pdf', '/pdf', request);
  }

  async takeScreenshot(request: ScreenshotRequest): Promise<FileResponse> {
    return await this.postBinary('screenshot', '/screenshot', request);
  }

  async unblock(
    request: UnblockRequest,
    query?: { proxy?: 'residential' | 'datacenter' }
  ): Promise<UnblockResponse> {
    return await this.postJson('unblock', '/unblock', request, query);
  }

  async runPerformanceAudit(request: PerformanceRequest): Promise<any> {
    return await this.postJson('performance', '/performance', request);
  }

  async search(request: SearchRequest): Promise<any> {
    return await this.postJson('search', '/search', request);
  }

  async runFunction(request: FunctionRequest): Promise<any> {
    return await this.postJson('function', '/function', request);
  }

  async runFunctionFile(request: FunctionRequest): Promise<FileResponse> {
    return await this.postBinary('function', '/function', request);
  }

  async smartScrape(
    request: SmartScrapeRequest,
    query?: { timeout?: number; profile?: string }
  ) {
    return await this.postJson<SmartScrapeResponse>(
      'smart scrape',
      '/smart-scrape',
      request,
      query
    );
  }

  async exportUrl(request: ExportRequest): Promise<FileResponse> {
    return await this.postBinary('export', '/export', request);
  }

  async download(request: DownloadRequest): Promise<FileResponse> {
    return await this.postBinary('download', '/download', request);
  }

  async map(request: MapRequest) {
    return await this.postJson<any>('map', '/map', request, { timeout: request.timeout });
  }

  async startCrawl(request: CrawlStartRequest, query?: { profile?: string }) {
    return await this.postJson<any>('start crawl', '/crawl', request, query);
  }

  async getCrawl(crawlId: string, skip?: number) {
    return await this.getJson<any>('get crawl', `/crawl/${encodeURIComponent(crawlId)}`, {
      skip
    });
  }

  async listCrawls(query: CrawlListQuery) {
    return await this.getJson<any>('list crawls', '/crawl', {
      limit: query.limit,
      cursor: query.cursor,
      status: query.status
    });
  }

  async cancelCrawl(crawlId: string) {
    return await this.deleteJson<any>('cancel crawl', `/crawl/${encodeURIComponent(crawlId)}`);
  }
}
