import { createAxios } from 'slates';

let BASE_URL = 'https://api.scrapegraphai.com/v1';

export interface SmartScraperParams {
  websiteUrl?: string;
  websiteHtml?: string;
  websiteMarkdown?: string;
  userPrompt: string;
  outputSchema?: Record<string, unknown>;
  plainText?: boolean;
  stealth?: boolean;
  waitMs?: number;
  countryCode?: string;
  numberOfScrolls?: number;
}

export interface SearchScraperParams {
  userPrompt: string;
  numResults?: number;
  extractionMode?: boolean;
  locationGeoCode?: string;
  timeRange?: string;
  outputSchema?: Record<string, unknown>;
}

export interface CrawlParams {
  url: string;
  prompt?: string;
  depth?: number;
  breadth?: number;
  maxPages?: number;
  extractionMode?: boolean;
  schema?: Record<string, unknown>;
  rules?: {
    includePaths?: string[];
    excludePaths?: string[];
    sameDomain?: boolean;
    exclude?: string[];
  };
  sitemap?: boolean;
  webhookUrl?: string;
  waitMs?: number;
}

export interface MarkdownifyParams {
  websiteUrl: string;
  stealth?: boolean;
  waitMs?: number;
  countryCode?: string;
}

export interface ScrapeParams {
  websiteUrl: string;
  branding?: boolean;
  stealth?: boolean;
  waitMs?: number;
  countryCode?: string;
}

export interface SitemapParams {
  websiteUrl: string;
  stealth?: boolean;
}

export interface AgenticScraperParams {
  url: string;
  steps: string[];
  useSession?: boolean;
  aiExtraction?: boolean;
  userPrompt?: string;
  outputSchema?: Record<string, unknown>;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'SGAI-APIKEY': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async smartScraper(params: SmartScraperParams) {
    let body: Record<string, unknown> = {
      user_prompt: params.userPrompt
    };

    if (params.websiteUrl) body.website_url = params.websiteUrl;
    if (params.websiteHtml) body.website_html = params.websiteHtml;
    if (params.websiteMarkdown) body.website_markdown = params.websiteMarkdown;
    if (params.outputSchema) body.output_schema = params.outputSchema;
    if (params.plainText !== undefined) body.plain_text = params.plainText;
    if (params.stealth !== undefined) body.stealth = params.stealth;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;
    if (params.countryCode) body.country_code = params.countryCode;
    if (params.numberOfScrolls !== undefined) body.number_of_scrolls = params.numberOfScrolls;

    let response = await this.axios.post('/smartscraper', body);
    return response.data;
  }

  async searchScraper(params: SearchScraperParams) {
    let body: Record<string, unknown> = {
      user_prompt: params.userPrompt
    };

    if (params.numResults !== undefined) body.num_results = params.numResults;
    if (params.extractionMode !== undefined) body.extraction_mode = params.extractionMode;
    if (params.locationGeoCode) body.location_geo_code = params.locationGeoCode;
    if (params.timeRange) body.time_range = params.timeRange;
    if (params.outputSchema) body.output_schema = params.outputSchema;

    let response = await this.axios.post('/searchscraper', body);
    return response.data;
  }

  async crawl(params: CrawlParams) {
    let body: Record<string, unknown> = {
      url: params.url
    };

    if (params.prompt) body.prompt = params.prompt;
    if (params.depth !== undefined) body.depth = params.depth;
    if (params.breadth !== undefined) body.breadth = params.breadth;
    if (params.maxPages !== undefined) body.max_pages = params.maxPages;
    if (params.extractionMode !== undefined) body.extraction_mode = params.extractionMode;
    if (params.schema) body.schema = params.schema;
    if (params.rules) {
      let rules: Record<string, unknown> = {};
      if (params.rules.includePaths) rules.include_paths = params.rules.includePaths;
      if (params.rules.excludePaths) rules.exclude_paths = params.rules.excludePaths;
      if (params.rules.sameDomain !== undefined) rules.same_domain = params.rules.sameDomain;
      if (params.rules.exclude) rules.exclude = params.rules.exclude;
      body.rules = rules;
    }
    if (params.sitemap !== undefined) body.sitemap = params.sitemap;
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;

    let response = await this.axios.post('/crawl', body);
    return response.data;
  }

  async markdownify(params: MarkdownifyParams) {
    let body: Record<string, unknown> = {
      website_url: params.websiteUrl
    };

    if (params.stealth !== undefined) body.stealth = params.stealth;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;
    if (params.countryCode) body.country_code = params.countryCode;

    let response = await this.axios.post('/markdownify', body);
    return response.data;
  }

  async scrape(params: ScrapeParams) {
    let body: Record<string, unknown> = {
      website_url: params.websiteUrl
    };

    if (params.branding !== undefined) body.branding = params.branding;
    if (params.stealth !== undefined) body.stealth = params.stealth;
    if (params.waitMs !== undefined) body.wait_ms = params.waitMs;
    if (params.countryCode) body.country_code = params.countryCode;

    let response = await this.axios.post('/scrape', body);
    return response.data;
  }

  async sitemap(params: SitemapParams) {
    let body: Record<string, unknown> = {
      website_url: params.websiteUrl
    };

    if (params.stealth !== undefined) body.stealth = params.stealth;

    let response = await this.axios.post('/sitemap', body);
    return response.data;
  }

  async agenticScraper(params: AgenticScraperParams) {
    let body: Record<string, unknown> = {
      url: params.url,
      steps: params.steps
    };

    if (params.useSession !== undefined) body.use_session = params.useSession;
    if (params.aiExtraction !== undefined) body.ai_extraction = params.aiExtraction;
    if (params.userPrompt) body.user_prompt = params.userPrompt;
    if (params.outputSchema) body.output_schema = params.outputSchema;

    let response = await this.axios.post('/agentic-scrapper', body);
    return response.data;
  }

  async getCredits() {
    let response = await this.axios.get('/credits');
    return response.data;
  }

  async getRequestStatus(service: string, requestId: string) {
    let response = await this.axios.get(`/${service}/${requestId}`);
    return response.data;
  }
}
