import {
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { agiledApiError } from './errors';

export let normalizePublicApiBaseUrl = (baseUrl: string) => {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw createApiServiceError('Enter the Agiled API base URL shown in Settings → API.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw createApiServiceError(
      'The Agiled API base URL must be HTTPS without credentials, a query, or a fragment.'
    );
  }
  let path = url.pathname.replace(/\/+$/, '');
  if (path !== '' && path !== '/public/v1') {
    throw createApiServiceError(
      'Use the API origin or the full base URL ending in /public/v1.'
    );
  }
  return `${url.origin}/public/v1`;
};

export class PublicClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(auth: { publicApiToken?: string; publicApiBaseUrl?: string }) {
    if (!auth.publicApiToken?.trim() || !auth.publicApiBaseUrl) {
      throw createApiServiceError('This tool requires a Public API Key connection.', {
        reason: 'agiled_public_auth_required'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: normalizePublicApiBaseUrl(auth.publicApiBaseUrl),
      authHeader: { value: `Bearer ${auth.publicApiToken}` },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      errorAdapter: agiledApiError
    });
  }

  async getCurrentUser(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/me');
    if (!isApiErrorRecord(response.data) || !isApiErrorRecord(response.data.data)) {
      throw createApiServiceError('Agiled returned an invalid token context response.', {
        reason: 'agiled_invalid_response'
      });
    }
    return response.data.data;
  }

  async list(
    resource: 'accounts' | 'time-entries',
    params: Record<string, string | number | undefined>
  ): Promise<{ data: Record<string, unknown>[]; meta?: Record<string, unknown> }> {
    let response = await this.axios.get(`/${resource}`, { params: pickDefined(params) });
    let body: unknown = response.data;
    if (
      !isApiErrorRecord(body) ||
      !Array.isArray(body.data) ||
      !body.data.every(isApiErrorRecord)
    ) {
      throw createApiServiceError('Agiled returned an invalid list response.', {
        reason: 'agiled_invalid_response'
      });
    }
    return { data: body.data, meta: isApiErrorRecord(body.meta) ? body.meta : undefined };
  }
}
