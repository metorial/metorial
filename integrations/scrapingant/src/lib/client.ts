import { createAxios } from 'slates';

let axiosInstance = createAxios({
  baseURL: 'https://api.scrapingant.com/v2'
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
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private buildParams(options: ScrapeOptions): Record<string, string> {
    let params: Record<string, string> = {
      'x-api-key': this.token,
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

    let response = await axiosInstance.get(`/general?${queryString}`, {
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

    let response = await axiosInstance.get(`/markdown?${queryString}`, {
      headers
    });

    let data = response.data as { url: string; markdown: string };

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

    let response = await axiosInstance.get(`/extended?${queryString}`, {
      headers
    });

    let data = response.data as {
      html: string;
      text: string;
      cookies: string;
      status_code: number;
      headers: Array<{ name: string; value: string }>;
      xhrs: Array<{
        url: string;
        status: number;
        method: string;
        headers: Record<string, string>;
        request_body: string;
        body: string;
      }>;
      iframes: Array<{ src: string; html: string }>;
    };

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
        headers: xhr.headers,
        requestBody: xhr.request_body,
        body: xhr.body
      })),
      iframes: data.iframes || []
    };
  }

  async extractData(
    options: ScrapeOptions & { extractProperties: string }
  ): Promise<Record<string, unknown>> {
    let params = this.buildParams(options);
    params.extract_properties = options.extractProperties;
    let blockResourceQuery = this.buildBlockResourceParams(options.blockResources);
    let headers = this.buildCustomHeaders(options.customHeaders);

    let queryString = new URLSearchParams(params).toString() + blockResourceQuery;

    let response = await axiosInstance.get(`/extract?${queryString}`, {
      headers
    });

    return response.data as Record<string, unknown>;
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await axiosInstance.get('/usage', {
      params: {
        'x-api-key': this.token
      }
    });

    let data = response.data as {
      plan_name: string;
      start_date: string;
      end_date: string;
      plan_total_credits: number;
      remained_credits: number;
    };

    return {
      planName: data.plan_name,
      startDate: data.start_date,
      endDate: data.end_date,
      planTotalCredits: data.plan_total_credits,
      remainedCredits: data.remained_credits
    };
  }
}
