import {
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';
import { apiError } from './errors';

export const API_URL = 'https://api.sixtyfour.ai';

export class Client {
  private http;
  constructor(auth: { token: string }) {
    if (!auth.token.trim() || /[\r\n\0]/.test(auth.token)) {
      throw createApiServiceError('Provide a valid Sixtyfour API key.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: API_URL,
      authHeader: { name: 'x-api-key', value: auth.token },
      contentType: false,
      timeout: 60_000,
      maxRedirects: 0
    });
  }

  private path(path: string) {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n\0?#]/.test(path)) {
      throw createApiServiceError('Provide a valid API resource path.');
    }
    return path;
  }

  get<T = Record<string, unknown>>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    return requestAxiosData(
      'read resource',
      () => this.http.get<T>(this.path(path), { params: pickDefined(params ?? {}) }),
      apiError
    );
  }

  post<T = Record<string, unknown>>(path: string, data?: Record<string, unknown>): Promise<T> {
    return requestAxiosData(
      'submit request',
      () =>
        this.http.post<T>(this.path(path), pickDefined(data ?? {}), {
          headers: { 'Content-Type': 'application/json' }
        }),
      apiError
    );
  }

  postForm<T = Record<string, unknown>>(path: string, data: FormData): Promise<T> {
    return requestAxiosData(
      'submit file',
      () => this.http.post<T>(this.path(path), data),
      apiError
    );
  }
}
