import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export type Entity = Row & { id: number };
export function object(value: unknown): Row {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('Salesflare returned invalid object metadata.');
  return value;
}
export function id(value: unknown, label = 'resource ID'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw createApiServiceError(
      `Provide a positive integer ${label}. Discover it with the relevant list tool.`
    );
  return value;
}
export function text(value: unknown, label = 'text'): string {
  if (typeof value !== 'string')
    throw createApiServiceError(`Salesflare returned invalid ${label}.`);
  return value;
}
export function optionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw createApiServiceError(`Salesflare returned invalid ${label}.`);
  return value;
}
export function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean')
    throw createApiServiceError(`Salesflare returned invalid ${label}.`);
  return value;
}
export function nonempty(value: unknown, label: string): string {
  const result = text(value, label);
  if (!result.trim() || /\0/.test(result))
    throw createApiServiceError(`Provide a valid ${label}.`);
  return result;
}
const secretKeys =
  /^(?:.*(?:access|refresh|tracking|auth|api)[_-]?token|token|password|.*password|api[_-]?key|authorization|credentials?|client[_-]?secret|secret|intercom_hash|notification_channel_id|download_url|signed_url|upload_url)$/i;
function publicMetadata(value: unknown, token?: string): unknown {
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (
        url.username ||
        url.password ||
        [...url.searchParams.keys()].some(key =>
          /(?:token|signature|credential|(?:^|[_-])sig$|(?:^|[_-])key$|^x-amz-|^x-goog-)/i.test(
            key
          )
        )
      )
        return undefined;
    } catch {
      return token ? value.replaceAll(token, '[redacted]') : value;
    }
  }
  if (typeof value === 'string') return token ? value.replaceAll(token, '[redacted]') : value;
  if (Array.isArray(value)) return value.map(item => publicMetadata(item, token));
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !secretKeys.test(key) && !(token && key.includes(token)))
        .map(([key, item]) => [key, publicMetadata(item, token)])
    );
  return value;
}
export function entity(value: unknown, expectedId?: number): Entity {
  const row = object(publicMetadata(value)),
    resourceId = id(row.id);
  if (expectedId !== undefined && resourceId !== expectedId)
    throw createApiServiceError('Salesflare returned a different resource than requested.');
  return { ...row, id: resourceId };
}
function list(value: unknown): Entity[] {
  if (!Array.isArray(value))
    throw createApiServiceError(
      'Salesflare returned an invalid resource list; no empty result is assumed.'
    );
  return value.map(value => entity(value));
}
export function associationChanges(
  add: number[] = [],
  remove: number[] = [],
  label = 'resource IDs'
) {
  const values = [...add, ...remove];
  values.forEach(value => id(value, label));
  if (new Set(values).size !== values.length)
    throw createApiServiceError(
      `Provide distinct ${label}; do not add and remove the same ID.`
    );
  return [
    ...add.map(id => ({ id, _dirty: true })),
    ...remove.map(id => ({ id, _deleted: true }))
  ];
}
function validateDate(value: unknown, label: string) {
  if (
    typeof value !== 'string' ||
    (!z.iso.date().safeParse(value).success &&
      !z.iso.datetime({ offset: true, local: true }).safeParse(value).success)
  )
    throw createApiServiceError(`${label} must be a valid ISO 8601 date/time.`);
}
function validateValues(data: Row) {
  for (const [key, value] of Object.entries(data)) {
    if (
      [
        'account',
        'owner',
        'stage',
        'currency',
        'assignee',
        'main_contact',
        'creator',
        'lost_reason',
        'lead_source'
      ].includes(key) &&
      !(key === 'account' && value === null)
    )
      id(value, key);
    if (['assignees', 'participants', 'mentions'].includes(key)) {
      if (!Array.isArray(value)) throw createApiServiceError(`${key} must be a list of IDs.`);
      value.forEach(value => id(value, key));
      if (new Set(value).size !== value.length)
        throw createApiServiceError(`${key} must contain distinct IDs.`);
    }
    if (typeof value === 'number' && !Number.isFinite(value))
      throw createApiServiceError(`${key} must be finite.`);
    if (value !== undefined && (key.endsWith('_date') || key === 'date'))
      validateDate(value, key);
  }
}
export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private readonly token: string) {
    nonempty(token, 'API key');
    if (/[\r\n]/.test(token)) throw createApiServiceError('Provide a valid API key.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.salesflare.com',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Salesflare',
          reason: 'salesflare_api_error',
          formatMessage: ({ status }) =>
            `Salesflare request failed${status ? ` (HTTP ${status})` : ''}. Check API-key permissions and supplied values${status === 429 ? '; wait before retrying' : ''}. A write may already have applied; inspect it before retrying.`,
          parent: createApiServiceError('Salesflare upstream request failed.', {
            upstreamStatus: getApiErrorStatus(error)
          })
        })
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Row
  ) {
    const response = await this.axios.request<unknown>({
      method,
      url: path,
      data,
      params: pickDefined(params ?? {}),
      paramsSerializer: { indexes: null }
    });
    if (
      ![
        200,
        ...(method === 'POST' ? [201] : []),
        ...(method === 'DELETE' ? [204] : [])
      ].includes(response.status)
    )
      throw createApiServiceError(
        'Salesflare did not acknowledge the requested operation. Inspect the resource before retrying.'
      );
    const r = response.data;
    if (
      isApiErrorRecord(r) &&
      (r.success === false ||
        r.error !== undefined ||
        (typeof r.statusCode === 'number' && r.statusCode >= 400))
    )
      throw createApiServiceError(
        'Salesflare rejected the operation. Inspect current state before retrying; no success is assumed.'
      );
    return publicMetadata(r, this.token);
  }
  private page(params: Row = {}) {
    for (const key of ['limit', 'offset'] as const) {
      const value = params[key];
      if (
        value !== undefined &&
        (typeof value !== 'number' ||
          !Number.isSafeInteger(value) ||
          value < (key === 'limit' ? 1 : 0))
      )
        throw createApiServiceError(
          `${key} must be a ${key === 'limit' ? 'positive' : 'non-negative'} integer.`
        );
    }
    for (const key of [
      'id',
      'account',
      'owner',
      'stage',
      'pipeline',
      'assignee',
      'assignees'
    ] as const) {
      const value = params[key];
      if (value !== undefined)
        (Array.isArray(value) ? value : [value]).forEach(value => id(value, key));
    }
    if (params.hotness !== undefined && ![1, 2, 3].includes(Number(params.hotness)))
      throw createApiServiceError('hotness must be 1, 2 or 3.');
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'number' && !Number.isFinite(value))
        throw createApiServiceError(`${key} must be finite.`);
      if (
        value !== undefined &&
        (/(?:_after|_before)$/.test(key) || ['before', 'after'].includes(key))
      )
        validateDate(value, key);
    }
    if (
      typeof params.min_value === 'number' &&
      typeof params.max_value === 'number' &&
      params.min_value > params.max_value
    )
      throw createApiServiceError('minValue cannot exceed maxValue.');
    return pickDefined(params);
  }
  private async resources(path: string, params: Row = {}) {
    return list(await this.request('GET', path, undefined, this.page(params)));
  }
  private async read(path: string, resourceId: number) {
    return entity(await this.request('GET', `${path}/${id(resourceId)}`), resourceId);
  }
  private async create(path: string, data: Row, batch = false, params?: Row) {
    validateValues(data);
    const native = await this.request('POST', path, batch ? [data] : data, params);
    if (Array.isArray(native)) {
      if (native.length !== 1)
        throw createApiServiceError(
          'Salesflare did not return exactly one created resource. Inspect creation before retrying.'
        );
      return entity(native[0]);
    }
    return entity(native);
  }
  private async acknowledged(
    method: 'PUT' | 'DELETE',
    path: string,
    resourceId: number,
    data?: Row | Row[]
  ) {
    if (data && !Array.isArray(data)) {
      if (!Object.keys(pickDefined(data)).length)
        throw createApiServiceError('Provide at least one change.');
      validateValues(data);
    }
    const value = await this.request(method, `${path}/${id(resourceId)}`, data);
    if (method === 'DELETE' && (value === undefined || value === null || value === ''))
      return { success: true };
    const r = object(value);
    if (r.id !== undefined && id(r.id) !== resourceId)
      throw createApiServiceError(
        'Salesflare acknowledged a different resource. Inspect current state before retrying.'
      );
    if (r.success !== true && r.id === undefined)
      throw createApiServiceError(
        'Salesflare did not affirm the mutation. Inspect the resource before retrying.'
      );
    return object(publicMetadata(r));
  }
  private async updated(path: string, resourceId: number, data: Row) {
    if (!Object.keys(pickDefined(data)).length)
      throw createApiServiceError('Provide at least one change.');
    id(resourceId);
    validateValues(data);
    await this.request('PUT', `${path}/${resourceId}`, data);
    try {
      return await this.read(path, resourceId);
    } catch {
      throw createApiServiceError(
        `Salesflare accepted the update to ${resourceId}, but readback failed. Inspect that resource before retrying.`
      );
    }
  }
  listAccounts(params: Row = {}) {
    return this.resources('/accounts', params);
  }
  getAccount(value: number) {
    return this.read('/accounts', value);
  }
  createAccount(data: Row, updateIfExists = false) {
    if (!data.name && !data.domain)
      throw createApiServiceError('Provide an account name or domain.');
    return this.create('/accounts', data, false, { update_if_exists: updateIfExists });
  }
  updateAccount(value: number, data: Row) {
    return this.updated('/accounts', value, data);
  }
  deleteAccount(value: number) {
    return this.acknowledged('DELETE', '/accounts', value);
  }
  private async associations(
    value: number,
    kind: 'contacts' | 'users',
    values: Array<{ id: number; _dirty?: boolean; _deleted?: boolean }>
  ) {
    id(value);
    values.forEach(value => id(value.id));
    if (!values.length)
      throw createApiServiceError('Provide at least one association change.');
    await this.request('PUT', `/accounts/${value}/${kind}`, values);
  }
  updateAccountContacts(
    value: number,
    values: Array<{ id: number; _dirty?: boolean; _deleted?: boolean }>
  ) {
    return this.associations(value, 'contacts', values);
  }
  updateAccountUsers(
    value: number,
    values: Array<{ id: number; _dirty?: boolean; _deleted?: boolean }>
  ) {
    return this.associations(value, 'users', values);
  }
  listContacts(params: Row = {}) {
    return this.resources('/contacts', params);
  }
  getContact(value: number) {
    return this.read('/contacts', value);
  }
  createContact(data: Row, force = true) {
    if (!data.email && !data.firstname && !data.lastname && !data.name)
      throw createApiServiceError('Provide a contact email or name.');
    return this.create('/contacts', data, true, { force });
  }
  updateContact(value: number, data: Row) {
    return this.updated('/contacts', value, data);
  }
  deleteContact(value: number) {
    return this.acknowledged('DELETE', '/contacts', value);
  }
  listOpportunities(params: Row = {}) {
    return this.resources('/opportunities', params);
  }
  getOpportunity(value: number) {
    return this.read('/opportunities', value);
  }
  createOpportunity(data: Row) {
    id(data.account, 'account ID');
    return this.create('/opportunities', data);
  }
  updateOpportunity(value: number, data: Row) {
    if (data.currency !== undefined)
      throw createApiServiceError(
        'Salesflare does not document changing opportunity currency. Choose currency when creating an opportunity; no changes were submitted.'
      );
    return this.updated('/opportunities', value, data);
  }
  deleteOpportunity(value: number) {
    return this.acknowledged('DELETE', '/opportunities', value);
  }
  listTasks(params: Row = {}) {
    return this.resources('/tasks', params);
  }
  createTask(data: Row) {
    nonempty(data.description, 'task description');
    return this.create('/tasks', data, true);
  }
  updateTask(value: number, data: Row) {
    return this.acknowledged('PUT', '/tasks', value, data);
  }
  deleteTask(value: number) {
    return this.acknowledged('DELETE', '/tasks', value);
  }
  createNote(data: Row) {
    nonempty(data.body, 'note body');
    return this.create('/messages', data);
  }
  async updateNote(value: number, data: Row) {
    id(value);
    id(data.account, 'account ID');
    nonempty(data.body, 'note body');
    validateValues(data);
    await this.request('PUT', `/messages/${value}`, data);
    const notes = await this.listAccountMessages(id(data.account), { limit: 100 });
    const note = notes.find(note => note.id === value);
    if (!note || note.body !== data.body)
      throw createApiServiceError(
        'Salesflare accepted the note update, but the first 100 timeline notes did not confirm it. Narrow note discovery and inspect before retrying.'
      );
    return note;
  }
  deleteNote(value: number) {
    return this.acknowledged('DELETE', '/messages', value);
  }
  listAccountMessages(value: number, params: Row = {}) {
    return this.resources(`/accounts/${id(value)}/messages`, params);
  }
  createMeeting(data: Row) {
    if (data.date === undefined || data.participants === undefined)
      throw createApiServiceError('Provide a meeting date and participant IDs.');
    return this.create('/meetings', data, true);
  }
  createCall(data: Row) {
    if (data.date === undefined || data.participants === undefined)
      throw createApiServiceError('Provide a call date and participant IDs.');
    return this.create('/calls', data, true);
  }
  listTags(params: Row = {}) {
    return this.resources('/tags', params);
  }
  createTag(name: string) {
    nonempty(name, 'tag name');
    return this.create('/tags', { name });
  }
  updateTag(value: number, name: string) {
    nonempty(name, 'tag name');
    return this.acknowledged('PUT', '/tags', value, { name });
  }
  deleteTag(value: number) {
    return this.acknowledged('DELETE', '/tags', value);
  }
  listPipelines(params: Row = {}) {
    return this.resources('/pipelines', params);
  }
  async getMe() {
    const result = entity(await this.request('GET', '/me'));
    id(object(result.team).id, 'team ID');
    return result;
  }
  listUsers(params: Row = {}) {
    return this.resources('/users', params);
  }
  listWorkflows(params: Row = {}) {
    return this.resources('/workflows', params);
  }
  getWorkflow(value: number) {
    return this.read('/workflows', value);
  }
  listCurrencies() {
    return this.resources('/currencies');
  }
  listCustomFields(itemClass: string, params: Row = {}) {
    if (!['accounts', 'contacts', 'opportunities'].includes(itemClass))
      throw createApiServiceError('Choose accounts, contacts or opportunities.');
    if (params.pipeline !== undefined) id(params.pipeline, 'pipeline ID');
    return this.resources(`/customfields/${itemClass}`, params);
  }
}
