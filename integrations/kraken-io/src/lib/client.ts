import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';
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

  private async request<T>(path: string, body: unknown, allowCallback = false): Promise<T> {
    try {
      let response = await apiAxios.post(path, body);
      let data: unknown = response.data;
      if (!isApiErrorRecord(data)) {
        throw createApiServiceError('Kraken.io returned an invalid response.');
      }
      if (data.success === false) {
        throw createApiServiceError(
          typeof data.message === 'string' ? data.message : 'Kraken.io rejected the request.'
        );
      }
      if (
        data.success !== true &&
        !(allowCallback && typeof data.id === 'string' && data.id)
      ) {
        throw createApiServiceError('Kraken.io did not confirm the request.');
      }
      return data as T;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Kraken.io',
        reason: 'krakenio_api_error',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
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

    return this.request('/v1/url', body, Boolean(options.callbackUrl));
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

    return this.request('/v1/url', body, Boolean(options.callbackUrl));
  }

  async getUserStatus(): Promise<KrakenUserStatusResponse> {
    let status = await this.request<KrakenUserStatusResponse>('/user_status', {
      auth: this.auth
    });
    if (
      typeof status.active !== 'boolean' ||
      typeof status.plan_name !== 'string' ||
      [status.quota_total, status.quota_used, status.quota_remaining].some(
        value => typeof value !== 'number' || !Number.isFinite(value)
      )
    ) {
      throw createApiServiceError('Kraken.io returned an incomplete account status response.');
    }
    return status;
  }
}
