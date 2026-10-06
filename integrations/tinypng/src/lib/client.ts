import { createAxios, getResponseHeaderValue, isApiErrorRecord } from 'slates';
import {
  FILE_LIMIT,
  guardSecrets,
  imageTypes,
  integer,
  invalid,
  outputUrl,
  sourceUrl,
  text,
  upstream,
  validateOptions
} from './validation';

export interface CompressResult {
  inputSize?: number;
  inputType?: string;
  outputSize?: number;
  outputType?: string;
  outputWidth?: number;
  outputHeight?: number;
  outputRatio?: number;
  outputUrl: string;
  compressionCount?: number;
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
  resize?: ResizeOptions;
  convert?: { type: string | string[] };
  transform?: { background: string };
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
  compressionCount?: number;
  content?: Response;
}
function headerInteger(headers: unknown, name: string, positive = false): number | undefined {
  const raw = getResponseHeaderValue(headers, name);
  if (raw === undefined) return undefined;
  if (!/^\d+$/.test(raw)) throw invalid(`Tinify returned an invalid ${name} header.`);
  return integer(Number(raw), `Tinify ${name}`, positive);
}
function nativeRecord(value: unknown): Record<string, unknown> {
  if (!isApiErrorRecord(value))
    throw invalid(
      'Tinify returned an unexpected response; reconcile compression usage before retrying.'
    );
  return value;
}
export class TinifyClient {
  private axios;
  private secrets: string[];
  constructor(token: string, additionalSecrets: string[] = []) {
    text(token, 'API key');
    const basic = `Basic ${Buffer.from(`api:${token}`).toString('base64')}`;
    this.secrets = [token, basic, basic.slice(6), ...additionalSecrets];
    this.axios = createAxios({
      baseURL: 'https://api.tinify.com',
      headers: { Authorization: basic },
      maxRedirects: 0,
      timeout: 120000,
      maxContentLength: FILE_LIMIT,
      maxBodyLength: FILE_LIMIT
    });
  }
  private async request(
    method: 'get' | 'post',
    path: string,
    data?: unknown,
    binary = false,
    validation = false
  ) {
    let response: { status: number; data: unknown; headers: unknown };
    try {
      response = await this.axios.request({
        method,
        url: path,
        data,
        responseType: binary ? 'arraybuffer' : 'json',
        headers:
          method === 'post'
            ? {
                'Content-Type':
                  binary && path === '/shrink'
                    ? 'application/octet-stream'
                    : 'application/json'
              }
            : undefined,
        validateStatus: () => true
      });
    } catch (error) {
      upstream(error);
    }
    if (
      validation
        ? response.status !== 400 && response.status !== 429
        : response.status !== (path === '/shrink' ? 201 : 200)
    )
      upstream({ response: { status: response.status } });
    return response;
  }
  private compressResult(data: unknown, headers: unknown): CompressResult {
    guardSecrets(data, this.secrets);
    const metadata = nativeRecord(data);
    if (
      metadata.error !== undefined ||
      (metadata.input === undefined && metadata.output === undefined)
    )
      throw invalid(
        'Tinify returned no valid compression receipt. Reconcile usage before retrying.'
      );
    const root = nativeRecord(data),
      input = root.input === undefined ? {} : nativeRecord(root.input),
      output = root.output === undefined ? {} : nativeRecord(root.output);
    const number = (v: unknown, label: string) =>
      v === undefined ? undefined : integer(v, `Tinify ${label}`, true);
    const mime = (v: unknown) =>
      v === undefined
        ? undefined
        : imageTypes.includes(String(v))
          ? String(v)
          : (() => {
              throw invalid('Tinify returned an unexpected image type.');
            })();
    const ratio = output.ratio;
    if (
      ratio !== undefined &&
      (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0)
    )
      throw invalid('Tinify returned an invalid compression ratio.');
    const url = outputUrl(getResponseHeaderValue(headers, 'Location'));
    guardSecrets(url, this.secrets);
    return {
      inputSize: number(input.size, 'input size'),
      inputType: mime(input.type),
      outputSize: number(output.size, 'output size'),
      outputType: mime(output.type),
      outputWidth: number(output.width, 'width'),
      outputHeight: number(output.height, 'height'),
      outputRatio: typeof ratio === 'number' ? ratio : undefined,
      outputUrl: url,
      compressionCount: headerInteger(headers, 'Compression-Count')
    };
  }
  async compressFromUrl(url: string): Promise<CompressResult> {
    sourceUrl(url);
    guardSecrets(url, this.secrets);
    const response = await this.request('post', '/shrink', { source: { url } });
    return this.compressResult(response.data, response.headers);
  }
  async compressFromBuffer(imageData: Buffer, contentType: string): Promise<CompressResult> {
    if (
      !imageData.length ||
      imageData.length > FILE_LIMIT ||
      !imageTypes.includes(contentType)
    )
      throw invalid('Supply a nonempty supported image within the 64 MiB delivery limit.');
    let response: { status: number; data: unknown; headers: unknown };
    try {
      response = await this.axios.post('/shrink', imageData, {
        headers: { 'Content-Type': contentType },
        validateStatus: () => true
      });
    } catch (error) {
      upstream(error);
    }
    if (response.status !== 201) upstream({ response: { status: response.status } });
    return this.compressResult(response.data, response.headers);
  }
  private binaryResult(data: unknown, headers: unknown): OutputResult {
    if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data))
      throw invalid(
        'Tinify returned no image bytes; reconcile compression usage before retrying.'
      );
    const bytes =
      data instanceof ArrayBuffer
        ? Buffer.from(data)
        : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    const type = getResponseHeaderValue(headers, 'Content-Type')?.split(';')[0]?.trim();
    const length = headerInteger(headers, 'Content-Length');
    if (
      !bytes.length ||
      bytes.length > FILE_LIMIT ||
      (length !== undefined && length !== bytes.length) ||
      !type ||
      !imageTypes.includes(type)
    )
      throw invalid(
        'Tinify returned an invalid or oversized image response; reconcile usage before retrying.'
      );
    guardSecrets(bytes.toString('latin1'), this.secrets);
    const valid =
      type === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : type === 'image/jpeg' || type === 'image/jpg'
          ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          : type === 'image/webp'
            ? bytes.toString('ascii', 0, 4) === 'RIFF' &&
              bytes.toString('ascii', 8, 12) === 'WEBP'
            : type === 'image/avif'
              ? bytes.toString('ascii', 4, 8) === 'ftyp' &&
                /avif|avis/.test(bytes.toString('ascii', 8, 40))
              : bytes.subarray(0, 2).equals(Buffer.from([255, 10])) ||
                bytes
                  .subarray(0, 12)
                  .equals(Buffer.from([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10]));
    if (!valid)
      throw invalid(
        'Tinify returned content inconsistent with its image type. Contact provider support before retrying.'
      );
    return {
      width: headerInteger(headers, 'Image-Width', true),
      height: headerInteger(headers, 'Image-Height', true),
      contentType: type,
      contentLength: bytes.length,
      compressionCount: headerInteger(headers, 'Compression-Count'),
      content: new Response(new Uint8Array(bytes), { headers: { 'Content-Type': type } })
    };
  }
  async downloadOutput(url: string): Promise<OutputResult> {
    const locator = outputUrl(url);
    guardSecrets(locator, this.secrets);
    const response = await this.request('get', locator, undefined, true);
    return this.binaryResult(response.data, response.headers);
  }
  async postToOutput(url: string, body: OutputRequestBody): Promise<OutputResult> {
    const locator = outputUrl(url);
    guardSecrets(locator, this.secrets);
    const response = await this.request('post', locator, body, true);
    if (body.store) {
      const location = getResponseHeaderValue(response.headers, 'Location');
      if (!location)
        throw invalid(
          'Cloud write may have succeeded without a storage receipt. Inspect the exact target object before retrying.'
        );
      let stored: URL;
      try {
        stored = new URL(location);
      } catch {
        throw invalid(
          'Cloud write returned an invalid receipt; inspect the target object before retrying.'
        );
      }
      if (
        stored.protocol !== 'https:' ||
        stored.username ||
        stored.password ||
        stored.search ||
        stored.hash
      )
        throw invalid(
          'Cloud write returned an unsafe storage receipt; inspect the target object before retrying.'
        );
      guardSecrets(location, this.secrets);
      const expectedPath = String(body.store.path);
      const slash = expectedPath.indexOf('/');
      const bucket = expectedPath.slice(0, slash);
      let returnedPath: string;
      try {
        returnedPath = decodeURIComponent(stored.pathname.slice(1));
      } catch {
        throw invalid(
          'Cloud write returned an invalid object path. Inspect the target before retrying.'
        );
      }
      const matches =
        body.store.service === 'gcs'
          ? stored.hostname === 'storage.googleapis.com' && returnedPath === expectedPath
          : (/^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(stored.hostname) &&
              returnedPath === expectedPath) ||
            (stored.hostname.startsWith(`${bucket}.s3`) &&
              /^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(
                stored.hostname.slice(bucket.length + 1)
              ) &&
              returnedPath === expectedPath.slice(slash + 1));
      if (!matches)
        throw invalid(
          'Cloud write receipt did not match the requested bucket and object. Inspect that target before retrying.'
        );
      return {
        storageUrl: location,
        width: headerInteger(response.headers, 'Image-Width', true),
        height: headerInteger(response.headers, 'Image-Height', true),
        compressionCount: headerInteger(response.headers, 'Compression-Count')
      };
    }
    return this.binaryResult(response.data, response.headers);
  }
  async resizeImage(
    url: string,
    resize: ResizeOptions,
    options?: { preserve?: string[]; convert?: ConvertOptions }
  ): Promise<OutputResult> {
    validateOptions({ resize, ...options });
    return this.postToOutput(url, { resize, ...this.commands(options) });
  }
  async convertImage(
    url: string,
    convert: ConvertOptions,
    options?: { preserve?: string[] }
  ): Promise<OutputResult> {
    validateOptions({ convert, ...options });
    return this.postToOutput(url, this.commands({ convert, ...options }));
  }
  private commands(options?: {
    convert?: ConvertOptions;
    preserve?: string[];
  }): OutputRequestBody {
    return {
      ...(options?.convert
        ? {
            convert: { type: options.convert.type },
            ...(options.convert.background !== undefined
              ? { transform: { background: options.convert.background } }
              : {})
          }
        : {}),
      ...(options?.preserve?.length ? { preserve: options.preserve } : {})
    };
  }
  async storeToCloud(
    url: string,
    store: StoreOptions,
    options?: { resize?: ResizeOptions; convert?: ConvertOptions; preserve?: string[] }
  ): Promise<OutputResult> {
    validateOptions({ store, ...options });
    this.secrets.push(
      ...(store.service === 's3'
        ? [store.awsAccessKeyId, store.awsSecretAccessKey]
        : [store.gcpAccessToken])
    );
    const payload =
      store.service === 's3'
        ? {
            service: 's3',
            aws_access_key_id: store.awsAccessKeyId,
            aws_secret_access_key: store.awsSecretAccessKey,
            region: store.region,
            path: store.path,
            ...(store.acl !== undefined ? { acl: store.acl } : {})
          }
        : { service: 'gcs', gcp_access_token: store.gcpAccessToken, path: store.path };
    return this.postToOutput(url, {
      store: { ...payload, ...(store.headers ? { headers: store.headers } : {}) },
      ...(options?.resize ? { resize: options.resize } : {}),
      ...this.commands(options)
    });
  }
  async getCompressionCount(): Promise<number> {
    const response = await this.request('post', '/shrink', undefined, false, true);
    guardSecrets(response.data, this.secrets);
    const count = headerInteger(response.headers, 'Compression-Count');
    if (count === undefined)
      throw invalid(
        'Tinify did not return monthly usage. Check the key, quota and service availability.'
      );
    return count;
  }
}
