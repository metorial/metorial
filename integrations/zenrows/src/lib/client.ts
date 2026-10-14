import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  type SlateAuthenticatedAxiosDefaults
} from 'slates';

let parseErrorResponse = (value: unknown): unknown => {
  let data = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

let httpOptions: SlateAuthenticatedAxiosDefaults = {
  timeout: 180000,
  contentType: false,
  errorMapping: {
    extractResponseData: response => parseErrorResponse(response.data),
    mapAxiosError: (error, inferred) => {
      let data = parseErrorResponse(error.response?.data);
      if (!isApiErrorRecord(data)) return undefined;

      let message =
        typeof data.detail === 'string' && data.detail.trim()
          ? data.detail
          : typeof data.title === 'string' && data.title.trim()
            ? data.title
            : inferred.message;
      let code =
        typeof data.code === 'string' && data.code.trim()
          ? data.code
          : inferred.upstream?.code;

      return { message, upstream: { ...inferred.upstream, code } };
    }
  },
  errorAdapter: (error: unknown) =>
    buildApiServiceError(error, {
      providerLabel: 'ZenRows',
      reason: 'zenrows_api_error',
      extractUpstreamCode: error => {
        let data =
          isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
        let upstream = isApiErrorRecord(data?.upstream) ? data.upstream : undefined;
        return typeof upstream?.code === 'string' ? upstream.code : undefined;
      }
    })
};

let universalAxios = createAuthenticatedAxios({
  ...httpOptions,
  baseURL: 'https://api.zenrows.com/v1/'
});

let ecommerceAxios = createAuthenticatedAxios({
  ...httpOptions,
  baseURL: 'https://ecommerce.api.zenrows.com/v1/'
});

let realestateAxios = createAuthenticatedAxios({
  ...httpOptions,
  baseURL: 'https://realestate.api.zenrows.com/v1/'
});

let serpAxios = createAuthenticatedAxios({
  ...httpOptions,
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
  headers?: Record<string, string>;
}

export interface ScrapeUrlResult {
  statusCode: number;
  content: string;
  headers: Record<string, string>;
  file?: { bytes: Uint8Array; mimeType: string; filename: string };
}

export interface ExtractUrlParams {
  url: string;
  extract?: 'auto' | 'native' | 'standard';
  fields?: string;
  jsRender?: boolean;
  premiumProxy?: boolean;
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
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A ZenRows API key is required. Reconnect with a valid key.'
      );
    }
    this.token = config.token;
  }

  async scrapeUrl(params: ScrapeUrlParams): Promise<ScrapeUrlResult> {
    if (!isHttpUrl(params.url)) {
      throw createApiServiceError('url must be an absolute HTTP or HTTPS URL.');
    }
    for (let [name, value, minimum, maximum] of [
      ['sessionId', params.sessionId, 1, 99999],
      ['wait', params.wait, 0, 30000],
      ['screenshotQuality', params.screenshotQuality, 1, 100]
    ] as const) {
      if (
        value !== undefined &&
        (!Number.isInteger(value) || value < minimum || value > maximum)
      ) {
        throw createApiServiceError(
          `${name} must be a whole number from ${minimum} to ${maximum}.`
        );
      }
    }
    let screenshot = Boolean(
      params.screenshot || params.screenshotFullpage || params.screenshotSelector
    );
    if ((screenshot || params.responseType === 'pdf') && params.jsRender !== true) {
      throw createApiServiceError('Set jsRender to true when requesting a screenshot or PDF.');
    }
    if (params.screenshotFullpage && params.screenshotSelector) {
      throw createApiServiceError(
        'Choose screenshotFullpage or screenshotSelector, not both.'
      );
    }
    if (screenshot && params.proxyCountry) {
      throw createApiServiceError(
        'Screenshot requests do not support proxyCountry. Omit proxyCountry.'
      );
    }
    if (params.proxyCountry && !params.premiumProxy && params.mode !== 'auto') {
      throw createApiServiceError(
        'Set premiumProxy to true or mode to auto when using proxyCountry.'
      );
    }
    if ((screenshot || params.responseType === 'pdf') && params.outputs) {
      throw createApiServiceError('Omit outputs when requesting a screenshot or PDF.');
    }
    if (params.screenshotQuality !== undefined && params.screenshotFormat !== 'jpeg') {
      throw createApiServiceError('screenshotQuality requires screenshotFormat to be jpeg.');
    }
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
    if (params.customHeaders || (params.headers && Object.keys(params.headers).length > 0))
      queryParams.custom_headers = true;
    if (params.originalStatus) queryParams.original_status = true;
    if (params.allowedStatusCodes)
      queryParams.allowed_status_codes = params.allowedStatusCodes;
    if (params.waitFor) queryParams.wait_for = params.waitFor;
    if (params.wait !== undefined) queryParams.wait = params.wait;
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
    let axiosConfig = {
      params: queryParams,
      responseType: 'arraybuffer' as const,
      headers: {
        ...params.headers,
        ...(params.postContentType ? { 'Content-Type': params.postContentType } : {})
      },
      transformResponse: [(data: unknown) => data]
    };
    let response = await universalAxios.request<ArrayBuffer>({
      ...axiosConfig,
      url: '',
      method,
      ...(method === 'GET' ? {} : { data: params.postBody ?? '' })
    });

    let responseHeaders: Record<string, string> = {};
    if (response.headers) {
      for (let [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        }
      }
    }

    let bytes = Buffer.from(response.data);
    let content = bytes.toString('utf8').replace(/^\uFEFF/, '');
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    let file: ScrapeUrlResult['file'];
    if (mimeType === 'application/pdf' || mimeType?.startsWith('image/')) {
      file = {
        bytes,
        mimeType,
        filename:
          {
            'application/pdf': 'page.pdf',
            'image/png': 'page.png',
            'image/jpeg': 'page.jpeg',
            'image/gif': 'page.gif',
            'image/webp': 'page.webp',
            'image/svg+xml': 'page.svg',
            'image/avif': 'page.avif'
          }[mimeType] ?? 'download'
      };
    } else if (screenshot && params.jsonResponse) {
      let envelope: unknown;
      try {
        envelope = JSON.parse(content);
      } catch {
        throw createApiServiceError('ZenRows returned an invalid JSON screenshot response.');
      }
      let image =
        isApiErrorRecord(envelope) && isApiErrorRecord(envelope.screenshot)
          ? envelope.screenshot
          : undefined;
      if (
        !image ||
        typeof image.data !== 'string' ||
        typeof image.type !== 'string' ||
        !['image/png', 'image/jpeg'].includes(image.type)
      ) {
        throw createApiServiceError('ZenRows did not return the requested screenshot image.');
      }
      file = {
        bytes: Buffer.from(image.data, 'base64'),
        mimeType: image.type,
        filename: image.type === 'image/jpeg' ? 'page.jpeg' : 'page.png'
      };
    }

    if ((screenshot || params.responseType === 'pdf') && !file) {
      throw createApiServiceError(
        'ZenRows did not return the requested screenshot or PDF file.'
      );
    }
    if (file && file.bytes.byteLength === 0) {
      throw createApiServiceError('ZenRows returned an empty file. Retry the request.');
    }

    return {
      statusCode: response.status,
      content,
      headers: responseHeaders,
      file
    };
  }

  async extractUrl(params: ExtractUrlParams): Promise<Record<string, unknown>> {
    if (!isHttpUrl(params.url)) {
      throw createApiServiceError('url must be an absolute HTTP or HTTPS URL.');
    }
    let response = await universalAxios.get<unknown>('', {
      params: {
        apikey: this.token,
        url: params.url,
        extract: params.extract ?? 'auto',
        extract_fields: params.fields,
        js_render: params.jsRender,
        premium_proxy: params.premiumProxy
      }
    });
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('ZenRows returned an invalid extraction response.');
    }
    return response.data;
  }

  async listExtractDomains(): Promise<Record<string, unknown>[]> {
    let response = await universalAxios.get<unknown>('extract/domains', {
      headers: { 'X-API-Key': this.token }
    });
    if (
      !isApiErrorRecord(response.data) ||
      !Array.isArray(response.data.domains) ||
      !response.data.domains.every(isApiErrorRecord)
    ) {
      throw createApiServiceError('ZenRows returned an invalid extract domain list.');
    }
    return response.data.domains;
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

let isHttpUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};
