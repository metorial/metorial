import { Buffer } from 'node:buffer';
import { type MetorialConfig, normalizeMetorialConfig } from '../config';
import type { MetorialIntrospectionDocs, MetorialMethod } from './endpoints';
import {
  metorialApiError,
  metorialHttpError,
  metorialUnsupportedContentTypeError
} from './errors';

type QueryValue = unknown;

type RequestOptions = {
  method?: MetorialMethod;
  token?: string;
  instanceId?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  operation: string;
};

export type MetorialEndpointResponse =
  | {
      kind: 'empty';
      status: number;
      statusText: string;
      contentType?: string;
      size: number;
    }
  | {
      kind: 'json';
      status: number;
      statusText: string;
      contentType?: string;
      size: number;
      data: unknown;
    }
  | {
      kind: 'text';
      status: number;
      statusText: string;
      contentType?: string;
      size: number;
      text: string;
    }
  | {
      kind: 'binary';
      status: number;
      statusText: string;
      contentType?: string;
      size: number;
      base64: string;
    };

let appendQueryValue = (params: URLSearchParams, key: string, value: QueryValue) => {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    for (let item of value) appendQueryValue(params, key, item);
    return;
  }

  if (typeof value === 'object') {
    params.append(key, JSON.stringify(value));
    return;
  }

  params.append(key, String(value));
};

let isJsonContentType = (contentType?: string) =>
  !!contentType && /\bjson\b/i.test(contentType);

let isTextContentType = (contentType?: string) =>
  !!contentType &&
  (contentType.startsWith('text/') ||
    /\b(xml|csv|yaml|toml|markdown|html|javascript)\b/i.test(contentType));

let readResponseBuffer = async (response: Response) =>
  Buffer.from(await response.arrayBuffer());

export class MetorialClient {
  private readonly apiUrl: string;
  private readonly apiVersion: string;

  constructor(config: Partial<MetorialConfig> & Record<string, unknown>) {
    let normalized = normalizeMetorialConfig(config);
    this.apiUrl = normalized.apiUrl;
    this.apiVersion = normalized.apiVersion;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>) {
    let url = new URL(path, `${this.apiUrl}/`);

    for (let [key, value] of Object.entries(query ?? {})) {
      appendQueryValue(url.searchParams, key, value);
    }

    return url;
  }

  private async request(path: string, options: RequestOptions) {
    let method = options.method?.toUpperCase() ?? 'GET';
    let url = this.buildUrl(path, options.query);
    let headers: Record<string, string> = {
      'Metorial-Version': this.apiVersion
    };

    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.instanceId) headers['metorial-instance-id'] = options.instanceId;

    let body: string | undefined;
    if (options.body !== undefined && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body
      });
    } catch (error) {
      throw metorialApiError(error, options.operation);
    }

    return response;
  }

  private async requestJson<T>(path: string, options: RequestOptions) {
    let response = await this.request(path, options);
    let contentType = response.headers.get('content-type') ?? undefined;
    let body = await response.text();

    if (!response.ok) {
      throw metorialHttpError({
        operation: options.operation,
        status: response.status,
        statusText: response.statusText,
        body,
        contentType
      });
    }

    if (!isJsonContentType(contentType)) {
      throw metorialUnsupportedContentTypeError(options.operation, contentType);
    }

    try {
      return JSON.parse(body) as T;
    } catch (error) {
      throw metorialApiError(error, `${options.operation} JSON parsing`);
    }
  }

  async introspectEndpoints() {
    return await this.requestJson<MetorialIntrospectionDocs>(
      '/metorial/introspect/endpoints',
      {
        operation: 'endpoint introspection',
        query: { version: this.apiVersion }
      }
    );
  }

  async listInstances(token: string) {
    return await this.requestJson<unknown>('/instances', {
      operation: 'list instances',
      token
    });
  }

  async callEndpoint(input: {
    method: MetorialMethod;
    path: string;
    token: string;
    instanceId: string;
    query?: Record<string, unknown>;
    body?: unknown;
  }): Promise<MetorialEndpointResponse> {
    let response = await this.request(input.path, {
      operation: `${input.method.toUpperCase()} ${input.path}`,
      method: input.method,
      token: input.token,
      instanceId: input.instanceId,
      query: input.query,
      body: input.body
    });
    let contentType = response.headers.get('content-type') ?? undefined;
    let buffer = await readResponseBuffer(response);

    if (!response.ok) {
      throw metorialHttpError({
        operation: `${input.method.toUpperCase()} ${input.path}`,
        status: response.status,
        statusText: response.statusText,
        body: buffer.toString('utf8'),
        contentType
      });
    }

    let base = {
      status: response.status,
      statusText: response.statusText,
      contentType,
      size: buffer.byteLength
    };

    if (buffer.byteLength === 0 || response.status === 204) {
      return { ...base, kind: 'empty' };
    }

    if (isJsonContentType(contentType)) {
      try {
        return {
          ...base,
          kind: 'json',
          data: JSON.parse(buffer.toString('utf8')) as unknown
        };
      } catch (error) {
        throw metorialApiError(
          error,
          `${input.method.toUpperCase()} ${input.path} JSON parsing`
        );
      }
    }

    if (isTextContentType(contentType)) {
      return {
        ...base,
        kind: 'text',
        text: buffer.toString('utf8')
      };
    }

    return {
      ...base,
      kind: 'binary',
      base64: buffer.toString('base64')
    };
  }
}
