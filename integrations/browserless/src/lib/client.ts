import { createAxios } from 'slates';

export interface GotoOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
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

  private buildUrl(path: string): string {
    return `${path}?token=${this.token}`;
  }

  async scrape(request: ScrapeRequest): Promise<any> {
    let response = await this.http.post(this.buildUrl('/scrape'), request, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getContent(request: ContentRequest): Promise<string> {
    let response = await this.http.post(this.buildUrl('/content'), request, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async generatePdf(request: PdfRequest): Promise<string> {
    let response = await this.http.post(this.buildUrl('/pdf'), request, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    });
    let buffer = Buffer.from(response.data);
    return buffer.toString('base64');
  }

  async takeScreenshot(request: ScreenshotRequest): Promise<string> {
    let response = await this.http.post(this.buildUrl('/screenshot'), request, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    });
    let buffer = Buffer.from(response.data);
    return buffer.toString('base64');
  }

  async unblock(request: UnblockRequest): Promise<UnblockResponse> {
    let response = await this.http.post(this.buildUrl('/unblock'), request, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async runPerformanceAudit(request: PerformanceRequest): Promise<any> {
    let response = await this.http.post(this.buildUrl('/performance'), request, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async search(request: SearchRequest): Promise<any> {
    let response = await this.http.post(this.buildUrl('/search'), request, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async runFunction(request: FunctionRequest): Promise<any> {
    let response = await this.http.post(this.buildUrl('/function'), request, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }
}
