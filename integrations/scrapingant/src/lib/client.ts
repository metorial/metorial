import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

let headerSchema = z.object({ name: z.string(), value: z.string() });
let markdownResponseSchema = z.object({ url: z.string(), markdown: z.string() });
let usageResponseSchema = z.object({
  plan_name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  plan_total_credits: z.number(),
  remained_credits: z.number()
});
let extendedResponseSchema = z.object({
  html: z.string(),
  text: z.string(),
  cookies: z.string(),
  status_code: z.number(),
  headers: z.array(headerSchema),
  xhrs: z
    .array(
      z.object({
        url: z.string(),
        status: z.number(),
        method: z.string(),
        headers: z.union([z.array(headerSchema), z.record(z.string(), z.string())]),
        request_body: z.string().nullish(),
        body: z.string().nullish()
      })
    )
    .nullish(),
  iframes: z.array(z.object({ src: z.string(), html: z.string() })).nullish()
});

export type ProxyType = 'datacenter' | 'residential';

export type BlockResourceType =
  | 'document'
  | 'stylesheet'
  | 'image'
  | 'media'
  | 'font'
  | 'script'
  | 'texttrack'
  | 'xhr'
  | 'fetch'
  | 'eventsource'
  | 'websocket'
  | 'manifest'
  | 'other';

export interface ScrapeOptions {
  url: string;
  browser?: boolean;
  timeout?: number;
  returnPageSource?: boolean;
  cookies?: string;
  jsSnippet?: string;
  proxyType?: ProxyType;
  proxyCountry?: string;
  waitForSelector?: string;
  blockResources?: BlockResourceType[];
  customHeaders?: Record<string, string>;
}

export interface ExtendedResponse {
  html: string;
  text: string;
  cookies: string;
  statusCode: number;
  headers: Array<{ name: string; value: string }>;
  xhrs: Array<{
    url: string;
    status: number;
    method: string;
    headers: Record<string, string>;
    requestBody: string;
    body: string;
  }>;
  iframes: Array<{ src: string; html: string }>;
}

export interface MarkdownResponse {
  url: string;
  markdown: string;
}

export interface UsageResponse {
  planName: string;
  startDate: string;
  endDate: string;
  planTotalCredits: number;
  remainedCredits: number;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A ScrapingAnt API key is required. Reconnect your account.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.scrapingant.com/v2',
      authHeader: { name: 'x-api-key', value: config.token },
      contentType: false,
      timeout: 120000,
      errorMapping: {
        mapAxiosError: error => {
          let data: unknown = error.response?.data;
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch {
              return undefined;
            }
          }
          if (data && typeof data === 'object' && 'detail' in data) {
            return typeof data.detail === 'string' ? { message: data.detail } : undefined;
          }
          return undefined;
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ScrapingAnt',
          reason: 'scrapingant_api_error'
        })
    });
  }

  private buildParams(options: ScrapeOptions): Record<string, string> {
    let url: URL;
    try {
      url = new URL(options.url);
    } catch {
      throw createApiServiceError('url must be a valid HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw createApiServiceError('url must use HTTP or HTTPS.');
    }
    if (
      options.timeout !== undefined &&
      (!Number.isFinite(options.timeout) || options.timeout < 5 || options.timeout > 60)
    ) {
      throw createApiServiceError('timeout must be between 5 and 60 seconds.');
    }
    if (
      options.browser === false &&
      (options.jsSnippet ||
        options.waitForSelector ||
        options.returnPageSource ||
        options.blockResources?.length)
    ) {
      throw createApiServiceError(
        'JavaScript execution, selector waits, resource blocking, and page-source mode require browser=true. Enable the browser or omit those options.'
      );
    }
    let params: Record<string, string> = {
      url: options.url
    };

    if (options.browser !== undefined) {
      params.browser = String(options.browser);
    }

    if (options.timeout !== undefined) {
      params.timeout = String(options.timeout);
    }

    if (options.returnPageSource !== undefined) {
      params.return_page_source = String(options.returnPageSource);
    }

    if (options.cookies) {
      params.cookies = options.cookies;
    }

    if (options.jsSnippet) {
      params.js_snippet = options.jsSnippet;
    }

    if (options.proxyType) {
      params.proxy_type = options.proxyType;
    }

    if (options.proxyCountry) {
      params.proxy_country = options.proxyCountry;
    }

    if (options.waitForSelector) {
      params.wait_for_selector = options.waitForSelector;
    }

    return params;
  }

  private buildBlockResourceParams(blockResources?: BlockResourceType[]): string {
    if (!blockResources || blockResources.length === 0) {
      return '';
    }
    return blockResources.map(r => `&block_resource=${encodeURIComponent(r)}`).join('');
  }

  private buildCustomHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    let headers: Record<string, string> = {};
    if (customHeaders) {
      for (let [key, value] of Object.entries(customHeaders)) {
        headers[`ant-${key}`] = value;
      }
    }
    return headers;
  }

  async scrapeGeneral(options: ScrapeOptions): Promise<string> {
    let params = this.buildParams(options);
    let blockResourceQuery = this.buildBlockResourceParams(options.blockResources);
    let headers = this.buildCustomHeaders(options.customHeaders);

    let queryString = new URLSearchParams(params).toString() + blockResourceQuery;

    let response = await this.axios.get(`/general?${queryString}`, {
      headers,
      responseType: 'text'
    });

    return response.data as string;
  }

  async scrapeMarkdown(options: ScrapeOptions): Promise<MarkdownResponse> {
    let params = this.buildParams(options);
    let blockResourceQuery = this.buildBlockResourceParams(options.blockResources);
    let headers = this.buildCustomHeaders(options.customHeaders);

    let queryString = new URLSearchParams(params).toString() + blockResourceQuery;

    let response = await this.axios.get(`/markdown?${queryString}`, {
      headers
    });

    let result = markdownResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError('ScrapingAnt returned an invalid Markdown response.', {
        reason: 'invalid_scrapingant_response'
      });
    }
    let data = result.data;

    return {
      url: data.url,
      markdown: data.markdown
    };
  }

  async scrapeExtended(options: ScrapeOptions): Promise<ExtendedResponse> {
    let params = this.buildParams(options);
    let blockResourceQuery = this.buildBlockResourceParams(options.blockResources);
    let headers = this.buildCustomHeaders(options.customHeaders);

    let queryString = new URLSearchParams(params).toString() + blockResourceQuery;

    let response = await this.axios.get(`/extended?${queryString}`, {
      headers
    });

    let result = extendedResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError('ScrapingAnt returned an invalid extended response.', {
        reason: 'invalid_scrapingant_response'
      });
    }
    let data = result.data;

    return {
      html: data.html,
      text: data.text,
      cookies: data.cookies,
      statusCode: data.status_code,
      headers: data.headers,
      xhrs: (data.xhrs || []).map(xhr => ({
        url: xhr.url,
        status: xhr.status,
        method: xhr.method,
        headers: Array.isArray(xhr.headers)
          ? Object.fromEntries(xhr.headers.map(header => [header.name, header.value]))
          : xhr.headers,
        requestBody: xhr.request_body ?? '',
        body: xhr.body ?? ''
      })),
      iframes: data.iframes || []
    };
  }

  async extractData(
    options: ScrapeOptions & { extractProperties: string }
  ): Promise<Record<string, unknown>> {
    if (!options.extractProperties.trim()) {
      throw createApiServiceError('extractProperties must describe at least one data field.');
    }
    let params = this.buildParams(options);
    params.extract_properties = options.extractProperties;
    let blockResourceQuery = this.buildBlockResourceParams(options.blockResources);
    let headers = this.buildCustomHeaders(options.customHeaders);

    let queryString = new URLSearchParams(params).toString() + blockResourceQuery;

    let response = await this.axios.get(`/extract?${queryString}`, {
      headers
    });

    let result = z.record(z.string(), z.unknown()).safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        'ScrapingAnt returned an invalid data extraction response.',
        {
          reason: 'invalid_scrapingant_response'
        }
      );
    }
    return result.data;
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await this.axios.get('/usage');

    let result = usageResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError('ScrapingAnt returned an invalid usage response.', {
        reason: 'invalid_scrapingant_response'
      });
    }
    let data = result.data;

    return {
      planName: data.plan_name,
      startDate: data.start_date,
      endDate: data.end_date,
      planTotalCredits: data.plan_total_credits,
      remainedCredits: data.remained_credits
    };
  }
}
