import { createAxios } from 'slates';

export interface ScreenshotParams {
  url: string;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  width?: number;
  height?: number;
  fullPage?: boolean;
  scrollPage?: boolean;
  delay?: number;
  waitFor?: string;
  waitUntil?: 'dom_loaded' | 'page_loaded' | 'network_idle';
  element?: string;
  elementOverlap?: boolean;
  crop?: string;
  thumbnailWidth?: number;
  scaleFactor?: number;
  transparent?: boolean;
  css?: string;
  js?: string;
  headers?: string;
  cookies?: string;
  acceptLanguage?: string;
  userAgent?: string;
  proxy?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timeZone?: string;
  ipLocation?: string;
  failOnStatus?: string;
  noAds?: boolean;
  noTracking?: boolean;
  noCookieBanners?: boolean;
  ttl?: number;
  fresh?: boolean;
  responseType?: 'image' | 'json';
  extractHtml?: boolean;
  extractText?: boolean;
  s3Endpoint?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretKey?: string;
  s3Bucket?: string;
  s3Key?: string;
}

export interface ScreenshotJsonResponse {
  url: string;
  extractedHtml?: string;
  extractedText?: string;
}

export interface QuotaResponse {
  limit: number;
  remaining: number;
  reset: number;
}

export class Client {
  private accessKey: string;
  private axios;

  constructor(config: { token: string }) {
    this.accessKey = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.apiflash.com/v1/urltoimage'
    });
  }

  private buildQueryParams(params: ScreenshotParams): Record<string, string> {
    let query: Record<string, string> = {
      access_key: this.accessKey,
      url: params.url
    };

    if (params.format !== undefined) query.format = params.format;
    if (params.quality !== undefined) query.quality = String(params.quality);
    if (params.width !== undefined) query.width = String(params.width);
    if (params.height !== undefined) query.height = String(params.height);
    if (params.fullPage !== undefined) query.full_page = String(params.fullPage);
    if (params.scrollPage !== undefined) query.scroll_page = String(params.scrollPage);
    if (params.delay !== undefined) query.delay = String(params.delay);
    if (params.waitFor !== undefined) query.wait_for = params.waitFor;
    if (params.waitUntil !== undefined) query.wait_until = params.waitUntil;
    if (params.element !== undefined) query.element = params.element;
    if (params.elementOverlap !== undefined)
      query.element_overlap = String(params.elementOverlap);
    if (params.crop !== undefined) query.crop = params.crop;
    if (params.thumbnailWidth !== undefined)
      query.thumbnail_width = String(params.thumbnailWidth);
    if (params.scaleFactor !== undefined) query.scale_factor = String(params.scaleFactor);
    if (params.transparent !== undefined) query.transparent = String(params.transparent);
    if (params.css !== undefined) query.css = params.css;
    if (params.js !== undefined) query.js = params.js;
    if (params.headers !== undefined) query.headers = params.headers;
    if (params.cookies !== undefined) query.cookies = params.cookies;
    if (params.acceptLanguage !== undefined) query.accept_language = params.acceptLanguage;
    if (params.userAgent !== undefined) query.user_agent = params.userAgent;
    if (params.proxy !== undefined) query.proxy = params.proxy;
    if (params.latitude !== undefined) query.latitude = String(params.latitude);
    if (params.longitude !== undefined) query.longitude = String(params.longitude);
    if (params.accuracy !== undefined) query.accuracy = String(params.accuracy);
    if (params.timeZone !== undefined) query.time_zone = params.timeZone;
    if (params.ipLocation !== undefined) query.ip_location = params.ipLocation;
    if (params.failOnStatus !== undefined) query.fail_on_status = params.failOnStatus;
    if (params.noAds !== undefined) query.no_ads = String(params.noAds);
    if (params.noTracking !== undefined) query.no_tracking = String(params.noTracking);
    if (params.noCookieBanners !== undefined)
      query.no_cookie_banners = String(params.noCookieBanners);
    if (params.ttl !== undefined) query.ttl = String(params.ttl);
    if (params.fresh !== undefined) query.fresh = String(params.fresh);
    if (params.responseType !== undefined) query.response_type = params.responseType;
    if (params.extractHtml !== undefined) query.extract_html = String(params.extractHtml);
    if (params.extractText !== undefined) query.extract_text = String(params.extractText);
    if (params.s3Endpoint !== undefined) query.s3_endpoint = params.s3Endpoint;
    if (params.s3Region !== undefined) query.s3_region = params.s3Region;
    if (params.s3AccessKeyId !== undefined) query.s3_access_key_id = params.s3AccessKeyId;
    if (params.s3SecretKey !== undefined) query.s3_secret_key = params.s3SecretKey;
    if (params.s3Bucket !== undefined) query.s3_bucket = params.s3Bucket;
    if (params.s3Key !== undefined) query.s3_key = params.s3Key;

    return query;
  }

  async captureScreenshot(params: ScreenshotParams): Promise<ScreenshotJsonResponse> {
    let query = this.buildQueryParams(params);
    query.response_type = 'json';

    let response = await this.axios.get('', {
      params: query
    });

    let data = response.data as Record<string, unknown>;
    return {
      url: data.url as string,
      extractedHtml: data.extracted_html as string | undefined,
      extractedText: data.extracted_text as string | undefined
    };
  }

  async getQuota(): Promise<QuotaResponse> {
    let response = await this.axios.get('/quota', {
      params: {
        access_key: this.accessKey
      }
    });

    return response.data as QuotaResponse;
  }

  async extractContent(params: ScreenshotParams): Promise<ScreenshotJsonResponse> {
    let query = this.buildQueryParams(params);
    query.response_type = 'json';
    query.extract_html = String(params.extractHtml ?? true);
    query.extract_text = String(params.extractText ?? true);

    let response = await this.axios.get('', {
      params: query
    });

    let data = response.data as Record<string, unknown>;
    return {
      url: data.url as string,
      extractedHtml: data.extracted_html as string | undefined,
      extractedText: data.extracted_text as string | undefined
    };
  }
}
