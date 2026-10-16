import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.screenshotone.com';

export interface TakeScreenshotParams {
  // Source (one required)
  url?: string;
  html?: string;
  markdown?: string;

  // Output format
  format?: string;
  responseType?: string;
  includeShadowDom?: boolean;
  imageQuality?: number;
  omitBackground?: boolean;

  // Viewport & device
  viewportWidth?: number;
  viewportHeight?: number;
  viewportDevice?: string;
  deviceScaleFactor?: number;
  viewportMobile?: boolean;
  viewportLandscape?: boolean;

  // Full page
  fullPage?: boolean;
  fullPageScroll?: boolean;
  fullPageScrollDelay?: number;
  fullPageScrollBy?: number;
  fullPageMaxHeight?: number;
  fullPageAlgorithm?: string;

  // Element selection
  selector?: string;
  selectorAlgorithm?: string;
  selectorScrollIntoView?: boolean;
  scrollIntoView?: string;
  scrollIntoViewAdjustTop?: number;
  captureBeyondViewport?: boolean;

  // Clipping
  clipX?: number;
  clipY?: number;
  clipWidth?: number;
  clipHeight?: number;

  // Blocking
  blockAds?: boolean;
  blockCookieBanners?: boolean;
  blockBannersByHeuristics?: boolean;
  blockChats?: boolean;
  blockTrackers?: boolean;
  blockRequests?: string[];
  blockResources?: string[];

  // Content customization
  hideSelectors?: string[];
  scripts?: string;
  scriptsWaitUntil?: string[];
  styles?: string;
  click?: string;
  hover?: string;

  // Visual emulation
  darkMode?: boolean;
  reducedMotion?: boolean;
  mediaType?: string;

  // Geolocation
  geolocationLatitude?: number;
  geolocationLongitude?: number;
  geolocationAccuracy?: number;

  // Request config
  ipCountryCode?: string;
  proxy?: string;
  userAgent?: string;
  authorization?: string;
  cookies?: string[];
  headers?: string[];
  timeZone?: string;
  bypassCsp?: boolean;

  // Timing
  waitUntil?: string;
  delay?: number;
  timeout?: number;
  navigationTimeout?: number;
  waitForSelector?: string;

  // Image processing
  imageWidth?: number;
  imageHeight?: number;

  // Caching
  cache?: boolean;
  cacheTtl?: number;
  cacheKey?: string;

  // S3 Storage
  store?: boolean;
  storagePath?: string;
  storageEndpoint?: string;
  storageAccessKeyId?: string;
  storageSecretAccessKey?: string;
  storageBucket?: string;
  storageClass?: string;
  storageAcl?: string;
  storageReturnLocation?: boolean;

  // Metadata
  metadataImageSize?: boolean;
  metadataFonts?: boolean;
  metadataIcon?: boolean;
  metadataOpenGraph?: boolean;
  metadataPageTitle?: boolean;
  metadataContent?: boolean;
  metadataContentFormat?: string;
  metadataHttpResponseStatusCode?: boolean;
  metadataHttpResponseHeaders?: boolean;

  // Async / Webhooks
  async?: boolean;
  webhookUrl?: string;
  webhookSign?: boolean;
  webhookErrors?: boolean;
  externalIdentifier?: string;

  // OpenAI Vision
  openaiApiKey?: string;
  visionPrompt?: string;
  visionMaxTokens?: number;

  // Error handling
  ignoreHostErrors?: boolean;
  errorOnSelectorNotFound?: boolean;

  // PDF options
  pdfPrintBackground?: boolean;
  pdfFitOnePage?: boolean;
  pdfLandscape?: boolean;
  pdfPaperFormat?: string;
  pdfMargin?: string;
  pdfMarginTop?: string;
  pdfMarginRight?: string;
  pdfMarginBottom?: string;
  pdfMarginLeft?: string;
}

export interface UsageResponse {
  total: number;
  available: number;
  used: number;
  concurrency: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

let camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let buildParams = (params: Record<string, unknown>): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    result[camelToSnake(key)] = value;
  }
  return result;
};

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'ScreenshotOne',
    reason: 'screenshotone_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    detailKeys: [
      'error_message',
      'message',
      'detail',
      'error',
      'error_description',
      'code',
      'error_code'
    ],
    nestedKeys: ['error', 'errors'],
    extractUpstreamCode: (_error, response) => {
      let body = response?.data;
      if (!isApiErrorRecord(body)) return undefined;
      if (typeof body.error_code === 'string') return body.error_code;
      return isApiErrorRecord(body.error) && typeof body.error.code === 'string'
        ? body.error.code
        : undefined;
    }
  });

let checkFailure = (data: unknown, status: number) => {
  if (
    isApiErrorRecord(data) &&
    (data.is_successful === false || data.error || typeof data.error_code === 'string')
  ) {
    throw apiError({ response: { status, data } });
  }
};

let validateSource = (params: TakeScreenshotParams) => {
  if (![params.url, params.html, params.markdown].some(value => value?.trim())) {
    throw createApiServiceError('Provide a URL, HTML, or Markdown content to render.');
  }
};

export interface ScreenshotResponse {
  screenshotUrl?: string;
  storeLocation?: string;
  metadata?: Record<string, unknown>;
  cacheUrl?: string;
  statusCode?: number;
  content?: Record<string, unknown>;
  httpResponse?: Record<string, unknown>;
  vision?: unknown;
}

export class Client {
  private accessKey: string;
  private http;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A ScreenshotOne access key is required.');
    }
    this.accessKey = config.token;
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      errorAdapter: apiError,
      errorMapping: {
        extractResponseData: response => {
          let data: unknown = response.data;
          if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            let bytes =
              data instanceof ArrayBuffer
                ? new Uint8Array(data)
                : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            let text = new TextDecoder().decode(bytes);
            try {
              return JSON.parse(text);
            } catch {
              return text;
            }
          }
          return data;
        }
      }
    });
  }

  async takeScreenshot(params: TakeScreenshotParams): Promise<ScreenshotResponse> {
    validateSource(params);
    let apiParams = buildParams(params as Record<string, unknown>);
    apiParams.access_key = this.accessKey;
    apiParams.response_type = 'json';

    let response = await this.http.post('/take', apiParams);
    checkFailure(response.data, response.status);
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('ScreenshotOne returned an invalid JSON response.');
    }

    let data = response.data;
    let store = isApiErrorRecord(data.store) ? data.store : undefined;
    return {
      screenshotUrl: typeof data.screenshot_url === 'string' ? data.screenshot_url : undefined,
      storeLocation:
        typeof store?.location === 'string'
          ? store.location
          : typeof data.store_location === 'string'
            ? data.store_location
            : undefined,
      metadata: isApiErrorRecord(data.metadata) ? data.metadata : undefined,
      cacheUrl:
        getResponseHeaderValue(response.headers, 'x-screenshotone-cache-url') ??
        (typeof data.cache_url === 'string' ? data.cache_url : undefined),
      statusCode: response.status,
      content: isApiErrorRecord(data.content) ? data.content : undefined,
      httpResponse: isApiErrorRecord(data.http_response) ? data.http_response : undefined,
      vision: data.vision
    };
  }

  async takeScreenshotRaw(params: TakeScreenshotParams): Promise<{
    imageBase64: string;
    contentType: string;
    cacheUrl?: string;
  }> {
    validateSource(params);
    let apiParams = buildParams(params as Record<string, unknown>);
    apiParams.access_key = this.accessKey;

    // Preserve the legacy binary default when no response type is supplied.
    if (!apiParams.response_type) apiParams.response_type = undefined;
    let response = await this.http.post('/take', apiParams, { responseType: 'arraybuffer' });
    let buffer = Buffer.from(response.data as ArrayBuffer);
    let contentType = getResponseHeaderValue(response.headers, 'content-type') || 'image/png';
    if (contentType.includes('json')) {
      let data: unknown;
      try {
        data = JSON.parse(buffer.toString('utf8'));
      } catch {
        throw createApiServiceError('ScreenshotOne returned invalid JSON instead of a file.');
      }
      checkFailure(data, response.status);
    }

    return {
      imageBase64: buffer.toString('base64'),
      contentType,
      cacheUrl: getResponseHeaderValue(response.headers, 'x-screenshotone-cache-url')
    };
  }

  async renderFile(params: TakeScreenshotParams): Promise<{
    file: Response;
    mimeType: string;
    size: number;
    cacheUrl?: string;
    storeLocation?: string;
  }> {
    validateSource(params);
    let apiParams = buildParams(params as Record<string, unknown>);
    apiParams.access_key = this.accessKey;
    apiParams.response_type = 'by_format';

    // This is the only capture: use its returned bytes, never a second render or URL fetch.
    let response = await this.http.post('/take', apiParams, { responseType: 'arraybuffer' });
    if (response.status < 200 || response.status >= 300) {
      throw apiError({ response: { status: response.status, data: response.data } });
    }
    let data: unknown = response.data;
    if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
      throw createApiServiceError('ScreenshotOne did not return the requested file bytes.');
    }
    let bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (bytes.byteLength === 0) {
      throw createApiServiceError('ScreenshotOne returned an empty file.');
    }
    let contentType = getResponseHeaderValue(response.headers, 'content-type');
    let mimeType = contentType?.split(';')[0]?.trim().toLowerCase();
    if (mimeType === 'application/json' || mimeType?.endsWith('+json')) {
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw createApiServiceError('ScreenshotOne returned invalid JSON instead of a file.');
      }
      checkFailure(errorBody, response.status);
      throw createApiServiceError(
        'ScreenshotOne returned JSON instead of the requested file.'
      );
    }
    let format = params.format ?? 'jpg';
    let expectedMimeTypes: Record<string, string[]> = {
      png: ['image/png'],
      jpeg: ['image/jpeg', 'image/jpg'],
      jpg: ['image/jpeg', 'image/jpg'],
      webp: ['image/webp'],
      gif: ['image/gif'],
      jp2: ['image/jp2', 'image/jpeg2000', 'image/jpx'],
      tiff: ['image/tiff'],
      avif: ['image/avif'],
      heif: ['image/heif', 'image/heic'],
      pdf: ['application/pdf'],
      html: ['text/html'],
      markdown: ['text/markdown', 'text/plain']
    };
    let expectedType = mimeType && expectedMimeTypes[format]?.includes(mimeType);
    if (!contentType || !mimeType || !expectedType) {
      throw createApiServiceError('ScreenshotOne returned an unexpected file content type.');
    }

    return {
      file: new Response(new Uint8Array(bytes), { headers: { 'Content-Type': contentType } }),
      mimeType,
      size: bytes.byteLength,
      cacheUrl: getResponseHeaderValue(response.headers, 'x-screenshotone-cache-url'),
      storeLocation: getResponseHeaderValue(response.headers, 'x-screenshotone-store-location')
    };
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await this.http.get('/usage', {
      params: { access_key: this.accessKey }
    });
    checkFailure(response.data, response.status);
    let data = response.data;
    if (
      !isApiErrorRecord(data) ||
      !isApiErrorRecord(data.concurrency) ||
      ![
        data.total,
        data.available,
        data.used,
        data.concurrency.limit,
        data.concurrency.remaining
      ].every(value => typeof value === 'number' && Number.isFinite(value))
    ) {
      throw createApiServiceError('ScreenshotOne returned invalid usage data.');
    }
    return data as unknown as UsageResponse;
  }
}
