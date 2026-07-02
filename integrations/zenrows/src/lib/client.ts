import { createAxios } from 'slates';

let universalAxios = createAxios({
  baseURL: 'https://api.zenrows.com/v1/'
});

let ecommerceAxios = createAxios({
  baseURL: 'https://ecommerce.api.zenrows.com/v1/'
});

let realestateAxios = createAxios({
  baseURL: 'https://realestate.api.zenrows.com/v1/'
});

let serpAxios = createAxios({
  baseURL: 'https://serp.api.zenrows.com/v1/'
});

export interface ScrapeUrlParams {
  url: string;
  jsRender?: boolean;
  jsInstructions?: string;
  premiumProxy?: boolean;
  proxyCountry?: string;
  sessionId?: number;
  device?: 'desktop' | 'mobile';
  customHeaders?: boolean;
  originalStatus?: boolean;
  allowedStatusCodes?: string;
  waitFor?: string;
  wait?: number;
  blockResources?: string;
  jsonResponse?: boolean;
  cssExtractor?: string;
  autoparse?: boolean;
  responseType?: 'markdown' | 'plaintext' | 'pdf';
  screenshot?: boolean;
  screenshotFullpage?: boolean;
  screenshotSelector?: string;
  screenshotFormat?: 'png' | 'jpeg';
  screenshotQuality?: number;
  outputs?: string;
  method?: 'GET' | 'POST' | 'PUT';
  postBody?: string;
  postContentType?: string;
  mode?: 'auto';
}

export interface ScrapeUrlResult {
  statusCode: number;
  content: string;
  headers: Record<string, string>;
}

export interface AmazonProductParams {
  asin: string;
  country?: string;
}

export interface AmazonSearchParams {
  query: string;
  country?: string;
}

export interface WalmartProductParams {
  sku: string;
  tld?: string;
}

export interface WalmartSearchParams {
  query: string;
  tld?: string;
}

export interface WalmartReviewsParams {
  sku: string;
  tld?: string;
}

export interface ZillowPropertyParams {
  zpid: string;
  country?: string;
}

export interface IdealistaPropertyParams {
  propertyId: string;
  tld?: string;
  lang?: string;
}

export interface GoogleSearchParams {
  query: string;
  tld?: string;
  country?: string;
}

export interface UsageDetails {
  [key: string]: unknown;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async scrapeUrl(params: ScrapeUrlParams): Promise<ScrapeUrlResult> {
    let queryParams: Record<string, string | number | boolean> = {
      apikey: this.token,
      url: params.url
    };

    if (params.mode) queryParams.mode = params.mode;
    if (params.jsRender) queryParams.js_render = true;
    if (params.jsInstructions) queryParams.js_instructions = params.jsInstructions;
    if (params.premiumProxy) queryParams.premium_proxy = true;
    if (params.proxyCountry) queryParams.proxy_country = params.proxyCountry;
    if (params.sessionId !== undefined) queryParams.session_id = params.sessionId;
    if (params.device) queryParams.device = params.device;
    if (params.customHeaders) queryParams.custom_headers = true;
    if (params.originalStatus) queryParams.original_status = true;
    if (params.allowedStatusCodes)
      queryParams.allowed_status_codes = params.allowedStatusCodes;
    if (params.waitFor) queryParams.wait_for = params.waitFor;
    if (params.wait) queryParams.wait = params.wait;
    if (params.blockResources) queryParams.block_resources = params.blockResources;
    if (params.jsonResponse) queryParams.json_response = true;
    if (params.cssExtractor) queryParams.css_extractor = params.cssExtractor;
    if (params.autoparse) queryParams.autoparse = true;
    if (params.responseType) queryParams.response_type = params.responseType;
    if (params.screenshot) queryParams.screenshot = true;
    if (params.screenshotFullpage) queryParams.screenshot_fullpage = true;
    if (params.screenshotSelector) queryParams.screenshot_selector = params.screenshotSelector;
    if (params.screenshotFormat) queryParams.screenshot_format = params.screenshotFormat;
    if (params.screenshotQuality !== undefined)
      queryParams.screenshot_quality = params.screenshotQuality;
    if (params.outputs) queryParams.outputs = params.outputs;

    let method = params.method || 'GET';
    let axiosConfig: Record<string, unknown> = {
      params: queryParams,
      transformResponse: [(data: unknown) => data]
    };

    let headers: Record<string, string> = {};
    if (params.postContentType) {
      headers['Content-Type'] = params.postContentType;
    }
    if (Object.keys(headers).length > 0) {
      axiosConfig.headers = headers;
    }

    let response: any;
    if (method === 'POST') {
      response = await universalAxios.post('', params.postBody || '', axiosConfig);
    } else if (method === 'PUT') {
      response = await universalAxios.put('', params.postBody || '', axiosConfig);
    } else {
      response = await universalAxios.get('', axiosConfig);
    }

    let responseHeaders: Record<string, string> = {};
    if (response.headers) {
      for (let [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        }
      }
    }

    return {
      statusCode: response.status,
      content:
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      headers: responseHeaders
    };
  }

  async getAmazonProduct(params: AmazonProductParams): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.country) queryParams.country = params.country;

    let response = await ecommerceAxios.get(
      `targets/amazon/products/${encodeURIComponent(params.asin)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async searchAmazon(params: AmazonSearchParams): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.country) queryParams.country = params.country;

    let response = await ecommerceAxios.get(
      `targets/amazon/discovery/${encodeURIComponent(params.query)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async getWalmartProduct(params: WalmartProductParams): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.tld) queryParams.tld = params.tld;

    let response = await ecommerceAxios.get(
      `targets/walmart/products/${encodeURIComponent(params.sku)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async searchWalmart(params: WalmartSearchParams): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.tld) queryParams.tld = params.tld;

    let response = await ecommerceAxios.get(
      `targets/walmart/discovery/${encodeURIComponent(params.query)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async getWalmartReviews(params: WalmartReviewsParams): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.tld) queryParams.tld = params.tld;

    let response = await ecommerceAxios.get(
      `targets/walmart/reviews/${encodeURIComponent(params.sku)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async getZillowProperty(params: ZillowPropertyParams): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.country) queryParams.country = params.country;

    let response = await realestateAxios.get(
      `targets/zillow/properties/${encodeURIComponent(params.zpid)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async getIdealistaProperty(
    params: IdealistaPropertyParams
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.tld) queryParams.tld = params.tld;
    if (params.lang) queryParams.lang = params.lang;

    let response = await realestateAxios.get(
      `targets/idealista/properties/${encodeURIComponent(params.propertyId)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async searchGoogle(params: GoogleSearchParams): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { apikey: this.token };
    if (params.tld) queryParams.tld = params.tld;
    if (params.country) queryParams.country = params.country;

    let response = await serpAxios.get(
      `targets/google/search/${encodeURIComponent(params.query)}`,
      { params: queryParams }
    );
    return response.data;
  }

  async getUsage(): Promise<UsageDetails> {
    let response = await universalAxios.get('subscriptions/self/details', {
      headers: {
        'X-API-Key': this.token
      }
    });
    return response.data;
  }
}
