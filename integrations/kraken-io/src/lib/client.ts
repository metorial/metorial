import { createAxios } from 'slates';
import type {
  KrakenAuth,
  KrakenCallbackResponse,
  KrakenConvertOptions,
  KrakenImageSetResponse,
  KrakenOptimizeRequest,
  KrakenOptimizeResponse,
  KrakenResizeOptions,
  KrakenResizeSetItem,
  KrakenS3Store,
  KrakenUserStatusResponse
} from './types';

let apiAxios = createAxios({
  baseURL: 'https://api.kraken.io'
});

export interface ClientConfig {
  apiKey: string;
  apiSecret: string;
  sandbox?: boolean;
}

export class Client {
  private auth: KrakenAuth;
  private sandbox: boolean;

  constructor(config: ClientConfig) {
    this.auth = {
      api_key: config.apiKey,
      api_secret: config.apiSecret
    };
    this.sandbox = config.sandbox ?? false;
  }

  async optimizeFromUrl(options: {
    url: string;
    lossy?: boolean;
    quality?: number;
    samplingScheme?: string;
    resize?: KrakenResizeOptions;
    convert?: KrakenConvertOptions;
    preserveMeta?: string[];
    autoOrient?: boolean;
    s3Store?: KrakenS3Store;
    callbackUrl?: string;
  }): Promise<KrakenOptimizeResponse | KrakenCallbackResponse> {
    let body: KrakenOptimizeRequest = {
      auth: this.auth,
      url: options.url,
      wait: !options.callbackUrl,
      ...(options.callbackUrl && { callback_url: options.callbackUrl, json: true }),
      ...(this.sandbox && { dev: true }),
      ...(options.lossy !== undefined && { lossy: options.lossy }),
      ...(options.quality !== undefined && { quality: options.quality }),
      ...(options.samplingScheme && { sampling_scheme: options.samplingScheme }),
      ...(options.resize && { resize: options.resize }),
      ...(options.convert && { convert: options.convert }),
      ...(options.preserveMeta &&
        options.preserveMeta.length > 0 && { preserve_meta: options.preserveMeta }),
      ...(options.autoOrient !== undefined && { auto_orient: options.autoOrient }),
      ...(options.s3Store && { s3_store: options.s3Store })
    };

    let response = await apiAxios.post('/v1/url', body);
    return response.data as KrakenOptimizeResponse | KrakenCallbackResponse;
  }

  async generateImageSets(options: {
    url: string;
    lossy?: boolean;
    quality?: number;
    samplingScheme?: string;
    sizes: KrakenResizeSetItem[];
    convert?: KrakenConvertOptions;
    preserveMeta?: string[];
    autoOrient?: boolean;
    s3Store?: KrakenS3Store;
    callbackUrl?: string;
  }): Promise<KrakenImageSetResponse | KrakenCallbackResponse> {
    let body: KrakenOptimizeRequest = {
      auth: this.auth,
      url: options.url,
      wait: !options.callbackUrl,
      ...(options.callbackUrl && { callback_url: options.callbackUrl, json: true }),
      ...(this.sandbox && { dev: true }),
      ...(options.lossy !== undefined && { lossy: options.lossy }),
      ...(options.quality !== undefined && { quality: options.quality }),
      ...(options.samplingScheme && { sampling_scheme: options.samplingScheme }),
      resize: options.sizes,
      ...(options.convert && { convert: options.convert }),
      ...(options.preserveMeta &&
        options.preserveMeta.length > 0 && { preserve_meta: options.preserveMeta }),
      ...(options.autoOrient !== undefined && { auto_orient: options.autoOrient }),
      ...(options.s3Store && { s3_store: options.s3Store })
    };

    let response = await apiAxios.post('/v1/url', body);
    return response.data as KrakenImageSetResponse | KrakenCallbackResponse;
  }

  async getUserStatus(): Promise<KrakenUserStatusResponse> {
    let response = await apiAxios.post('/user_status', {
      auth: this.auth
    });
    return response.data as KrakenUserStatusResponse;
  }
}
