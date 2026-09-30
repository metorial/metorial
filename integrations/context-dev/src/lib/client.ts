import { createAuthenticatedAxios, requestAxiosData } from 'slates';
import { contextApiError } from './errors';

export type ApiRecord = Record<string, any>;
export interface ContextRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

// Context uses deep-object syntax for nested query options and comma-separated arrays.
export const serializeQuery = (params: Record<string, unknown>) => {
  const query = new URLSearchParams();
  const append = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (value === null) {
      query.append(key, 'null');
      return;
    }
    if (Array.isArray(value)) {
      query.append(key, value.join(','));
      return;
    }
    if (typeof value === 'object') {
      for (const [child, entry] of Object.entries(value)) append(`${key}[${child}]`, entry);
      return;
    }
    query.append(key, String(value));
  };
  for (const [key, value] of Object.entries(params)) append(key, value);
  return query.toString();
};

export class ContextClient {
  private readonly http;
  constructor(token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.context.dev/v1',
      authHeader: { value: `Bearer ${token}` },
      timeout: 315_000,
      paramsSerializer: { serialize: serializeQuery },
      maxBodyLength: 55 * 1024 * 1024
    });
  }
  request<T = ApiRecord>(operation: string, request: ContextRequest): Promise<T> {
    return requestAxiosData<T>(
      operation,
      () =>
        this.http.request<T>({
          method: request.method,
          url: request.path,
          params: request.query,
          data: request.body,
          headers: request.headers,
          timeout: request.timeoutMs ?? 315_000
        }),
      contextApiError
    );
  }
}

export const pathId = (value: string) => encodeURIComponent(value);
