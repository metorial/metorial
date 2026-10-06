import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';

export const API_ORIGIN = 'https://api.outreach.io';
export const JSON_API_HEADERS = {
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json'
};
export const outreachError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Outreach',
    reason: 'api_error',
    extractStatus: () => {
      const status = getApiErrorStatus(error);
      return typeof status === 'number' ? status : undefined;
    },
    formatMessage: ({ status }) =>
      `Outreach request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. Check authorization, scope and user governance. For rate limits or maintenance, wait before retrying; read back uncertain writes first.`,
    parent: {}
  });
export const apiId = (value: unknown, label = 'Resource ID'): number => {
  const id =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^[1-9]\d*$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(id) || id < 1)
    throw createApiServiceError(`${label} must be a positive integer ID.`);
  return id;
};
export const sanitizeResponse = (value: unknown, token: string): unknown => {
  if (typeof value === 'string') return token ? value.split(token).join('[redacted]') : value;
  if (Array.isArray(value)) return value.map(item => sanitizeResponse(item, token));
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !/^(access_?token|refresh_?token|password|client_?secret|authorization)$/i.test(
              key
            )
        )
        .map(([key, item]) => [key, sanitizeResponse(item, token)])
    );
  return value;
};
export interface ResourceReference {
  id: string;
  type: string;
}
export interface JsonApiResource extends ResourceReference {
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: ResourceReference | ResourceReference[] | null }>;
}
export interface PaginatedResult<T> {
  records: T[];
  hasMore: boolean;
  nextPageOffset?: number;
  nextPageAfter?: string;
  totalCount: number | null;
}
const resourceTypes: Record<string, string> = {
  prospects: 'prospect',
  accounts: 'account',
  sequences: 'sequence',
  sequenceStates: 'sequenceState',
  sequenceSteps: 'sequenceStep',
  tasks: 'task',
  opportunities: 'opportunity',
  templates: 'template',
  snippets: 'snippet',
  calls: 'call',
  users: 'user',
  mailings: 'mailing',
  mailboxes: 'mailbox',
  callDispositions: 'callDisposition',
  callPurposes: 'callPurpose',
  stages: 'stage',
  opportunityStages: 'opportunityStage'
};
const typeFor = (collection: string) => {
  const type = resourceTypes[collection];
  if (!type) throw createApiServiceError('Unsupported Outreach resource.');
  return type;
};
const reference = (value: unknown): ResourceReference => {
  if (!isApiErrorRecord(value) || typeof value.type !== 'string' || !value.type)
    throw createApiServiceError('Outreach returned an invalid resource reference.');
  return { id: String(apiId(value.id, 'Returned resource ID')), type: value.type };
};
const resource = (value: unknown, type: string, expectedId?: string): JsonApiResource => {
  const ref = reference(value);
  if (
    !isApiErrorRecord(value) ||
    ref.type !== type ||
    (expectedId !== undefined && ref.id !== String(apiId(expectedId))) ||
    (value.attributes !== undefined && !isApiErrorRecord(value.attributes))
  )
    throw createApiServiceError(
      'Outreach returned an unexpected resource. Read back uncertain writes before retrying.'
    );
  const relationships: NonNullable<JsonApiResource['relationships']> = {};
  if (value.relationships !== undefined) {
    if (!isApiErrorRecord(value.relationships))
      throw createApiServiceError('Outreach returned invalid relationships.');
    for (const [key, relation] of Object.entries(value.relationships)) {
      if (!isApiErrorRecord(relation))
        throw createApiServiceError('Outreach returned an invalid relationship.');
      if (relation.data === undefined) continue; // Related collections may have links without embedded data.
      relationships[key] = {
        data:
          relation.data === null
            ? null
            : Array.isArray(relation.data)
              ? relation.data.map(reference)
              : reference(relation.data)
      };
    }
  }
  return {
    ...ref,
    attributes: isApiErrorRecord(value.attributes) ? value.attributes : {},
    relationships
  };
};

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private config: { token: string }) {
    if (
      typeof config.token !== 'string' ||
      !config.token.trim() ||
      /[\r\n]/.test(config.token)
    )
      throw createApiServiceError('Reconnect Outreach with a valid OAuth token.');
    this.api = createAuthenticatedAxios({
      baseURL: `${API_ORIGIN}/api/v2`,
      headers: { ...JSON_API_HEADERS, Authorization: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: outreachError
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown
  ) {
    const response = await this.api.request({ method, url: path, data });
    const body = sanitizeResponse(response.data, this.config.token);
    if (isApiErrorRecord(body) && (body.errors !== undefined || body.error !== undefined))
      throw createApiServiceError(
        'Outreach reported an API failure; read back uncertain writes before retrying.'
      );
    return { body, status: response.status };
  }
  async getResource(
    collection: string,
    id: string,
    params?: Record<string, string>
  ): Promise<JsonApiResource> {
    typeFor(collection);
    const query = new URLSearchParams(params).toString();
    const result = await this.request(
      'GET',
      `/${collection}/${apiId(id)}${query ? `?${query}` : ''}`
    );
    if (!isApiErrorRecord(result.body))
      throw createApiServiceError('Outreach returned an invalid response.');
    return resource(result.body.data, typeFor(collection), id);
  }
  async listResources(
    collection: string,
    params: Record<string, string> = {}
  ): Promise<PaginatedResult<JsonApiResource>> {
    const type = typeFor(collection);
    params = { ...params };
    if (params['page[after]'] !== undefined && params['page[offset]'] !== undefined)
      throw createApiServiceError('Use pageAfter or pageOffset, not both.');
    if (params['page[offset]'] === undefined) {
      params['page[size]'] = params['page[limit]'] ?? '50';
      params = Object.fromEntries(
        Object.entries(params).filter(([key]) => key !== 'page[limit]')
      );
    }
    for (const [key, value] of Object.entries(params)) {
      if (
        (key === 'page[limit]' || key === 'page[size]') &&
        (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1000)
      )
        throw createApiServiceError('Page size must be an integer from 1 to 1000.');
      if (
        key === 'page[offset]' &&
        (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 10000)
      )
        throw createApiServiceError(
          'Legacy page offset must be an integer from 0 to 10000; use cursor pagination for larger collections.'
        );
      if (key === 'page[after]' && (!value || value.length > 8192 || /[\r\n]/.test(value)))
        throw createApiServiceError('Provide the returned nextPageAfter cursor.');
      if (/^filter\[.+\]\[id\]$/.test(key)) apiId(value, 'Filter ID');
      if (key === 'sort' && !/^-?[a-zA-Z][a-zA-Z0-9]*(,-?[a-zA-Z][a-zA-Z0-9]*)*$/.test(value))
        throw createApiServiceError(
          'Use comma-separated attribute names for sorting, with an optional minus prefix.'
        );
    }
    const query = new URLSearchParams(params).toString();
    const result = await this.request('GET', `/${collection}${query ? `?${query}` : ''}`);
    const body = result.body;
    if (!isApiErrorRecord(body) || !Array.isArray(body.data))
      throw createApiServiceError('Outreach returned an invalid collection.');
    const next = isApiErrorRecord(body.links) ? body.links.next : undefined;
    let nextPageOffset: number | undefined;
    let nextPageAfter: string | undefined;
    if (next !== undefined && next !== null) {
      if (typeof next !== 'string' || !next)
        throw createApiServiceError('Outreach returned an invalid continuation.');
      let url: URL;
      try {
        url = new URL(next, `${API_ORIGIN}/api/v2/`);
      } catch {
        throw createApiServiceError('Outreach returned an invalid continuation.');
      }
      if (
        url.origin !== API_ORIGIN ||
        url.username ||
        url.password ||
        url.hash ||
        url.pathname !== `/api/v2/${collection}` ||
        [...url.searchParams.keys()].some(key =>
          /token|secret|authorization|api.?key/i.test(key)
        )
      )
        throw createApiServiceError('Outreach returned an unsafe continuation.');
      const offset = url.searchParams.get('page[offset]');
      if (offset !== null && /^\d+$/.test(offset) && Number.isSafeInteger(Number(offset)))
        nextPageOffset = Number(offset);
      const after = url.searchParams.get('page[after]');
      if (after !== null && after.length > 0 && after.length <= 8192 && !/[\r\n]/.test(after))
        nextPageAfter = after;
      if (nextPageOffset === undefined && nextPageAfter === undefined)
        throw createApiServiceError('Outreach returned an unsupported continuation.');
    }
    const count = isApiErrorRecord(body.meta) ? body.meta.count : undefined;
    return {
      records: body.data.map(item => resource(item, type)),
      hasMore: Boolean(next),
      nextPageOffset,
      nextPageAfter,
      totalCount:
        typeof count === 'number' &&
        Number.isSafeInteger(count) &&
        count >= 0 &&
        !(isApiErrorRecord(body.meta) && body.meta.count_truncated === true)
          ? count
          : null
    };
  }
  async createResource(
    collection: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    const result = await this.request('POST', `/${collection}`, {
      data: {
        type: typeFor(collection),
        attributes,
        ...(relationships ? { relationships } : {})
      }
    });
    if (!isApiErrorRecord(result.body) || result.status !== 201)
      throw createApiServiceError(
        'Outreach did not confirm creation. Read back by a unique marker before retrying.'
      );
    return resource(result.body.data, typeFor(collection));
  }
  async updateResource(
    collection: string,
    id: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    if (!Object.keys(attributes).length && !Object.keys(relationships ?? {}).length)
      throw createApiServiceError('Provide at least one field to update.');
    const result = await this.request('PATCH', `/${collection}/${apiId(id)}`, {
      data: {
        type: typeFor(collection),
        id: apiId(id),
        attributes,
        ...(relationships ? { relationships } : {})
      }
    });
    if (!isApiErrorRecord(result.body))
      throw createApiServiceError('Outreach did not return the updated resource.');
    return resource(result.body.data, typeFor(collection), id);
  }
  async deleteResource(collection: string, id: string): Promise<void> {
    typeFor(collection);
    const result = await this.request('DELETE', `/${collection}/${apiId(id)}`);
    if (result.status !== 204)
      throw createApiServiceError(
        'Outreach did not confirm deletion. Read back before retrying.'
      );
  }
  async action(
    collection: 'sequences' | 'sequenceStates',
    id: string,
    action: string
  ): Promise<JsonApiResource> {
    const allowed =
      collection === 'sequences' ? ['activate', 'deactivate'] : ['pause', 'resume', 'finish'];
    if (!allowed.includes(action))
      throw createApiServiceError('Unsupported Outreach transition.');
    const result = await this.request('POST', `/${collection}/${apiId(id)}/actions/${action}`);
    if (!isApiErrorRecord(result.body))
      throw createApiServiceError(
        'Outreach did not return the transitioned resource. Read it back before retrying.'
      );
    return resource(result.body.data, typeFor(collection), id);
  }
  async getFieldTypes(): Promise<unknown[]> {
    const result = await this.request('GET', '/types');
    if (!isApiErrorRecord(result.body) || !Array.isArray(result.body.data))
      throw createApiServiceError('Outreach returned invalid custom-field definitions.');
    return result.body.data;
  }
  // --- Prospects ---

  async listProspects(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('prospects', params);
  }

  async getProspect(prospectId: string): Promise<JsonApiResource> {
    return this.getResource('prospects', prospectId);
  }

  async createProspect(
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('prospects', attributes, relationships);
  }

  async updateProspect(
    prospectId: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.updateResource('prospects', prospectId, attributes, relationships);
  }

  async deleteProspect(prospectId: string): Promise<void> {
    return this.deleteResource('prospects', prospectId);
  }

  // --- Accounts ---

  async listAccounts(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('accounts', params);
  }

  async getAccount(accountId: string): Promise<JsonApiResource> {
    return this.getResource('accounts', accountId);
  }

  async createAccount(
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('accounts', attributes, relationships);
  }

  async updateAccount(
    accountId: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.updateResource('accounts', accountId, attributes, relationships);
  }

  async deleteAccount(accountId: string): Promise<void> {
    return this.deleteResource('accounts', accountId);
  }

  // --- Sequences ---

  async listSequences(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('sequences', params);
  }

  async getSequence(sequenceId: string): Promise<JsonApiResource> {
    return this.getResource('sequences', sequenceId);
  }

  async createSequence(
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('sequences', attributes, relationships);
  }

  async updateSequence(
    sequenceId: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.updateResource('sequences', sequenceId, attributes, relationships);
  }

  // --- Sequence States ---

  async listSequenceStates(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('sequenceStates', params);
  }

  async getSequenceState(sequenceStateId: string): Promise<JsonApiResource> {
    return this.getResource('sequenceStates', sequenceStateId);
  }

  async createSequenceState(
    attributes: Record<string, unknown>,
    relationships: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('sequenceStates', attributes, relationships);
  }

  async updateSequenceState(
    sequenceStateId: string,
    attributes: Record<string, unknown>
  ): Promise<JsonApiResource> {
    const states: Record<string, string> = {
      active: 'resume',
      paused: 'pause',
      finished: 'finish'
    };
    const action = typeof attributes.state === 'string' ? states[attributes.state] : undefined;
    if (!action)
      throw createApiServiceError(
        'Provide active, paused or finished. Disabled is a provider-managed state and cannot be requested.'
      );
    return this.action('sequenceStates', sequenceStateId, action);
  }

  // --- Sequence Steps ---

  async listSequenceSteps(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('sequenceSteps', params);
  }

  async getSequenceStep(sequenceStepId: string): Promise<JsonApiResource> {
    return this.getResource('sequenceSteps', sequenceStepId);
  }

  // --- Mailings ---

  async listMailings(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('mailings', params);
  }

  async getMailing(mailingId: string): Promise<JsonApiResource> {
    return this.getResource('mailings', mailingId);
  }

  // --- Tasks ---

  async listTasks(params?: Record<string, string>): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('tasks', params);
  }

  async getTask(taskId: string): Promise<JsonApiResource> {
    return this.getResource('tasks', taskId);
  }

  async updateTask(
    taskId: string,
    attributes: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.updateResource('tasks', taskId, attributes);
  }

  // --- Opportunities ---

  async listOpportunities(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('opportunities', params);
  }

  async getOpportunity(opportunityId: string): Promise<JsonApiResource> {
    return this.getResource('opportunities', opportunityId);
  }

  async createOpportunity(
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('opportunities', attributes, relationships);
  }

  async updateOpportunity(
    opportunityId: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.updateResource('opportunities', opportunityId, attributes, relationships);
  }

  // --- Templates ---

  async listTemplates(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('templates', params);
  }

  async getTemplate(templateId: string): Promise<JsonApiResource> {
    return this.getResource('templates', templateId);
  }

  async createTemplate(
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('templates', attributes, relationships);
  }

  async updateTemplate(
    templateId: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.updateResource('templates', templateId, attributes, relationships);
  }

  // --- Snippets ---

  async listSnippets(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('snippets', params);
  }

  async getSnippet(snippetId: string): Promise<JsonApiResource> {
    return this.getResource('snippets', snippetId);
  }

  async createSnippet(
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('snippets', attributes, relationships);
  }

  async updateSnippet(
    snippetId: string,
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.updateResource('snippets', snippetId, attributes, relationships);
  }

  // --- Calls ---

  async listCalls(params?: Record<string, string>): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('calls', params);
  }

  async getCall(callId: string): Promise<JsonApiResource> {
    return this.getResource('calls', callId);
  }

  async createCall(
    attributes: Record<string, unknown>,
    relationships?: Record<string, unknown>
  ): Promise<JsonApiResource> {
    return this.createResource('calls', attributes, relationships);
  }

  // --- Users ---

  async listUsers(params?: Record<string, string>): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('users', params);
  }

  async getUser(userId: string): Promise<JsonApiResource> {
    return this.getResource('users', userId);
  }

  // --- Call Dispositions ---

  async listCallDispositions(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('callDispositions', params);
  }

  // --- Call Purposes ---

  async listCallPurposes(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('callPurposes', params);
  }

  // --- Stages ---

  async listStages(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('stages', params);
  }

  // --- Mailboxes ---

  async listMailboxes(
    params?: Record<string, string>
  ): Promise<PaginatedResult<JsonApiResource>> {
    return this.listResources('mailboxes', params);
  }
}
