import { createAxios } from 'slates';

let BASE_URL = 'https://api.screenshotone.com';

export interface TakeScreenshotParams {
  // Source (one required)
  url?: string;
  html?: string;
  markdown?: string;

  // Output format
  format?: string;
  responseType?: string;
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
  metadataHttpResponseStatusHeaders?: boolean;

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
    let snakeKey = camelToSnake(key);
    if (Array.isArray(value)) {
      result[snakeKey] = value;
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};

export class Client {
  private accessKey: string;

  constructor(config: { token: string }) {
    this.accessKey = config.token;
  }

  async takeScreenshot(params: TakeScreenshotParams): Promise<{
    screenshotUrl?: string;
    storeLocation?: string;
    metadata?: Record<string, unknown>;
    cacheUrl?: string;
    statusCode?: number;
  }> {
    let http = createAxios({ baseURL: BASE_URL });

    let apiParams = buildParams(params as Record<string, unknown>);
    apiParams.access_key = this.accessKey;
    apiParams.response_type = 'json';

    let response = await http.post('/take', apiParams, {
      headers: { 'Content-Type': 'application/json' }
    });

    let cacheUrl = response.headers?.['x-screenshotone-cache-url'] as string | undefined;

    let data = response.data as Record<string, unknown>;
    return {
      screenshotUrl: data.screenshot_url as string | undefined,
      storeLocation:
        ((data.store as Record<string, unknown> | undefined)?.location as
          | string
          | undefined) ?? (data.store_location as string | undefined),
      metadata: data.metadata as Record<string, unknown> | undefined,
      cacheUrl,
      statusCode: response.status
    };
  }

  async takeScreenshotRaw(params: TakeScreenshotParams): Promise<{
    imageBase64: string;
    contentType: string;
    cacheUrl?: string;
  }> {
    let http = createAxios({ baseURL: BASE_URL });

    let apiParams = buildParams(params as Record<string, unknown>);
    apiParams.access_key = this.accessKey;

    // Don't override response_type - let it default to by_format for binary
    if (!apiParams.response_type) {
      apiParams.response_type = undefined;
    }

    let response = await http.post('/take', apiParams, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    });

    let buffer = Buffer.from(response.data as ArrayBuffer);
    let base64 = buffer.toString('base64');
    let contentType = (response.headers?.['content-type'] as string) || 'image/png';
    let cacheUrl = response.headers?.['x-screenshotone-cache-url'] as string | undefined;

    return {
      imageBase64: base64,
      contentType,
      cacheUrl
    };
  }

  async getUsage(): Promise<UsageResponse> {
    let http = createAxios({ baseURL: BASE_URL });

    let response = await http.get('/usage', {
      params: { access_key: this.accessKey }
    });

    return response.data as UsageResponse;
  }
}
