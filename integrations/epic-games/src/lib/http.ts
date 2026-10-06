import { createApiServiceError, createAuthenticatedAxios, requestAxios } from 'slates';
import { epicError, protect } from './validation';
export class EpicHttp {
  private http;
  constructor(
    private secrets: string[],
    authValue?: string
  ) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.epicgames.dev',
      authHeader: authValue ? { value: authValue } : undefined,
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 4 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
      paramsSerializer: { indexes: null },
      errorMapping: { extractResponseData: response => ({ upstreamStatus: response.status }) }
    });
  }
  async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options: {
      params?: Record<string, unknown>;
      data?: unknown;
      statuses?: number[];
      tokenResponse?: boolean;
      confidentialBody?: boolean;
      headers?: Record<string, string>;
    } = {}
  ) {
    const write = method !== 'GET' && !options.confidentialBody && !options.tokenResponse;
    protect(
      {
        url,
        params: options.params,
        ...(options.confidentialBody ? {} : { data: options.data })
      },
      this.secrets
    );
    const response = await requestAxios(
      'request',
      () =>
        this.http.request<unknown>({
          method,
          url,
          params: options.params,
          data: options.data,
          headers: options.headers
        }),
      error => epicError(error, write)
    );
    let inspection = response.data;
    if (
      options.tokenResponse &&
      inspection &&
      typeof inspection === 'object' &&
      !Array.isArray(inspection)
    )
      inspection = Object.fromEntries(
        Object.entries(inspection).filter(
          ([key]) => !['access_token', 'refresh_token', 'id_token'].includes(key)
        )
      );
    try {
      protect(
        { data: inspection, headers: response.headers, statusText: response.statusText },
        this.secrets
      );
    } catch (error) {
      const safe = epicError(error);
      safe.data.outcomeUncertain = write;
      throw safe;
    }
    if (!(options.statuses ?? [200]).includes(response.status))
      throw createApiServiceError(
        'Epic Games returned an unexpected response status. Reconcile changed state before retrying.',
        { upstreamStatus: response.status }
      );
    return response;
  }
}
