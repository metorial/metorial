import { createAxios, pickDefined } from 'slates';
import { parseRemoteResponse } from './money';
import {
  apiError,
  fail,
  id,
  integer,
  isRecord,
  publicData,
  type RecordData,
  record,
  required
} from './validation';
export type Environment = 'production' | 'sandbox';
export type AuthOutput = {
  token: string;
  environment: Environment;
  refreshToken?: string;
  expiresAt?: string;
  companyId?: string;
  userId?: string;
};
export function baseUrl(environment: unknown): string {
  if (environment !== 'production' && environment !== 'sandbox')
    fail(
      'Remote environment must be production or sandbox. Reconnect with the correct authentication method.'
    );
  return environment === 'sandbox'
    ? 'https://gateway.remote-sandbox.com'
    : 'https://gateway.remote.com';
}
export class Client {
  private http: ReturnType<typeof createAxios>;
  readonly url: string;
  private secrets: string[];
  constructor(auth: AuthOutput) {
    let token = required(auth.token, 'Remote bearer token');
    this.url = baseUrl(auth.environment ?? 'production');
    if (
      (token.startsWith('ra_test_') && auth.environment !== 'sandbox') ||
      (token.startsWith('ra_live_') && auth.environment !== 'production')
    )
      fail(
        'Remote API token prefix does not match the selected environment. Reconnect using the matching token method.'
      );
    this.secrets = [token, auth.refreshToken ?? ''];
    this.http = createAxios({
      baseURL: `${this.url}/v1`,
      timeout: 30000,
      maxRedirects: 0,
      transformResponse: [body => body],
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }
  async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: RecordData,
    params?: RecordData
  ): Promise<unknown> {
    if (!/^\/[a-z][a-z0-9_/-]*$/i.test(path)) fail('The Remote API route is invalid.');
    let value: unknown;
    try {
      value = (
        await this.http.request({
          method,
          url: path,
          data: data ? pickDefined(data) : undefined,
          params: params ? pickDefined(params) : undefined
        })
      ).data;
    } catch (error) {
      apiError(error, `${method.toUpperCase()} ${path}`, this.secrets);
    }
    // Validate raw monetary tokens after transport error adaptation so precision
    // failures remain actionable ServiceErrors instead of generic HTTP failures.
    return publicData(parseRemoteResponse(value), this.secrets);
  }
  async get(path: string, params?: RecordData) {
    return this.request('get', path, undefined, params);
  }
  async post(path: string, data?: RecordData) {
    return this.request('post', path, data);
  }
  async patch(path: string, data: RecordData) {
    return this.request('patch', path, data);
  }
  async remove(path: string) {
    return this.request('delete', path);
  }
  async getIdentity() {
    let result = record(await this.get('/identity/current'), 'identity response');
    let identity = record(result.data, 'identity');
    if (isRecord(identity.company)) {
      id(identity.company.id, 'Authenticated company ID');
      required(identity.company.name, 'Authenticated company name');
      let user = record(identity.user, 'authorizing user');
      id(user.id, 'Authenticated user ID');
      if (identity.client_id !== undefined || identity.integration !== undefined) {
        required(identity.client_id, 'OAuth client ID');
        let integration = record(identity.integration, 'OAuth integration');
        required(integration.name, 'OAuth integration name');
        required(integration.display_name, 'OAuth integration display name');
        return { identity, mode: 'company_oauth' as const };
      }
      return { identity, mode: 'customer_token' as const };
    }
    if (
      typeof identity.client_id === 'string' &&
      identity.client_id &&
      isRecord(identity.integration) &&
      typeof identity.integration.name === 'string' &&
      typeof identity.integration.display_name === 'string'
    )
      return { identity, mode: 'partner_client_credentials' as const };
    fail(
      'Remote returned an unknown token identity. Reconnect with a documented company token or customer API token.'
    );
  }
  async employment(value: unknown) {
    let employmentId = id(value, 'Employment ID');
    return single(await this.get(`/employments/${employmentId}`), 'employment', employmentId);
  }
  async entity(path: string, key: string, value: unknown) {
    let resourceId = id(value);
    return single(await this.get(`${path}/${resourceId}`), key, resourceId);
  }
}
export function single(value: unknown, key: string, expectedId?: string): RecordData {
  let root = record(value, `${key} response`);
  let data = isRecord(root.data) ? root.data : root;
  let candidate = isRecord(data[key]) ? data[key] : data;
  let result = record(candidate, key);
  if (typeof result.id !== 'string' && typeof result.offboarding_id !== 'string')
    fail(`Remote did not return a ${key} resource ID.`);
  if (expectedId && result.id !== expectedId && result.offboarding_id !== expectedId)
    fail(`Remote returned a different ${key} ID. Refresh the resource before continuing.`);
  return result;
}
export function collection(value: unknown, key: string): RecordData[] {
  let root = record(value, `${key} response`);
  let data = isRecord(root.data) ? root.data : root;
  let candidate = Array.isArray(root.data) ? root.data : data[key];
  if (!Array.isArray(candidate))
    fail(
      `Remote did not return a ${key} list. The response format or endpoint permissions may have changed.`
    );
  return candidate.map(item => record(item, `${key} entry`));
}
export function pageParams(input: { page?: number; pageSize?: number }): RecordData {
  return pickDefined({
    page: input.page === undefined ? undefined : integer(input.page, 'Page', 1),
    page_size:
      input.pageSize === undefined ? undefined : integer(input.pageSize, 'Page size', 1, 100)
  });
}
export function pageOutput(value: unknown) {
  let root = record(value, 'list response');
  let data = isRecord(root.data) ? root.data : root;
  let currentPage =
    data.current_page === undefined
      ? undefined
      : integer(data.current_page, 'Remote current page', 1);
  let totalPages =
    data.total_pages === undefined
      ? undefined
      : integer(data.total_pages, 'Remote total pages');
  let totalCount =
    data.total_count === undefined
      ? undefined
      : integer(data.total_count, 'Remote total count');
  return pickDefined({
    currentPage,
    totalPages,
    totalCount,
    hasMore:
      currentPage !== undefined && totalPages !== undefined
        ? currentPage < totalPages
        : undefined
  });
}
