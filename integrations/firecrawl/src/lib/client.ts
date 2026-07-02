import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { firecrawlApiError } from './errors';

let BASE_URL = 'https://api.firecrawl.dev/v2';

export type FirecrawlRecord = Record<string, any>;

export interface ScrapeOptions {
  formats?: any[];
  onlyMainContent?: boolean;
  onlyCleanContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  maxAge?: number;
  minAge?: number;
  headers?: Record<string, string>;
  waitFor?: number;
  mobile?: boolean;
  skipTlsVerification?: boolean;
  timeout?: number;
  actions?: FirecrawlRecord[];
  location?: {
    country?: string;
    languages?: string[];
  };
  removeBase64Images?: boolean;
  blockAds?: boolean;
  proxy?: 'basic' | 'enhanced' | 'auto';
  storeInCache?: boolean;
  lockdown?: boolean;
  zeroDataRetention?: boolean;
  profile?: {
    name?: string;
    saveChanges?: boolean;
  };
  parsers?: FirecrawlRecord[];
}

export interface CrawlOptions {
  url: string;
  prompt?: string;
  limit?: number;
  maxDiscoveryDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
  allowExternalLinks?: boolean;
  allowSubdomains?: boolean;
  crawlEntireDomain?: boolean;
  ignoreQueryParameters?: boolean;
  ignoreRobotsTxt?: boolean;
  regexOnFullURL?: boolean;
  robotsUserAgent?: string;
  sitemap?: 'skip' | 'include' | 'only';
  delay?: number;
  maxConcurrency?: number;
  scrapeOptions?: ScrapeOptions;
  webhook?: WebhookConfig;
  zeroDataRetention?: boolean;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  events?: string[];
}

export interface SearchOptions {
  query: string;
  limit?: number;
  sources?: Array<{ type: 'web' | 'images' | 'news' }>;
  categories?: Array<{ type: 'github' | 'research' | 'pdf' }>;
  includeDomains?: string[];
  excludeDomains?: string[];
  location?: string;
  country?: string;
  tbs?: string;
  timeout?: number;
  ignoreInvalidURLs?: boolean;
  enterprise?: Array<'anon' | 'zdr'>;
  scrapeOptions?: ScrapeOptions;
}

export interface MapOptions {
  url: string;
  search?: string;
  sitemap?: 'skip' | 'include' | 'only';
  includeSubdomains?: boolean;
  ignoreQueryParameters?: boolean;
  ignoreCache?: boolean;
  limit?: number;
  timeout?: number;
  location?: {
    country?: string;
    languages?: string[];
  };
}

export interface ExtractOptions {
  urls: string[];
  prompt?: string;
  schema?: Record<string, any>;
  enableWebSearch?: boolean;
  ignoreSitemap?: boolean;
  includeSubdomains?: boolean;
  showSources?: boolean;
  scrapeOptions?: ScrapeOptions;
  ignoreInvalidURLs?: boolean;
}

export interface BatchScrapeOptions extends ScrapeOptions {
  urls: string[];
  webhook?: WebhookConfig;
  maxConcurrency?: number;
  ignoreInvalidURLs?: boolean;
}

export interface ParseFileOptions {
  fileName: string;
  fileBase64: string;
  mimeType?: string;
  options?: FirecrawlRecord;
}

let encodePath = (value: string) => encodeURIComponent(value);

let cleanUndefined = (value: FirecrawlRecord) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

let textBytes = (value: string) => new TextEncoder().encode(value);

let combineBytes = (parts: Uint8Array[]) => {
  let length = parts.reduce((total, part) => total + part.length, 0);
  let combined = new Uint8Array(length);
  let offset = 0;

  for (let part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
};

let escapeFormName = (value: string) => value.replace(/"/g, '\\"');

export class Client {
  private ax: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.ax = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw firecrawlApiError(error, operation);
    }
  }

  async scrape(options: { url: string } & ScrapeOptions) {
    return this.request<FirecrawlRecord>('scrape', () => this.ax.post('/scrape', options));
  }

  async getScrapeStatus(scrapeId: string) {
    return this.request<FirecrawlRecord>('get scrape status', () =>
      this.ax.get(`/scrape/${encodePath(scrapeId)}`)
    );
  }

  async interactWithScrape(
    scrapeId: string,
    options: {
      code?: string;
      prompt?: string;
      language?: 'python' | 'node' | 'bash';
      timeout?: number;
      origin?: string;
    }
  ) {
    return this.request<FirecrawlRecord>('interact with page', () =>
      this.ax.post(`/scrape/${encodePath(scrapeId)}/interact`, cleanUndefined(options))
    );
  }

  async stopScrapeInteraction(scrapeId: string) {
    return this.request<FirecrawlRecord>('stop page interaction', () =>
      this.ax.delete(`/scrape/${encodePath(scrapeId)}/interact`)
    );
  }

  async parseFile(params: ParseFileOptions) {
    let boundary = `----SlatesFirecrawlBoundary${Date.now().toString(36)}`;
    let fileBytes = Buffer.from(params.fileBase64, 'base64');
    let mimeType = params.mimeType ?? 'application/octet-stream';
    let escapedName = escapeFormName(params.fileName);
    let parts: Uint8Array[] = [];

    if (params.options && Object.keys(params.options).length > 0) {
      parts.push(
        textBytes(
          `--${boundary}\r\nContent-Disposition: form-data; name="options"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(
            params.options
          )}\r\n`
        )
      );
    }

    parts.push(
      textBytes(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${escapedName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      ),
      fileBytes,
      textBytes(`\r\n--${boundary}--\r\n`)
    );

    let body = combineBytes(parts);

    return this.request<FirecrawlRecord>('parse file', () =>
      this.ax.post('/parse', body, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        maxBodyLength: Number.POSITIVE_INFINITY,
        maxContentLength: Number.POSITIVE_INFINITY
      })
    );
  }

  async startCrawl(options: CrawlOptions) {
    return this.request<FirecrawlRecord>('start crawl', () => this.ax.post('/crawl', options));
  }

  async getCrawlStatus(crawlId: string) {
    return this.request<FirecrawlRecord>('get crawl status', () =>
      this.ax.get(`/crawl/${encodePath(crawlId)}`)
    );
  }

  async cancelCrawl(crawlId: string) {
    return this.request<FirecrawlRecord>('cancel crawl', () =>
      this.ax.delete(`/crawl/${encodePath(crawlId)}`)
    );
  }

  async getCrawlErrors(crawlId: string) {
    return this.request<FirecrawlRecord>('get crawl errors', () =>
      this.ax.get(`/crawl/${encodePath(crawlId)}/errors`)
    );
  }

  async previewCrawlParams(options: Partial<CrawlOptions>) {
    return this.request<FirecrawlRecord>('preview crawl params', () =>
      this.ax.post('/crawl/params-preview', options)
    );
  }

  async getActiveCrawls() {
    return this.request<FirecrawlRecord>('get active crawls', () =>
      this.ax.get('/crawl/active')
    );
  }

  async search(options: SearchOptions) {
    return this.request<FirecrawlRecord>('search', () => this.ax.post('/search', options));
  }

  async map(options: MapOptions) {
    return this.request<FirecrawlRecord>('map website', () => this.ax.post('/map', options));
  }

  async startExtract(options: ExtractOptions) {
    return this.request<FirecrawlRecord>('start extract', () =>
      this.ax.post('/extract', options)
    );
  }

  async getExtractStatus(extractId: string) {
    return this.request<FirecrawlRecord>('get extract status', () =>
      this.ax.get(`/extract/${encodePath(extractId)}`)
    );
  }

  async startBatchScrape(options: BatchScrapeOptions) {
    return this.request<FirecrawlRecord>('start batch scrape', () =>
      this.ax.post('/batch/scrape', options)
    );
  }

  async getBatchScrapeStatus(batchId: string) {
    return this.request<FirecrawlRecord>('get batch scrape status', () =>
      this.ax.get(`/batch/scrape/${encodePath(batchId)}`)
    );
  }

  async cancelBatchScrape(batchId: string) {
    return this.request<FirecrawlRecord>('cancel batch scrape', () =>
      this.ax.delete(`/batch/scrape/${encodePath(batchId)}`)
    );
  }

  async getBatchScrapeErrors(batchId: string) {
    return this.request<FirecrawlRecord>('get batch scrape errors', () =>
      this.ax.get(`/batch/scrape/${encodePath(batchId)}/errors`)
    );
  }

  async startAgent(options: {
    prompt: string;
    urls?: string[];
    schema?: Record<string, any>;
    maxCredits?: number;
    strictConstrainToURLs?: boolean;
    model?: 'spark-1-mini' | 'spark-1-pro';
  }) {
    return this.request<FirecrawlRecord>('start agent', () => this.ax.post('/agent', options));
  }

  async getAgentStatus(agentId: string) {
    return this.request<FirecrawlRecord>('get agent status', () =>
      this.ax.get(`/agent/${encodePath(agentId)}`)
    );
  }

  async cancelAgent(agentId: string) {
    return this.request<FirecrawlRecord>('cancel agent', () =>
      this.ax.delete(`/agent/${encodePath(agentId)}`)
    );
  }

  async createBrowserSession(options: {
    ttl?: number;
    activityTtl?: number;
    streamWebView?: boolean;
    profile?: {
      name: string;
      saveChanges?: boolean;
    };
  }) {
    return this.request<FirecrawlRecord>('create browser session', () =>
      this.ax.post('/browser', options)
    );
  }

  async listBrowserSessions(status?: 'active' | 'destroyed') {
    return this.request<FirecrawlRecord>('list browser sessions', () =>
      this.ax.get('/browser', {
        params: cleanUndefined({ status })
      })
    );
  }

  async executeBrowserCode(
    sessionId: string,
    options: {
      code: string;
      language?: 'python' | 'node' | 'bash';
      timeout?: number;
    }
  ) {
    return this.request<FirecrawlRecord>('execute browser code', () =>
      this.ax.post(`/browser/${encodePath(sessionId)}/execute`, options)
    );
  }

  async deleteBrowserSession(sessionId: string) {
    return this.request<FirecrawlRecord>('delete browser session', () =>
      this.ax.delete(`/browser/${encodePath(sessionId)}`)
    );
  }

  async createMonitor(options: FirecrawlRecord) {
    return this.request<FirecrawlRecord>('create monitor', () =>
      this.ax.post('/monitor', options)
    );
  }

  async listMonitors(options: { limit?: number; offset?: number }) {
    return this.request<FirecrawlRecord>('list monitors', () =>
      this.ax.get('/monitor', {
        params: cleanUndefined(options)
      })
    );
  }

  async getMonitor(monitorId: string) {
    return this.request<FirecrawlRecord>('get monitor', () =>
      this.ax.get(`/monitor/${encodePath(monitorId)}`)
    );
  }

  async updateMonitor(monitorId: string, options: FirecrawlRecord) {
    return this.request<FirecrawlRecord>('update monitor', () =>
      this.ax.patch(`/monitor/${encodePath(monitorId)}`, options)
    );
  }

  async deleteMonitor(monitorId: string) {
    return this.request<FirecrawlRecord>('delete monitor', () =>
      this.ax.delete(`/monitor/${encodePath(monitorId)}`)
    );
  }

  async runMonitor(monitorId: string) {
    return this.request<FirecrawlRecord>('run monitor', () =>
      this.ax.post(`/monitor/${encodePath(monitorId)}/run`)
    );
  }

  async listMonitorChecks(
    monitorId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'queued' | 'running' | 'completed' | 'failed' | 'partial' | 'skipped_overlap';
    }
  ) {
    return this.request<FirecrawlRecord>('list monitor checks', () =>
      this.ax.get(`/monitor/${encodePath(monitorId)}/checks`, {
        params: cleanUndefined(options)
      })
    );
  }

  async getMonitorCheck(
    monitorId: string,
    checkId: string,
    options: {
      limit?: number;
      skip?: number;
      status?: 'same' | 'new' | 'changed' | 'removed' | 'error';
    }
  ) {
    return this.request<FirecrawlRecord>('get monitor check', () =>
      this.ax.get(`/monitor/${encodePath(monitorId)}/checks/${encodePath(checkId)}`, {
        params: cleanUndefined(options)
      })
    );
  }

  async getCreditUsage() {
    return this.request<FirecrawlRecord>('get credit usage', () =>
      this.ax.get('/team/credit-usage')
    );
  }

  async getHistoricalCreditUsage(byApiKey?: boolean) {
    return this.request<FirecrawlRecord>('get historical credit usage', () =>
      this.ax.get('/team/credit-usage/historical', {
        params: cleanUndefined({ byApiKey })
      })
    );
  }

  async getTokenUsage() {
    return this.request<FirecrawlRecord>('get token usage', () =>
      this.ax.get('/team/token-usage')
    );
  }

  async getHistoricalTokenUsage(byApiKey?: boolean) {
    return this.request<FirecrawlRecord>('get historical token usage', () =>
      this.ax.get('/team/token-usage/historical', {
        params: cleanUndefined({ byApiKey })
      })
    );
  }

  async getQueueStatus() {
    return this.request<FirecrawlRecord>('get queue status', () =>
      this.ax.get('/team/queue-status')
    );
  }

  async listActivity(options: { endpoint?: string; limit?: number; cursor?: string }) {
    return this.request<FirecrawlRecord>('list activity', () =>
      this.ax.get('/team/activity', {
        params: cleanUndefined(options)
      })
    );
  }
}
