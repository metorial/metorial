import { isIP } from 'node:net';
import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  requestAxios
} from 'slates';

export interface ClientConfig {
  token: string;
  sandbox?: boolean;
}
export type RecordData = Record<string, any>;
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export const record = (value: unknown): RecordData => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(
      'The API returned an unexpected response object. Try again or contact support.',
      { reason: 'invalid_response' }
    );
  return value;
};
export const records = (value: unknown): RecordData[] => {
  if (!Array.isArray(value))
    throw createApiServiceError(
      'The API returned an unexpected response list. Try again or contact support.',
      { reason: 'invalid_response' }
    );
  return value.map(record);
};
export const nonempty = (value: string, label: string) => {
  if (!value.trim()) throw invalid(`${label} must not be blank.`);
  return value;
};
export const validateToken = (token: string) => {
  if (!token.trim() || /[\r\n]/.test(token))
    throw invalid(
      'Provide a nonempty API key without line breaks from the People Data Labs dashboard.'
    );
  return token;
};
export const apiError = (error: unknown, operation = 'API request') => {
  const preserved =
    isApiErrorRecord(error) && isApiErrorRecord(error.data)
      ? error.data.upstreamStatus
      : undefined;
  const rawStatus = getApiErrorStatus(error) ?? preserved;
  const status =
    typeof rawStatus === 'number' &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 100 &&
    rawStatus <= 599
      ? rawStatus
      : typeof rawStatus === 'string' && /^[1-5]\d{2}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  const advice =
    status === 402
      ? 'The account has exhausted its credits. Check the product credit balance before retrying.'
      : status === 401
        ? 'Check the configured API key in the People Data Labs dashboard.'
        : status === 403
          ? 'Check product and field-bundle access for this API key.'
          : status === 429
            ? 'The rate limit was reached. Wait before retrying; do not repeat a billable request automatically.'
            : status === 404
              ? 'No record matched the request.'
              : 'Check the inputs and product access before retrying. A timed-out request may already have consumed credits.';
  // Reconstruct status rather than passing a transport/ServiceError graph to the shared builder.
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'People Data Labs',
    reason: 'upstream_error',
    operation,
    extractMessage: () => advice,
    parent: {}
  });
};
const sandboxPaths = new Set([
  '/person/enrich',
  '/person/search',
  '/person/identify',
  '/person/bulk',
  '/company/enrich',
  '/company/search'
]);
const integer = (value: number | undefined, label: string, min: number, max: number) => {
  if (value !== undefined && (!Number.isInteger(value) || value < min || value > max))
    throw invalid(`${label} must be an integer between ${min} and ${max}.`);
};
const has = (params: RecordData, keys: string[]) =>
  keys.some(key => {
    const value = params[key];
    return typeof value === 'string'
      ? Boolean(value.trim())
      : Array.isArray(value) && value.some(v => typeof v === 'string' && v.trim());
  });
const validatePerson = (params: RecordData, identify = false) => {
  const name =
    has(params, ['name']) || (has(params, ['first_name']) && has(params, ['last_name']));
  const direct = has(params, ['profile', 'email', 'phone', 'email_hash', 'lid', 'pdl_id']);
  const context = has(params, [
    'company',
    'school',
    'location',
    'street_address',
    'locality',
    'region',
    'country',
    'postal_code',
    'birth_date'
  ]);
  if (
    !(
      direct ||
      (identify
        ? name ||
          has(params, [
            'company',
            'school',
            'location',
            'street_address',
            'locality',
            'region',
            'postal_code'
          ])
        : name && context)
    )
  )
    throw invalid(
      identify
        ? 'Provide a name, profile, email, phone, company, school, or supported location attribute to identify people.'
        : 'Provide a profile, email, phone, or a full name together with company, school, location, or birth-date context.'
    );
  integer(params.min_likelihood, 'Minimum likelihood', 0, 10);
};
const validateCompany = (params: RecordData) => {
  if (!has(params, ['name', 'website', 'profile', 'ticker', 'pdl_id']))
    throw invalid('Provide a company name, website, LinkedIn URL, or ticker.');
};
export interface SearchParams {
  query?: string;
  sql?: string;
  size?: number;
  scroll_token?: string;
  dataset?: string;
  titlecase?: boolean;
}
const searchBody = (params: SearchParams) => {
  const sql = params.sql?.trim(),
    query = params.query?.trim();
  if (Boolean(sql) === Boolean(query))
    throw invalid(
      'Provide exactly one SQL query or Elasticsearch JSON query, including when using a scroll token.'
    );
  integer(params.size, 'Page size', 1, 100);
  const body: RecordData = {};
  if (sql) body.sql = params.sql;
  else {
    try {
      body.query = JSON.parse(query!);
    } catch {
      throw invalid('The Elasticsearch query must be a valid JSON object.');
    }
    if (!isApiErrorRecord(body.query))
      throw invalid('The Elasticsearch query must be a JSON object.');
  }
  if (params.size !== undefined) body.size = params.size;
  if (params.scroll_token !== undefined)
    body.scroll_token = nonempty(params.scroll_token, 'Scroll token');
  if (params.dataset !== undefined) body.dataset = nonempty(params.dataset, 'Dataset');
  if (params.titlecase !== undefined) body.titlecase = params.titlecase;
  return body;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private sandbox: boolean;
  creditsReported: number | null = null;
  private redactor: AuthConfigSecretRedactor;
  constructor(config: ClientConfig) {
    this.sandbox = Boolean(config.sandbox);
    this.redactor = new AuthConfigSecretRedactor({ token: validateToken(config.token) });
    this.axios = createAuthenticatedAxios({
      baseURL: this.sandbox
        ? 'https://sandbox.api.peopledatalabs.com/v5'
        : 'https://api.peopledatalabs.com/v5',
      authHeader: { name: 'X-Api-Key', value: config.token },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: status => status === 200 || status === 404,
      paramsSerializer: { indexes: null }
    });
  }
  private sanitize(value: unknown): any {
    if (typeof value === 'string')
      return this.redactor
        .redactEmbedded(value)
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`, '[redacted]')
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`, '[redacted]');
    if (Array.isArray(value)) return value.map(item => this.sanitize(item));
    if (isApiErrorRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [this.sanitize(key), this.sanitize(item)])
      );
    return value;
  }
  private async request(path: string, params: RecordData, post = false): Promise<any> {
    if (this.sandbox && !sandboxPaths.has(path))
      throw invalid(
        'This operation has no documented sandbox endpoint. Use a production configuration only when product credits and request history effects are authorized.'
      );
    const response = await requestAxios(
      'API request',
      () => (post ? this.axios.post(path, params) : this.axios.get(path, { params })),
      apiError
    );
    const creditHeader = getResponseHeaderValue(response.headers, 'x-call-credits-spent');
    const credits =
      creditHeader === undefined || !String(creditHeader).trim()
        ? Number.NaN
        : Number(creditHeader);
    this.creditsReported = Number.isFinite(credits) && credits >= 0 ? credits : null;
    const data = this.sanitize(response.data);
    if (response.status === 404)
      return { status: 404, data: {}, matches: [], total: 0, scroll_token: null };
    if (!Array.isArray(data)) {
      const body = record(data);
      if (body.status !== undefined) {
        if (!Number.isInteger(body.status) || body.status < 100 || body.status > 599)
          throw createApiServiceError(
            'The API returned an invalid response status. Completion and billing are unconfirmed; do not repeat the request automatically.',
            { reason: 'invalid_response' }
          );
        if (body.status !== 200) throw apiError({ response: { status: body.status } });
      }
    }
    return data;
  }
  async enrichPerson(params: RecordData) {
    validatePerson(params);
    return record(await this.request('/person/enrich', params));
  }
  async bulkEnrichPerson(requests: { params: RecordData }[]) {
    integer(requests.length, 'Batch size', 1, 100);
    for (const entry of requests) validatePerson(entry.params);
    return records(await this.request('/person/bulk', { requests }, true));
  }
  async searchPerson(params: SearchParams) {
    const result = record(await this.request('/person/search', searchBody(params), true));
    result.data = result.status === 404 ? [] : records(result.data);
    if (
      typeof result.total !== 'number' ||
      !Number.isFinite(result.total) ||
      result.total < 0 ||
      (result.scroll_token !== undefined &&
        result.scroll_token !== null &&
        typeof result.scroll_token !== 'string')
    )
      throw createApiServiceError(
        'The API returned invalid search pagination metadata. Do not repeat a billable page automatically.',
        { reason: 'invalid_response' }
      );
    return result;
  }
  async identifyPerson(params: RecordData) {
    validatePerson(params, true);
    const result = record(await this.request('/person/identify', params));
    result.matches = records(result.matches);
    for (const match of result.matches) record(match.data);
    return result;
  }
  async retrievePerson(personId: string, params: RecordData = {}) {
    return record(
      await this.request(
        `/person/retrieve/${encodeURIComponent(nonempty(personId, 'Person ID'))}`,
        params
      )
    );
  }
  async enrichCompany(params: RecordData) {
    validateCompany(params);
    return record(await this.request('/company/enrich', params));
  }
  async bulkEnrichCompany(requests: { params: RecordData }[]) {
    integer(requests.length, 'Batch size', 1, 100);
    for (const entry of requests) validateCompany(entry.params);
    return records(await this.request('/company/enrich/bulk', { requests }, true));
  }
  async searchCompany(params: SearchParams) {
    const result = record(await this.request('/company/search', searchBody(params), true));
    result.data = result.status === 404 ? [] : records(result.data);
    if (
      typeof result.total !== 'number' ||
      !Number.isFinite(result.total) ||
      result.total < 0 ||
      (result.scroll_token !== undefined &&
        result.scroll_token !== null &&
        typeof result.scroll_token !== 'string')
    )
      throw createApiServiceError(
        'The API returned invalid search pagination metadata. Do not repeat a billable page automatically.',
        { reason: 'invalid_response' }
      );
    return result;
  }
  async enrichIp(ip: string, params: RecordData = {}) {
    if (!isIP(ip)) throw invalid('Provide a valid IPv4 or IPv6 address.');
    return record(await this.request('/ip/enrich', { ...params, ip }));
  }
  async enrichJobTitle(jobTitle: string, params: RecordData = {}) {
    return record(
      await this.request('/job_title/enrich', {
        ...params,
        job_title: nonempty(jobTitle, 'Job title')
      })
    );
  }
  async cleanCompany(name: string) {
    return record(
      await this.request('/company/clean', { name: nonempty(name, 'Company name') })
    );
  }
  async cleanLocation(location: string) {
    return record(
      await this.request('/location/clean', { location: nonempty(location, 'Location') })
    );
  }
  async cleanSchool(name: string) {
    return record(
      await this.request('/school/clean', { name: nonempty(name, 'School name') })
    );
  }
  async autocomplete(params: {
    field: string;
    text?: string;
    size?: number;
    titlecase?: boolean;
  }) {
    nonempty(params.field, 'Autocomplete field');
    if (params.field === 'locality')
      throw invalid(
        'locality is not a documented Autocomplete field. Use location_name or all_location for location suggestions.'
      );
    integer(params.size, 'Suggestion count', 1, 100);
    const result = record(await this.request('/autocomplete', params));
    result.data = result.status === 404 ? [] : records(result.data);
    return result;
  }
}
