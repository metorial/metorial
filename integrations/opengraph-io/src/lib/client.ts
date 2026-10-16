import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import {
  extractResponse,
  metadataResponse,
  parseResponse,
  queryResponse,
  scrapeResponse,
  screenshotResponse
} from './responses';

let axios = createAxios({
  baseURL: 'https://opengraph.io/api',
  timeout: 120_000
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
      params[key === 'navigationTimeout' ? key : toSnakeCase(key)] = value;
    }
  }
  return params;
};

export class Client {
  private appId: string;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('Reconnect OpenGraph.io with a valid App ID.');
    }
    this.appId = config.token;
  }

  private async get(path: string, params: Record<string, unknown>) {
    let data = await requestAxiosData(
      'request',
      () => axios.get(path, { params }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'OpenGraph.io',
          reason: 'opengraphio_api_error',
          operation,
          nestedKeys: ['error', 'errors'],
          extractUpstreamCode: (_error, response, helpers) => {
            let body = response?.data;
            if (!helpers.isRecord(body)) return undefined;
            let code = helpers.isRecord(body.error) ? body.error.code : body.code;
            return typeof code === 'string' || typeof code === 'number'
              ? String(code)
              : undefined;
          }
        })
    );
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError(
        'OpenGraph.io returned an invalid response. Try the request again.'
      );
    }
    if (data.error) {
      let error = isApiErrorRecord(data.error) ? data.error : data;
      throw createApiServiceError(
        `OpenGraph.io request failed: ${typeof error.message === 'string' ? error.message : 'the provider reported an error.'}`,
        {
          reason: 'opengraphio_api_error',
          upstreamCode:
            typeof error.code === 'string' || typeof error.code === 'number'
              ? String(error.code)
              : undefined
        }
      );
    }
    return data;
  }

  async getSiteMetadata(url: string, options: SiteOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, { ...options });

    return parseResponse(await this.get(`/1.1/site/${encodedUrl}`, params), metadataResponse);
  }

  async scrapeHtml(url: string, options: ScrapeOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, { ...options });

    return parseResponse(await this.get(`/1.1/scrape/${encodedUrl}`, params), scrapeResponse);
  }

  async captureScreenshot(url: string, options: ScreenshotOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, { ...options });

    return parseResponse(
      await this.get(`/1.1/screenshot/${encodedUrl}`, params),
      screenshotResponse
    );
  }

  async extractContent(url: string, options: ExtractOptions = {}) {
    let encodedUrl = encodeURIComponent(url);
    let params = buildParams(this.appId, { ...options });

    return parseResponse(
      await this.get(`/1.1/extract/${encodedUrl}`, params),
      extractResponse
    );
  }

  async queryPage(url: string, options: QueryOptions) {
    let encodedUrl = encodeURIComponent(url);
    let { query, responseStructure, modelSize, ...restOptions } = options;

    let params = buildParams(this.appId, { ...restOptions });
    params.query = query;
    if (modelSize !== undefined) params.modelSize = modelSize;
    if (responseStructure) {
      params.responseStructure = JSON.stringify(responseStructure);
    }

    let data = await this.get(`/1.1/query/${encodedUrl}`, params);
    if (!Object.hasOwn(data, 'answer')) {
      throw createApiServiceError(
        'OpenGraph.io did not return an answer. Try the query again.'
      );
    }
    return parseResponse(data, queryResponse);
  }

  async getMarkdown(url: string, options: Record<string, unknown> = {}) {
    return this.get(
      `/3.0/markdown/${encodeURIComponent(url)}`,
      buildParams(this.appId, { ...options, format: 'json' })
    );
  }

  async getOembed(url: string, options: Record<string, unknown> = {}) {
    let { maxWidth, maxHeight, ...rest } = options;
    let params = buildParams(this.appId, { ...rest, url });
    if (maxWidth !== undefined) params.maxwidth = maxWidth;
    if (maxHeight !== undefined) params.maxheight = maxHeight;
    return this.get('/3.0/oembed', params);
  }
}
