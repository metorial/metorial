import { type HttpHandler, type HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { buildQueryString } from '@smithy/querystring-builder';
import type { HttpHandlerOptions } from '@smithy/types';
import { createAxios } from 'slates';

type SlatesAxiosInstance = ReturnType<typeof createAxios>;

export interface SlatesAwsSdkHttpHandlerConfig {
  axiosInstance?: SlatesAxiosInstance;
  requestTimeout?: number;
}

let NODE_TIMEOUT_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT']);
let NODE_NETWORK_CODES = new Set(['EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND']);

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

let normalizeHeaders = (headers: unknown): Record<string, string> => {
  let raw =
    headers && typeof (headers as { toJSON?: () => unknown }).toJSON === 'function'
      ? (headers as { toJSON: () => unknown }).toJSON()
      : headers;

  let out: Record<string, string> = {};

  for (let [key, value] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
    if (value == null) continue;
    out[key.toLowerCase()] = Array.isArray(value)
      ? value.map(String).join(', ')
      : String(value);
  }

  return out;
};

let hasHeader = (headers: Record<string, string>, name: string) =>
  Object.keys(headers).some(key => key.toLowerCase() === name.toLowerCase());

let buildRequestHeaders = (headers: Record<string, string>) => {
  let out = { ...headers };

  if (!hasHeader(out, 'accept')) {
    // Axios defaults to asking for JSON, which makes AWS Query services such as
    // STS, IAM, and SNS return JSON even though the SDK deserializers expect XML.
    out.accept = '*/*';
  }

  return out;
};

let getSlateCode = (error: unknown): string | undefined => {
  if (!isRecord(error)) return undefined;

  return typeof error.code === 'string' ? error.code : undefined;
};

let getTransportCode = (error: unknown): string | undefined => {
  if (!isRecord(error)) return undefined;

  let directCode = typeof error.code === 'string' ? error.code : undefined;
  if (directCode && !directCode.startsWith('upstream.')) return directCode;

  let baggage =
    isRecord(error.data) && isRecord(error.data.baggage) ? error.data.baggage : undefined;
  let axiosCode =
    baggage && typeof baggage.axiosCode === 'string' ? baggage.axiosCode : undefined;
  if (axiosCode) return axiosCode;

  return getTransportCode(error.cause);
};

let messageForError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

let createSdkTransportError = (error: unknown, name: string, code?: string) => {
  let sdkError = new Error(messageForError(error), { cause: error });
  sdkError.name = name;

  if (code) {
    Object.assign(sdkError, { code });
  }

  return sdkError;
};

let normalizeTransportError = (error: unknown) => {
  let slateCode = getSlateCode(error);
  let transportCode = getTransportCode(error);

  if (
    slateCode === 'upstream.timeout' ||
    transportCode === 'ECONNABORTED' ||
    (transportCode && NODE_TIMEOUT_CODES.has(transportCode))
  ) {
    return createSdkTransportError(error, 'TimeoutError', transportCode ?? 'ETIMEDOUT');
  }

  if (
    slateCode === 'upstream.network_error' ||
    (transportCode && NODE_NETWORK_CODES.has(transportCode))
  ) {
    return createSdkTransportError(error, 'Error', transportCode);
  }

  return error;
};

export class SlatesAwsSdkHttpHandler implements HttpHandler<SlatesAwsSdkHttpHandlerConfig> {
  private readonly axiosClient: SlatesAxiosInstance;
  private config: SlatesAwsSdkHttpHandlerConfig;

  constructor(config: SlatesAwsSdkHttpHandlerConfig = {}) {
    this.config = config;
    this.axiosClient = config.axiosInstance ?? createAxios();
  }

  updateHttpClientConfig<K extends keyof SlatesAwsSdkHttpHandlerConfig>(
    key: K,
    value: SlatesAwsSdkHttpHandlerConfig[K]
  ): void {
    this.config = { ...this.config, [key]: value };
  }

  httpHandlerConfigs(): SlatesAwsSdkHttpHandlerConfig {
    return this.config;
  }

  destroy(): void {
    // The default Slates Axios client does not own sockets or agents.
  }

  async handle(
    request: HttpRequest,
    options: HttpHandlerOptions = {}
  ): Promise<{ response: HttpResponse }> {
    let queryString = request.query ? buildQueryString(request.query) : '';
    let port = request.port ? `:${request.port}` : '';
    let url =
      `${request.protocol}//${request.hostname}${port}${request.path}` +
      (queryString ? `?${queryString}` : '');
    let method = request.method.toUpperCase();

    try {
      let axiosResponse = await this.axiosClient.request({
        url,
        method,
        headers: buildRequestHeaders(request.headers),
        data: method === 'GET' || method === 'HEAD' ? undefined : request.body,
        validateStatus: () => true,
        responseType: 'stream',
        transformRequest: [data => data],
        transformResponse: [data => data],
        maxRedirects: 0,
        decompress: false,
        timeout: options.requestTimeout ?? this.config.requestTimeout,
        signal: options.abortSignal as AbortSignal | undefined
      });

      return {
        response: new HttpResponse({
          statusCode: axiosResponse.status,
          reason: axiosResponse.statusText,
          headers: normalizeHeaders(axiosResponse.headers),
          body: axiosResponse.data
        })
      };
    } catch (error) {
      throw normalizeTransportError(error);
    }
  }
}

export let createSlatesAwsSdkHttpHandler = (config?: SlatesAwsSdkHttpHandlerConfig) =>
  new SlatesAwsSdkHttpHandler(config);
