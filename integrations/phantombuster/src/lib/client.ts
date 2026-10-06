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
export type Row = Record<string, unknown>;
export const API_ORIGIN = 'https://api.phantombuster.com';
const secretKey =
  /(?:api[-_]?key|access[-_]?token|refresh[-_]?token|cookie|authorization|password|secret|token|^key$|^auth$|^headers$|proxyUsername|x[-_]?phantombuster[-_]?key|signature)/i;
const hasControl = (value: string) =>
  Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
export const identifier = (value: unknown, label: string): string => {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    !String(value).trim() ||
    !String(value).isWellFormed() ||
    String(value) !== String(value).trim() ||
    /\s/.test(String(value)) ||
    hasControl(String(value)) ||
    (typeof value === 'number' && !Number.isSafeInteger(value))
  )
    throw createApiServiceError(`${label} must be a nonempty provider identifier.`, {
      reason: 'invalid_input'
    });
  return String(value);
};
export const object = (value: unknown, label: string): Row => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`PhantomBuster returned invalid ${label}.`, {
      reason: 'invalid_response'
    });
  return value;
};
export const collection = (value: unknown, label: string, key?: string): Row[] => {
  const items = Array.isArray(value)
    ? value
    : key && isApiErrorRecord(value)
      ? value[key]
      : undefined;
  if (!Array.isArray(items))
    throw createApiServiceError(`PhantomBuster returned an invalid ${label} collection.`, {
      reason: 'invalid_response'
    });
  return items.map(item => object(item, label));
};
export const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
export const number = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
export const optionalId = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : identifier(value, 'Returned ID');
export const matchingId = (value: unknown, expected: string, label: string): string => {
  const id = identifier(value, label);
  if (id !== expected)
    throw createApiServiceError(`PhantomBuster returned an unrelated ${label}.`, {
      reason: 'invalid_response'
    });
  return id;
};
const retryAfter = (headers: unknown) => {
  const value = getResponseHeaderValue(headers, 'retry-after');
  if (!value || !/^\d+$/.test(value)) return undefined;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds <= 86400 ? seconds : undefined;
};
export const phantomBusterError = (error: unknown) => {
  const data =
    isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  const response =
    isApiErrorRecord(error) && isApiErrorRecord(error.response) ? error.response : undefined;
  const baggage = data && isApiErrorRecord(data.baggage) ? data.baggage : undefined;
  const candidate = getApiErrorStatus(error) ?? data?.upstreamStatus;
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  const supplied = number(baggage?.safeRetryAfterSeconds);
  const delay =
    retryAfter(response?.headers) ??
    (supplied !== undefined &&
    Number.isSafeInteger(supplied) &&
    supplied >= 0 &&
    supplied <= 86400
      ? supplied
      : undefined);
  const failure = buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'PhantomBuster',
      reason: 'api_error',
      parent: {},
      formatMessage: () =>
        `PhantomBuster request failed${status === undefined ? '' : ` (HTTP ${status})`}. Check your workspace API key, paid-plan access, resource limits and the requested ID. Do not repeat a launch or save automatically after an uncertain response.${delay === undefined ? '' : ` Wait ${delay} seconds before another request.`}`
    }
  );
  if (delay !== undefined) failure.data.retryAfterSeconds = delay;
  return failure;
};
export const sanitize = (value: unknown, token: string): unknown => {
  const redactor = new AuthConfigSecretRedactor({ token });
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') {
      let result = (redactor.redactEmbedded(item) as string)
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`, '[redacted]')
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`, '[redacted]');
      if (/^\s*[[{]/.test(result)) {
        try {
          return JSON.stringify(visit(JSON.parse(result)));
        } catch {
          /* Console text is not necessarily JSON. */
        }
      }
      result = result
        .replace(/((?:authorization|cookie)["']?\s*[:=]\s*)[^\r\n]*/gi, '$1[redacted]')
        .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/gi, '[redacted]');
      result = result.replace(
        /((?:session[-_]?cookie|cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|authorization|password|secret)["']?\s*[=:]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi,
        '$1[redacted]'
      );
      return result.replace(/https?:\/\/[^\s"'<>]+/gi, link => {
        try {
          const url = new URL(link);
          url.username = '';
          url.password = '';
          for (const key of [...url.searchParams.keys()])
            if (secretKey.test(key)) url.searchParams.delete(key);
          return url.toString();
        } catch {
          return link;
        }
      });
    }
    if (Array.isArray(item)) return item.map(visit);
    if (isApiErrorRecord(item))
      return Object.fromEntries(
        Object.entries(item)
          .filter(([key]) => !secretKey.test(key) && !key.includes(token))
          .map(([key, child]) => [key, visit(child)])
      );
    return item;
  };
  return visit(value);
};
const pageNumber = (value: number | undefined, label: string, minimum: number) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < minimum))
    throw createApiServiceError(`${label} must be an integer of at least ${minimum}.`);
  return value;
};
export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  constructor(config: { token: string }) {
    if (
      !config.token.trim() ||
      !config.token.isWellFormed() ||
      /\s/.test(config.token) ||
      hasControl(config.token)
    )
      throw createApiServiceError('Reconnect PhantomBuster with a valid workspace API key.');
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: `${API_ORIGIN}/api/v2`,
      authHeader: { name: 'X-Phantombuster-Key-1', value: this.token },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      errorMapping: {
        mapAxiosError: error => ({
          baggage: { safeRetryAfterSeconds: retryAfter(error.response?.headers) }
        })
      },
      errorAdapter: phantomBusterError
    });
  }
  private async request(
    method: 'GET' | 'POST',
    path: string,
    data?: unknown,
    params?: Row
  ): Promise<unknown> {
    const response = await this.axios.request({ method, url: path, data, params });
    if (
      isApiErrorRecord(response.data) &&
      (response.data.status === 'error' || response.data.status === 'fail')
    )
      throw createApiServiceError(
        'PhantomBuster rejected the request. Check the inputs, workspace access and resource limits before retrying.',
        { reason: 'api_error' }
      );
    return sanitize(response.data, this.token);
  }
  async fetchAgent(agentId: string) {
    const id = identifier(agentId, 'Phantom ID');
    const result = object(
      await this.request('GET', '/agents/fetch', undefined, { id }),
      'Phantom'
    );
    matchingId(result.id, id, 'Phantom ID');
    return result;
  }
  async fetchAllAgents() {
    return collection(await this.request('GET', '/agents/fetch-all'), 'Phantom');
  }
  async saveAgent(agent: Row) {
    return this.request('POST', '/agents/save', agent);
  }
  async deleteAgent(agentId: string) {
    await this.request('POST', '/agents/delete', { id: identifier(agentId, 'Phantom ID') });
  }
  async launchAgent(agentId: string, argument?: Row) {
    return object(
      await this.request(
        'POST',
        '/agents/launch',
        pickDefined({ id: identifier(agentId, 'Phantom ID'), argument })
      ),
      'launch receipt'
    );
  }
  async stopAgent(agentId: string) {
    await this.request('POST', '/agents/stop', { id: identifier(agentId, 'Phantom ID') });
  }
  async fetchAgentOutput(agentId: string) {
    return object(
      await this.request('GET', '/agents/fetch-output', undefined, {
        id: identifier(agentId, 'Phantom ID')
      }),
      'Phantom output'
    );
  }
  async fetchContainer(containerId: string) {
    const id = identifier(containerId, 'Container ID');
    const result = object(
      await this.request('GET', '/containers/fetch', undefined, { id }),
      'execution'
    );
    matchingId(result.id, id, 'Container ID');
    return result;
  }
  async fetchAllContainers(
    agentId: string,
    limit?: number,
    beforeEndedAt?: string,
    mode?: string
  ) {
    return collection(
      await this.request(
        'GET',
        '/containers/fetch-all',
        undefined,
        pickDefined({
          agentId: identifier(agentId, 'Phantom ID'),
          limit: pageNumber(limit, 'Limit', 1),
          beforeEndedAt,
          mode
        })
      ),
      'execution'
    );
  }
  async fetchContainerOutput(containerId: string) {
    const result = await this.request('GET', '/containers/fetch-output', undefined, {
      id: identifier(containerId, 'Container ID'),
      mode: 'json'
    });
    return result === undefined || result === '' || result === null
      ? undefined
      : object(result, 'console output');
  }
  async fetchContainerResultObject(containerId: string) {
    const result = await this.request('GET', '/containers/fetch-result-object', undefined, {
      id: identifier(containerId, 'Container ID')
    });
    if (result === undefined || result === '' || result === null) return undefined;
    return object(result, 'execution result').resultObject;
  }
  async fetchOrg() {
    return object(await this.request('GET', '/orgs/fetch'), 'workspace');
  }
  async fetchAllLists() {
    return collection(await this.request('GET', '/org-storage/lists/fetch-all'), 'lead list');
  }
  async fetchList(listId: string) {
    const id = identifier(listId, 'List ID');
    const result = object(
      await this.request('GET', '/org-storage/lists/fetch', undefined, { id }),
      'lead list'
    );
    matchingId(result.id, id, 'List ID');
    return result;
  }
  async saveList(list: Row) {
    return object(
      await this.request('POST', '/org-storage/lists/save', list),
      'saved lead list'
    );
  }
  async deleteList(listId: string) {
    await this.request('POST', '/org-storage/lists/delete', {
      id: identifier(listId, 'List ID')
    });
  }
  async fetchLeadsByList(
    listId: string,
    options?: { limit?: number; offset?: number; paginationOptions?: Row }
  ) {
    const paginationOptions = {
      ...options?.paginationOptions,
      ...pickDefined({
        limit: pageNumber(options?.limit, 'Limit', 1),
        offset: pageNumber(options?.offset, 'Offset', 0)
      })
    };
    return this.request(
      'POST',
      `/org-storage/leads/by-list/${encodeURIComponent(identifier(listId, 'List ID'))}`,
      Object.keys(paginationOptions).length ? { paginationOptions } : {}
    );
  }
  async saveLead(lead: Row) {
    return this.request('POST', '/org-storage/leads/save', lead);
  }
  async saveLeadsMany(leads: Row[]) {
    return this.request('POST', '/org-storage/leads/save-many', { leads });
  }
  async deleteLeadsMany(leadIds: string[]) {
    return this.request('POST', '/org-storage/leads/delete-many', {
      ids: leadIds.map(id => identifier(id, 'Lead ID'))
    });
  }
  async fetchScript(scriptId: string, branch?: string) {
    return object(
      await this.request(
        'GET',
        '/scripts/fetch',
        undefined,
        pickDefined({ id: identifier(scriptId, 'Script ID'), branch })
      ),
      'script'
    );
  }
}
