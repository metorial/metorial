import { createAxios } from 'slates';
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
    return createAxios({
      baseURL: 'https://api.shortpixel.com/v2'
    });
  }

  private getCdnAxios() {
    return createAxios({
      baseURL: 'https://no-cdn.shortpixel.ai'
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
    let axios = this.getReducerAxios();

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

    let response = await axios.post('/reducer.php', body);

    let data = response.data;
    if (Array.isArray(data)) {
      return data as OptimizationResult[];
    }
    return [data as OptimizationResult];
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

    let data = response.data;
    if (Array.isArray(data)) {
      return data as OptimizationResult[];
    }
    return [data as OptimizationResult];
  }

  async getApiStatus(): Promise<ApiStatusResponse> {
    let axios = this.getReducerAxios();

    let response = await axios.get('/api-status.php', {
      params: { key: this.apiKey }
    });

    return response.data as ApiStatusResponse;
  }

  async readDomainStatus(domain: string): Promise<DomainStatusResponse> {
    let axios = this.getCdnAxios();

    let response = await axios.get(`/read-domain/${domain}`);
    return response.data as DomainStatusResponse;
  }

  async readDomainCdnUsage(domain: string): Promise<DomainCdnUsageResponse> {
    let axios = this.getCdnAxios();

    let response = await axios.get(`/read-domain-cdn-usage/${domain}/${this.apiKey}`);
    return response.data as DomainCdnUsageResponse;
  }

  async setDomain(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(`/set-domain/${domain}/${this.apiKey}`);
    return response.data;
  }

  async revokeDomain(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(`/revoke-domain/${domain}/${this.apiKey}`);
    return response.data;
  }

  async purgeStorageBulk(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(`/purge-storage-bulk/${this.apiKey}/${domain}`);
    return response.data;
  }

  async purgeCdnCacheBulk(domain: string): Promise<unknown> {
    let axios = this.getCdnAxios();

    let response = await axios.get(`/purge-cdn-cache-bulk/${this.apiKey}/${domain}`);
    return response.data;
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
