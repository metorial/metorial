import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.parsera.org/v1'
});

export interface Attribute {
  name: string;
  description: string;
  type?: 'string' | 'integer' | 'number' | 'bool' | 'list';
}

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

export interface ExtractParams {
  url: string;
  prompt?: string;
  attributes?: Attribute[];
  mode?: 'standard' | 'precision';
  proxyCountry?: string;
  cookies?: Cookie[];
}

export interface ParseParams {
  content: string;
  prompt?: string;
  attributes?: Attribute[];
  mode?: 'standard' | 'precision';
}

export interface ExtractMarkdownParams {
  url: string;
  proxyCountry?: string;
  cookies?: Cookie[];
}

export interface RunScraperParams {
  scraperId: string;
  urls: string[];
  proxyCountry?: string;
  cookies?: Cookie[];
}

export interface GenerateScraperParams {
  scraperId: string;
  url?: string;
  content?: string;
  prompt?: string;
  attributes: Attribute[];
  proxyCountry?: string;
  cookies?: Cookie[];
}

export interface ScraperSummary {
  id: string;
  name: string;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.token
    };
  }

  async extract(params: ExtractParams): Promise<Record<string, unknown>[]> {
    let body: Record<string, unknown> = {
      url: params.url
    };
    if (params.prompt) body.prompt = params.prompt;
    if (params.attributes && params.attributes.length > 0) body.attributes = params.attributes;
    if (params.mode) body.mode = params.mode;
    if (params.proxyCountry) body.proxy_country = params.proxyCountry;
    if (params.cookies && params.cookies.length > 0) body.cookies = params.cookies;

    let response = await http.post('/extract', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async parse(params: ParseParams): Promise<Record<string, unknown>[]> {
    let body: Record<string, unknown> = {
      content: params.content
    };
    if (params.prompt) body.prompt = params.prompt;
    if (params.attributes && params.attributes.length > 0) body.attributes = params.attributes;
    if (params.mode) body.mode = params.mode;

    let response = await http.post('/parse', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async extractMarkdown(params: ExtractMarkdownParams): Promise<string> {
    let body: Record<string, unknown> = {
      url: params.url
    };
    if (params.proxyCountry) body.proxy_country = params.proxyCountry;
    if (params.cookies && params.cookies.length > 0) body.cookies = params.cookies;

    let response = await http.post('/extract_markdown', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async listScrapers(): Promise<ScraperSummary[]> {
    let response = await http.get('/scrapers', {
      headers: this.headers()
    });
    return response.data;
  }

  async createScraper(): Promise<string> {
    let response = await http.post(
      '/scrapers/new',
      {},
      {
        headers: this.headers()
      }
    );
    return response.data.scraper_id;
  }

  async generateScraper(params: GenerateScraperParams): Promise<string> {
    let body: Record<string, unknown> = {
      scraper_id: params.scraperId,
      attributes: params.attributes
    };
    if (params.url) body.url = params.url;
    if (params.content) body.content = params.content;
    if (params.prompt) body.prompt = params.prompt;
    if (params.proxyCountry) body.proxy_country = params.proxyCountry;
    if (params.cookies && params.cookies.length > 0) body.cookies = params.cookies;

    let response = await http.post('/scrapers/generate', body, {
      headers: this.headers()
    });
    return response.data.message;
  }

  async runScraper(params: RunScraperParams): Promise<Record<string, unknown>[]> {
    let body: Record<string, unknown> = {
      scraper_id: params.scraperId,
      url: params.urls.length === 1 ? params.urls[0] : params.urls
    };
    if (params.proxyCountry) body.proxy_country = params.proxyCountry;
    if (params.cookies && params.cookies.length > 0) body.cookies = params.cookies;

    let response = await http.post('/scrapers/run', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteScraper(scraperId: string): Promise<string> {
    let response = await http.delete(`/scrapers/${encodeURIComponent(scraperId)}`, {
      headers: this.headers()
    });
    return response.data.message;
  }
}
