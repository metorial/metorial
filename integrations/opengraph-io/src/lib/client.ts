import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://opengraph.io/api/1.1'
});

export interface SiteOptions {
  cacheOk?: boolean;
  fullRender?: boolean;
  useProxy?: boolean;
  usePremium?: boolean;
  useSuperior?: boolean;
  useAi?: boolean;
  maxCacheAge?: number;
  acceptLang?: string;
  autoProxy?: boolean;
  proxyCountry?: string;
  retry?: boolean;
  maxRetries?: number;
  retryEscalate?: boolean;
}

export interface ScrapeOptions {
  cacheOk?: boolean;
  fullRender?: boolean;
  useProxy?: boolean;
  usePremium?: boolean;
  useSuperior?: boolean;
  acceptLang?: string;
}

export interface ScreenshotOptions {
  format?: string;
  quality?: number;
  fullPage?: boolean;
  dimensions?: string;
  selector?: string;
  excludeSelectors?: string;
  blockCookieBanner?: boolean;
  darkMode?: boolean;
  cacheOk?: boolean;
  useProxy?: boolean;
  captureDelay?: number;
  navigationTimeout?: number;
}

export interface ExtractOptions {
  htmlElements?: string;
  fullRender?: boolean;
  cacheOk?: boolean;
  useProxy?: boolean;
  usePremium?: boolean;
  useSuperior?: boolean;
  acceptLang?: string;
}

export interface QueryOptions {
  query: string;
  responseStructure?: Record<string, unknown>;
  modelSize?: string;
  fullRender?: boolean;
  cacheOk?: boolean;
  useProxy?: boolean;
  usePremium?: boolean;
  useSuperior?: boolean;
}

let toSnakeCase = (str: string): string => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

let buildParams = (
  appId: string,
  options: Record<string, unknown>
): Record<string, unknown> => {
  let params: Record<string, unknown> = { app_id: appId };
  for (let [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) {
      params[toSnakeCase(key)] = value;
    }
  }
  return params;
};

export class Client {
  private appId: string;

  constructor(config: { token: string }) {
    this.appId = config.token;
  }

  async getSiteMetadata(url: string, options: SiteOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, options as Record<string, unknown>);

    let response = await axios.get(`/site/${encodedUrl}`, { params });
    return response.data;
  }

  async scrapeHtml(url: string, options: ScrapeOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, options as Record<string, unknown>);

    let response = await axios.get(`/scrape/${encodedUrl}`, { params });
    return response.data;
  }

  async captureScreenshot(url: string, options: ScreenshotOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, options as Record<string, unknown>);

    let response = await axios.get(`/screenshot/${encodedUrl}`, { params });
    return response.data;
  }

  async extractContent(url: string, options: ExtractOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, options as Record<string, unknown>);

    let response = await axios.get(`/extract/${encodedUrl}`, { params });
    return response.data;
  }

  async queryPage(url: string, options: QueryOptions) {
    let encodedUrl = encodeURIComponent(url);
    let { query, responseStructure, ...restOptions } = options;

    let params = buildParams(this.appId, restOptions as Record<string, unknown>);
    params.query = query;
    if (responseStructure) {
      params.response_structure = JSON.stringify(responseStructure);
    }

    let response = await axios.get(`/query/${encodedUrl}`, { params });
    return response.data;
  }
}
