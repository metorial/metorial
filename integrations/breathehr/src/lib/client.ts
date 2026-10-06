import {
  AuthConfigSecretRedactor,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';
import {
  type ApiResult,
  apiError,
  fail,
  paginationFrom,
  parseResponse,
  type Row,
  requireId,
  requireText
} from './response';

export type PaginationParams = { page?: number; perPage?: number };
export type Query = Record<string, string | number | boolean | undefined> & {
  page?: number;
  per_page?: number;
};
export const tokenEnvironment = (token: string): 'production' | 'sandbox' => {
  requireText(token, 'API key');
  if (/^prod-\S+$/.test(token)) return 'production';
  if (/^sandbox-\S+$/.test(token)) return 'sandbox';
  return fail(
    'Use the production key beginning prod- or sandbox key beginning sandbox- from the account API settings.'
  );
};
export class Client {
  private http;
  private origin: string;
  private redactor: AuthConfigSecretRedactor;
  constructor(config: { token: string; environment: string }) {
    if (config.environment !== tokenEnvironment(config.token))
      fail(
        'The API key does not match the selected environment. Select sandbox for a sandbox- key or production for a prod- key.'
      );
    this.origin =
      config.environment === 'sandbox'
        ? 'https://api.sandbox.breathehr.info'
        : 'https://api.breathehr.com';
    this.redactor = new AuthConfigSecretRedactor({ token: config.token });
    this.http = createAuthenticatedAxios({
      baseURL: `${this.origin}/v1`,
      authHeader: { name: 'X-API-KEY', value: config.token },
      timeout: 30000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' },
      transformResponse: [parseResponse]
    });
  }
  async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Row,
    params?: Query,
    paged = false
  ): Promise<ApiResult> {
    const response = await requestAxios<unknown>(
      `${method} request`,
      () =>
        this.http.request({
          method,
          url: path,
          params: params ? pickDefined(params) : undefined,
          ...(body === undefined ? {} : { data: body })
        }),
      apiError
    );
    const reflectedKey = (value: unknown): boolean =>
      Array.isArray(value)
        ? value.some(reflectedKey)
        : isApiErrorRecord(value) &&
          Object.entries(value).some(
            ([key, child]) => this.redactor.redactEmbedded(key) !== key || reflectedKey(child)
          );
    if (
      reflectedKey(response.data) ||
      JSON.stringify(this.redactor.redactEmbedded(response.data)) !==
        JSON.stringify(response.data)
    )
      fail(
        'Breathe HR reflected an API credential in resource data. Review the connection before retrying; a requested write may have completed.'
      );
    if (isApiErrorRecord(response.data) && response.data.error !== undefined)
      fail(
        'Breathe HR returned an error instead of the requested record. Check required fields before retrying; a requested write may have completed.'
      );
    return {
      body: response.data,
      status: response.status,
      ...(paged
        ? {
            pagination: paginationFrom(
              response.headers,
              { page: params?.page, per_page: params?.per_page },
              this.origin,
              path
            )
          }
        : {})
    };
  }
  getAccount() {
    return this.request('GET', '/account');
  }
  list(resource: string, params?: Query, paged = true) {
    return this.request('GET', `/${resource}`, undefined, params, paged);
  }
  get(resource: string, id: string) {
    return this.request(
      'GET',
      `/${resource}/${encodeURIComponent(requireId(id, 'resource ID'))}`
    );
  }
  create(resource: string, root: string, data: Row) {
    return this.request('POST', `/${resource}`, { [root]: pickDefined(data) });
  }
  employeeCreate(resource: string, employeeId: string, root: string, data: Row) {
    return this.request(
      'POST',
      `/employees/${encodeURIComponent(requireId(employeeId, 'employee ID'))}/${resource}`,
      { [root]: pickDefined(data) }
    );
  }
  action(resource: string, id: string, action: string, data?: Row) {
    return this.request(
      'POST',
      `/${resource}/${encodeURIComponent(requireId(id, 'resource ID'))}/${action}`,
      data
    );
  }
  updateClaim(id: string, data: Row) {
    return this.request(
      'PUT',
      `/employee_expense_claims/${encodeURIComponent(requireId(id, 'claim ID'))}`,
      { employee_expense_claims: pickDefined(data) }
    );
  }
  delete(resource: string, id: string) {
    return this.request(
      'DELETE',
      `/${resource}/${encodeURIComponent(requireId(id, 'resource ID'))}`
    );
  }
  department(resource: string, id: string, params?: Query) {
    return this.request(
      'GET',
      `/departments/${encodeURIComponent(requireId(id, 'department ID'))}/${resource}`,
      undefined,
      params,
      true
    );
  }
}
