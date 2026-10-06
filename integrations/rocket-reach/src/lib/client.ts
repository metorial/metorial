import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import {
  accountSchema,
  parseCompany,
  parsePerson,
  parseResponse,
  searchResponse
} from './responses';

export const API_ORIGIN = 'https://api.rocketreach.co';
const retrySeconds = (headers: unknown): number | undefined => {
  const header = getResponseHeaderValue(headers, 'retry-after');
  if (!header || !/^\d+$/.test(header.trim())) return undefined;
  const seconds = Number(header);
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 86400
    ? seconds
    : undefined;
};
export const rocketReachError = (error: unknown) => {
  const response =
    isApiErrorRecord(error) && isApiErrorRecord(error.response) ? error.response : undefined;
  const data =
    isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  const baggage = data && isApiErrorRecord(data.baggage) ? data.baggage : undefined;
  const supplied = baggage?.safeRetryAfterSeconds;
  const retryAfterSeconds =
    retrySeconds(response?.headers) ??
    (typeof supplied === 'number' &&
    Number.isSafeInteger(supplied) &&
    supplied >= 0 &&
    supplied <= 86400
      ? supplied
      : undefined);
  const upstreamStatus = getApiErrorStatus(error) ?? data?.upstreamStatus;
  const status =
    typeof upstreamStatus === 'number' &&
    Number.isInteger(upstreamStatus) &&
    upstreamStatus >= 100 &&
    upstreamStatus <= 599
      ? upstreamStatus
      : undefined;
  // Only the safe HTTP status reaches the builder: an existing ServiceError may
  // otherwise bypass its parent override and retain credential-bearing context.
  const failure = buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'RocketReach',
      reason: 'api_error',
      formatMessage: ({ status }) =>
        `RocketReach request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. Check your API key, plan access and available credits. ${retryAfterSeconds === undefined ? 'For rate limits, wait before retrying.' : `The provider recommends waiting ${retryAfterSeconds} seconds before retrying.`} Do not repeat enrichment to poll an existing lookup.`,
      parent: {}
    }
  );
  if (retryAfterSeconds !== undefined) failure.data.retryAfterSeconds = retryAfterSeconds;
  return failure;
};
const hasControlCharacters = (value: string): boolean =>
  Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
export const apiKey = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    /\s/.test(value.trim()) ||
    hasControlCharacters(value.trim())
  )
    throw createApiServiceError('Reconnect RocketReach with a valid API key.');
  return value.trim();
};
export const profileId = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 1)
    throw createApiServiceError(
      'Profile IDs must be positive safe integers from Search People or Lookup Person.'
    );
  return value;
};
const optionalText = (value: string | undefined, label: string) => {
  if (value !== undefined && (!value.trim() || hasControlCharacters(value)))
    throw createApiServiceError(`${label} must be nonempty text without control characters.`);
  return value?.trim();
};
export const sanitizeResponse = (value: unknown, token: string): unknown => {
  const redacted = new AuthConfigSecretRedactor({ token }).redactEmbedded(value);
  const project = (item: unknown): unknown => {
    if (typeof item === 'string')
      return item
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`, '[redacted]')
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`, '[redacted]');
    if (Array.isArray(item)) return item.map(project);
    if (isApiErrorRecord(item))
      return Object.fromEntries(
        Object.entries(item)
          .filter(
            ([key]) =>
              !key.includes(token) &&
              !/^(api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|authorization|client[_-]?secret)$/i.test(
                key
              )
          )
          .map(([key, child]) => [key, project(child)])
      );
    return item;
  };
  return project(redacted);
};
interface SearchParams {
  query: Record<string, string[]>;
  start?: number;
  pageSize?: number;
  orderBy?: string;
}
export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  constructor(config: { token: string }) {
    this.token = apiKey(config.token);
    this.axios = createAuthenticatedAxios({
      baseURL: `${API_ORIGIN}/api/v2`,
      authHeader: { name: 'Api-Key', value: this.token },
      timeout: 30000,
      maxRedirects: 0,
      errorMapping: {
        mapAxiosError: error => ({
          baggage: { safeRetryAfterSeconds: retrySeconds(error.response?.headers) }
        })
      },
      errorAdapter: rocketReachError
    });
  }
  private async request(method: 'GET' | 'POST', path: string, data?: unknown) {
    const response = await this.axios.request({ method, url: path, data });
    const body = sanitizeResponse(response.data, this.token);
    if (isApiErrorRecord(body) && (body.error !== undefined || body.errors !== undefined))
      throw createApiServiceError(
        'RocketReach reported an API failure. Check your account and credits before retrying.',
        { reason: 'api_error' }
      );
    return body;
  }
  async getAccount() {
    return parseResponse(accountSchema, await this.request('GET', '/account'));
  }
  private searchBody(params: SearchParams) {
    const start = params.start ?? 1;
    const pageSize = params.pageSize ?? 10;
    if (!Number.isSafeInteger(start) || start < 1 || start > 10000)
      throw createApiServiceError('Search start must be an integer from 1 to 10000.');
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw createApiServiceError('Search pageSize must be an integer from 1 to 100.');
    if (
      params.orderBy !== undefined &&
      !['relevance', 'popularity', 'score'].includes(params.orderBy)
    )
      throw createApiServiceError('Select a supported search ordering.');
    for (const values of Object.values(params.query))
      if (!values.length || values.some(value => !value.trim()))
        throw createApiServiceError('Search filters must contain nonempty values.');
    return pickDefined({
      query: params.query,
      start,
      page_size: pageSize,
      order_by: params.orderBy
    });
  }
  async searchPeople(params: SearchParams) {
    return searchResponse(
      await this.request('POST', '/search', this.searchBody(params)),
      ['profiles'],
      value => parsePerson(value)
    );
  }
  async lookupPerson(params: {
    name?: string;
    currentEmployer?: string;
    linkedinUrl?: string;
    profileId?: number;
    email?: string;
    title?: string;
    webhookId?: number;
  }) {
    const query = pickDefined({
      name: optionalText(params.name, 'Name'),
      current_employer: optionalText(params.currentEmployer, 'Employer'),
      linkedin_url: optionalText(params.linkedinUrl, 'LinkedIn URL'),
      id: params.profileId === undefined ? undefined : profileId(params.profileId),
      email: optionalText(params.email, 'Email'),
      title: optionalText(params.title, 'Title'),
      webhook_id: params.webhookId
    });
    if (
      !(
        query.id ||
        query.linkedin_url ||
        query.email ||
        (query.name && query.current_employer)
      )
    )
      throw createApiServiceError(
        'Provide profileId, linkedinUrl, email, or both name and currentEmployer to identify one person.'
      );
    const encoded = new URLSearchParams(
      Object.entries(query).map(([key, value]): [string, string] => [key, String(value)])
    ).toString();
    return parsePerson(await this.request('GET', `/person/lookup?${encoded}`), true);
  }
  async checkPersonLookupStatus(profileIds: number[]) {
    if (!profileIds.length)
      throw createApiServiceError('Provide at least one existing lookup profile ID.');
    const query = new URLSearchParams();
    for (const id of [...new Set(profileIds)]) query.append('ids', String(profileId(id)));
    const result = await this.request('GET', `/person/checkStatus?${query}`);
    if (!Array.isArray(result))
      throw createApiServiceError(
        'RocketReach returned an invalid lookup-status collection.',
        { reason: 'invalid_response' }
      );
    const profiles = result.map(value => parsePerson(value, true));
    if (
      profiles.some(value => !profileIds.includes(value.id ?? 0)) ||
      new Set(profiles.map(value => value.id)).size !== profiles.length
    )
      throw createApiServiceError(
        'RocketReach returned unrelated or duplicate lookup-status records.',
        { reason: 'invalid_response' }
      );
    return profiles;
  }
  async searchCompanies(params: SearchParams) {
    return searchResponse(
      await this.request('POST', '/searchCompany', this.searchBody(params)),
      ['companies', 'profiles'],
      parseCompany
    );
  }
  async lookupCompany(params: { domain?: string; name?: string; linkedinUrl?: string }) {
    const query = pickDefined({
      domain: optionalText(params.domain, 'Domain'),
      name: optionalText(params.name, 'Name'),
      linkedin_url: optionalText(params.linkedinUrl, 'LinkedIn URL')
    });
    if (!Object.keys(query).length)
      throw createApiServiceError(
        'Provide domain, name or linkedinUrl to identify a company.'
      );
    const encoded = new URLSearchParams(
      Object.entries(query).map(([key, value]): [string, string] => [key, String(value)])
    ).toString();
    return parseCompany(await this.request('GET', `/company/lookup?${encoded}`));
  }
}
