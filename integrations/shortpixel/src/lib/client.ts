import {
  createApiServiceError,
  createAuthenticatedAxios,
  decodeApiErrorBody,
  isApiErrorRecord
} from 'slates';
import {
  assertSuccessfulEnvelope,
  MAX_OPTIMIZED_IMAGE_BYTES,
  readNumber,
  readOptimizedImage,
  shortPixelError
} from './responses';
import type {
  ApiStatusResponse,
  DomainCdnUsageResponse,
  DomainStatusResponse,
  OptimizationResult,
  ReducerRequest
} from './types';

export class ShortPixelClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
  }

  private getReducerAxios() {
    return createAuthenticatedAxios({
      baseURL: 'https://api.shortpixel.com/v2',
      errorMapping: {
        extractResponseData: response => decodeApiErrorBody(response.data, { maxBytes: 16384 })
      },
      errorAdapter: shortPixelError
    });
  }

  private getCdnAxios() {
    return createAuthenticatedAxios({
      baseURL: 'https://no-cdn.shortpixel.ai',
      errorAdapter: shortPixelError
    });
  }

  async optimizeByUrl(params: {
    urls: string[];
    compression: 'lossy' | 'glossy' | 'lossless';
    convertTo?: string;
    resize?: 'none' | 'outer' | 'inner' | 'smart_crop';
    resizeWidth?: number;
    resizeHeight?: number;
    upscale?: number;
    keepExif?: boolean;
    cmykToRgb?: boolean;
    backgroundRemove?: string;
    refresh?: boolean;
    waitSeconds?: number;
  }): Promise<OptimizationResult[]> {
    let response = await this.getReducerAxios().post(
      '/reducer.php',
      this.buildReducerRequest(params)
    );
    return this.readOptimizationResults(response.data);
  }

  private buildReducerRequest(
    params: Parameters<ShortPixelClient['optimizeByUrl']>[0]
  ): ReducerRequest {
    let lossyValue =
      params.compression === 'lossy' ? 1 : params.compression === 'glossy' ? 2 : 0;

    let resizeValue = 0;
    if (params.resize === 'outer') resizeValue = 1;
    else if (params.resize === 'inner') resizeValue = 3;
    else if (params.resize === 'smart_crop') resizeValue = 4;

    let body: ReducerRequest = {
      key: this.apiKey,
      plugin_version: 'SLATS',
      lossy: lossyValue,
      urllist: params.urls
    };

    if (params.waitSeconds !== undefined) body.wait = params.waitSeconds;
    if (params.convertTo) body.convertto = params.convertTo;
    if (resizeValue > 0) {
      body.resize = resizeValue;
      if (params.resizeWidth) body.resize_width = params.resizeWidth;
      if (params.resizeHeight) body.resize_height = params.resizeHeight;
    }
    if (params.upscale) body.upscale = params.upscale;
    if (params.keepExif !== undefined) body.keep_exif = params.keepExif ? 1 : 0;
    if (params.cmykToRgb !== undefined) body.cmyk2rgb = params.cmykToRgb ? 1 : 0;
    if (params.backgroundRemove) {
      body.bg_remove = params.backgroundRemove === 'transparent' ? 1 : params.backgroundRemove;
    }
    if (params.refresh) body.refresh = 1;

    return body;
  }

  async optimizeImageFile(
    params: Omit<Parameters<ShortPixelClient['optimizeByUrl']>[0], 'urls'> & { url: string }
  ) {
    let body = this.buildReducerRequest({ ...params, urls: [params.url] });
    let { urllist: _urls, ...options } = body;
    let response = await this.getReducerAxios().post<ArrayBuffer>(
      '/reducer-sync.php',
      { ...options, url: params.url },
      {
        responseType: 'arraybuffer',
        maxRedirects: 0,
        maxContentLength: MAX_OPTIMIZED_IMAGE_BYTES,
        timeout: 90000
      }
    );
    return readOptimizedImage(response);
  }

  async pollOptimizationResult(params: {
    urls: string[];
    compression: 'lossy' | 'glossy' | 'lossless';
    convertTo?: string;
    waitSeconds?: number;
  }): Promise<OptimizationResult[]> {
    let axios = this.getReducerAxios();

    let lossyValue =
      params.compression === 'lossy' ? 1 : params.compression === 'glossy' ? 2 : 0;

    let body: ReducerRequest = {
      key: this.apiKey,
      plugin_version: 'SLATS',
      lossy: lossyValue,
      urllist: params.urls,
      wait: params.waitSeconds ?? 20
    };

    if (params.convertTo) body.convertto = params.convertTo;

    let response = await axios.post('/reducer.php', body);

    return this.readOptimizationResults(response.data);
  }

  async getApiStatus(): Promise<ApiStatusResponse> {
    let axios = this.getReducerAxios();

    let response = await axios.get('/api-status.php', {
      params: { key: this.apiKey }
    });

    assertSuccessfulEnvelope(response.data);
    if (!isApiErrorRecord(response.data) || !isApiErrorRecord(response.data.Status)) {
      throw createApiServiceError('ShortPixel returned invalid credit usage data.');
    }
    return response.data as ApiStatusResponse;
  }

  async readDomainStatus(domain: string): Promise<DomainStatusResponse> {
    let axios = this.getCdnAxios();

    let response = await axios.get(`/read-domain/${encodeURIComponent(domain)}`);
    return response.data as DomainStatusResponse;
  }

  async readDomainCdnUsage(domain: string): Promise<DomainCdnUsageResponse> {
    let axios = this.getCdnAxios();

    let response = await axios.get(
      `/read-domain-cdn-usage/${encodeURIComponent(domain)}/${encodeURIComponent(this.apiKey)}`
    );
    assertSuccessfulEnvelope(response.data);
    return response.data as DomainCdnUsageResponse;
  }

  async addDomain(domain: string): Promise<unknown> {
    let response = await this.getCdnAxios().get(
      `/add-domain/${encodeURIComponent(domain)}/${encodeURIComponent(this.apiKey)}`
    );
    assertSuccessfulEnvelope(response.data);
    return response.data;
  }

  async setDomain(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(
      `/set-domain/${encodeURIComponent(domain)}/${encodeURIComponent(this.apiKey)}`
    );
    assertSuccessfulEnvelope(response.data);
    return response.data;
  }

  async revokeDomain(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(
      `/revoke-domain/${encodeURIComponent(domain)}/${encodeURIComponent(this.apiKey)}`
    );
    assertSuccessfulEnvelope(response.data);
    return response.data;
  }

  async purgeStorageBulk(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(
      `/purge-storage-bulk/${encodeURIComponent(this.apiKey)}/${encodeURIComponent(domain)}`
    );
    assertSuccessfulEnvelope(response.data);
    return response.data;
  }

  async purgeCdnCacheBulk(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(
      `/purge-cdn-cache-bulk/${encodeURIComponent(this.apiKey)}/${encodeURIComponent(domain)}`
    );
    assertSuccessfulEnvelope(response.data);
    return response.data;
  }

  private readOptimizationResults(data: unknown): OptimizationResult[] {
    if (!Array.isArray(data)) assertSuccessfulEnvelope(data);
    let results = Array.isArray(data) ? data : [data];
    return results.map(result => {
      if (
        !isApiErrorRecord(result) ||
        !isApiErrorRecord(result.Status) ||
        typeof result.Status.Message !== 'string'
      ) {
        throw createApiServiceError('ShortPixel returned an invalid optimization result.');
      }
      return {
        ...result,
        Status: { ...result.Status, Code: readNumber(result.Status.Code, 'status code') }
      } as OptimizationResult;
    });
  }

  buildCdnUrl(params: {
    originalUrl: string;
    width?: number;
    height?: number;
    crop?: string;
    quality?: 'lossy' | 'glossy' | 'lossless' | 'lqip';
    format?: 'webp' | 'avif' | 'auto';
  }): string {
    let parts: string[] = [];

    if (params.quality) parts.push(`q_${params.quality}`);
    if (params.format) parts.push(`to_${params.format}`);
    if (params.width) parts.push(`w_${params.width}`);
    if (params.height) parts.push(`h_${params.height}`);
    if (params.crop) parts.push(`c_${params.crop}`);

    let paramString = parts.length > 0 ? parts.join(',') : 'q_lossy';

    return `https://cdn.shortpixel.ai/client/${paramString}/${params.originalUrl}`;
  }
}
