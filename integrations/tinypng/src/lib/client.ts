import { createAxios } from 'slates';

export interface CompressResult {
  inputSize: number;
  inputType: string;
  outputSize: number;
  outputType: string;
  outputWidth: number;
  outputHeight: number;
  outputRatio: number;
  outputUrl: string;
  compressionCount: number;
}

export interface ResizeOptions {
  method: 'scale' | 'fit' | 'cover' | 'thumb';
  width?: number;
  height?: number;
}

export interface ConvertOptions {
  type: string | string[];
  background?: string;
}

export interface S3StoreOptions {
  service: 's3';
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  region: string;
  path: string;
  acl?: string;
  headers?: Record<string, string>;
}

export interface GcsStoreOptions {
  service: 'gcs';
  gcpAccessToken: string;
  path: string;
  headers?: Record<string, string>;
}

export type StoreOptions = S3StoreOptions | GcsStoreOptions;

export interface OutputRequestBody {
  resize?: {
    method: string;
    width?: number;
    height?: number;
  };
  convert?: {
    type: string | string[];
  };
  transform?: {
    background: string;
  };
  preserve?: string[];
  store?: Record<string, unknown>;
}

export interface OutputResult {
  outputUrl?: string;
  storageUrl?: string;
  width?: number;
  height?: number;
  contentType?: string;
  contentLength?: number;
  compressionCount: number;
}

export class TinifyClient {
  private axios;

  constructor(token: string) {
    let authString = Buffer.from(`api:${token}`).toString('base64');
    this.axios = createAxios({
      baseURL: 'https://api.tinify.com',
      headers: {
        Authorization: `Basic ${authString}`
      }
    });
  }

  async compressFromUrl(sourceUrl: string): Promise<CompressResult> {
    let response = await this.axios.post(
      '/shrink',
      {
        source: { url: sourceUrl }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    let data = response.data;
    let outputUrl = response.headers.location || response.headers.Location || '';
    let compressionCount = Number.parseInt(
      response.headers['compression-count'] || response.headers['Compression-Count'] || '0',
      10
    );

    return {
      inputSize: data.input?.size ?? 0,
      inputType: data.input?.type ?? '',
      outputSize: data.output?.size ?? 0,
      outputType: data.output?.type ?? '',
      outputWidth: data.output?.width ?? 0,
      outputHeight: data.output?.height ?? 0,
      outputRatio: data.output?.ratio ?? 0,
      outputUrl,
      compressionCount
    };
  }

  async compressFromBuffer(imageData: Buffer, contentType: string): Promise<CompressResult> {
    let response = await this.axios.post('/shrink', imageData, {
      headers: { 'Content-Type': contentType }
    });

    let data = response.data;
    let outputUrl = response.headers.location || response.headers.Location || '';
    let compressionCount = Number.parseInt(
      response.headers['compression-count'] || response.headers['Compression-Count'] || '0',
      10
    );

    return {
      inputSize: data.input?.size ?? 0,
      inputType: data.input?.type ?? '',
      outputSize: data.output?.size ?? 0,
      outputType: data.output?.type ?? '',
      outputWidth: data.output?.width ?? 0,
      outputHeight: data.output?.height ?? 0,
      outputRatio: data.output?.ratio ?? 0,
      outputUrl,
      compressionCount
    };
  }

  async postToOutput(outputUrl: string, body: OutputRequestBody): Promise<OutputResult> {
    let response = await this.axios.post(outputUrl, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    let compressionCount = Number.parseInt(
      String(
        response.headers['compression-count'] ?? response.headers['Compression-Count'] ?? '0'
      ),
      10
    );
    let locationHeader = response.headers.location || response.headers.Location;

    return {
      outputUrl: typeof locationHeader === 'string' ? locationHeader : undefined,
      storageUrl: typeof locationHeader === 'string' ? locationHeader : undefined,
      width:
        Number.parseInt(
          String(response.headers['image-width'] ?? response.headers['Image-Width'] ?? '0'),
          10
        ) || undefined,
      height:
        Number.parseInt(
          String(response.headers['image-height'] ?? response.headers['Image-Height'] ?? '0'),
          10
        ) || undefined,
      contentType:
        typeof response.headers['content-type'] === 'string'
          ? response.headers['content-type']
          : typeof response.headers['Content-Type'] === 'string'
            ? response.headers['Content-Type']
            : undefined,
      contentLength:
        Number.parseInt(
          String(
            response.headers['content-length'] ?? response.headers['Content-Length'] ?? '0'
          ),
          10
        ) || undefined,
      compressionCount
    };
  }

  async resizeImage(
    outputUrl: string,
    resize: ResizeOptions,
    options?: {
      preserve?: string[];
      convert?: ConvertOptions;
    }
  ): Promise<OutputResult> {
    let body: OutputRequestBody = {
      resize: {
        method: resize.method,
        ...(resize.width !== undefined ? { width: resize.width } : {}),
        ...(resize.height !== undefined ? { height: resize.height } : {})
      }
    };

    if (options?.preserve && options.preserve.length > 0) {
      body.preserve = options.preserve;
    }

    if (options?.convert) {
      body.convert = { type: options.convert.type };
      if (options.convert.background) {
        body.transform = { background: options.convert.background };
      }
    }

    return this.postToOutput(outputUrl, body);
  }

  async convertImage(
    outputUrl: string,
    convert: ConvertOptions,
    options?: {
      preserve?: string[];
    }
  ): Promise<OutputResult> {
    let body: OutputRequestBody = {
      convert: { type: convert.type }
    };

    if (convert.background) {
      body.transform = { background: convert.background };
    }

    if (options?.preserve && options.preserve.length > 0) {
      body.preserve = options.preserve;
    }

    return this.postToOutput(outputUrl, body);
  }

  async storeToCloud(
    outputUrl: string,
    store: StoreOptions,
    options?: {
      resize?: ResizeOptions;
      convert?: ConvertOptions;
      preserve?: string[];
    }
  ): Promise<OutputResult> {
    let storePayload: Record<string, unknown> = {};

    if (store.service === 's3') {
      storePayload = {
        service: 's3',
        aws_access_key_id: store.awsAccessKeyId,
        aws_secret_access_key: store.awsSecretAccessKey,
        region: store.region,
        path: store.path,
        ...(store.acl ? { acl: store.acl } : {}),
        ...(store.headers ? { headers: store.headers } : {})
      };
    } else {
      storePayload = {
        service: 'gcs',
        gcp_access_token: store.gcpAccessToken,
        path: store.path,
        ...(store.headers ? { headers: store.headers } : {})
      };
    }

    let body: OutputRequestBody = { store: storePayload };

    if (options?.resize) {
      body.resize = {
        method: options.resize.method,
        ...(options.resize.width !== undefined ? { width: options.resize.width } : {}),
        ...(options.resize.height !== undefined ? { height: options.resize.height } : {})
      };
    }

    if (options?.convert) {
      body.convert = { type: options.convert.type };
      if (options.convert.background) {
        body.transform = { background: options.convert.background };
      }
    }

    if (options?.preserve && options.preserve.length > 0) {
      body.preserve = options.preserve;
    }

    return this.postToOutput(outputUrl, body);
  }

  async getCompressionCount(): Promise<number> {
    let response = await this.axios.post(
      '/shrink',
      {},
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      }
    );

    let compressionCount = Number.parseInt(
      response.headers['compression-count'] || response.headers['Compression-Count'] || '0',
      10
    );

    return compressionCount;
  }
}
