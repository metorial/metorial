import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  activitySchema,
  contactSchema,
  emailSchema,
  leadSchema,
  leadStatusSchema,
  meSchema,
  noteSchema,
  opportunitySchema,
  opportunityStatusSchema,
  pageSchema,
  parseResponse,
  pipelineSchema,
  searchSchema,
  smartViewSchema,
  taskSchema,
  templateSchema,
  userSchema
} from './models';

export type CloseAuth = {
  token: string;
  refreshToken?: string;
  authType: 'oauth' | 'api_key';
  organizationId?: string;
};
type Body = Record<string, unknown>;
type Paging = { limit?: number; skip?: number };
export const nonEmpty = (value: string, label: string) => {
  if (
    !value.trim() ||
    Array.from(value).some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError(
      `${label} must be a non-empty value without control characters.`
    );
  return value;
};
export const segment = (value: string, label = 'Resource ID') => {
  nonEmpty(value, label);
  if (value === '.' || value === '..')
    throw createApiServiceError(`${label} must not be a path traversal segment.`);
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError(`${label} must be a valid resource identifier.`);
  }
};
export const authorization = (auth: CloseAuth) => {
  if (
    !/^[\x21-\x7e]+$/.test(auth.token) ||
    (auth.authType === 'api_key' && auth.token.includes(':'))
  )
    throw createApiServiceError('Provide a valid Close credential.');
  return auth.authType === 'api_key'
    ? `Basic ${btoa(`${auth.token}:`)}`
    : `Bearer ${auth.token}`;
};
export const closeApiError = (error: unknown) => {
  const status = getApiErrorStatus(error);
  return buildApiServiceError(error, {
    parent: {},
    extractResponse: () => ({ status }),
    providerLabel: 'Close',
    reason: 'close_api',
    extractMessage: () =>
      status === 401
        ? 'Reconnect with a valid credential.'
        : status === 403
          ? 'The connected user lacks permission for this operation.'
          : status === 404
            ? 'The resource was not found in the connected organization.'
            : status === 429
              ? 'Rate limit reached. Wait before retrying this operation.'
              : 'The request could not be completed. Check the connection and fields before retrying a mutation.'
  });
};
export const validateDate = (value: string | undefined, label: string) => {
  if (value === undefined) return;
  if (
    (!z.iso.date().safeParse(value).success &&
      !z.iso.datetime({ offset: true, local: true }).safeParse(value).success) ||
    !Number.isFinite(Date.parse(value))
  )
    throw createApiServiceError(`${label} must be an ISO date or timestamp.`);
};
export const customFields = (fields: Body | undefined): Body => {
  const body: Body = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    const name = key.startsWith('custom.') ? key.slice(7) : key;
    nonEmpty(name, 'Custom field key');
    if (['__proto__', 'constructor', 'prototype'].includes(name))
      throw createApiServiceError('Provide valid Close custom field keys.');
    body[`custom.${name}`] = value;
  }
  return body;
};
export const requireChanges = (body: Body) => {
  if (Object.keys(body).length === 0)
    throw createApiServiceError('Provide at least one field to update.');
};
const paging = (options: Paging) => {
  const limit = options.limit ?? 100,
    skip = options.skip ?? 0;
  if (!Number.isSafeInteger(limit) || limit <= 0 || !Number.isSafeInteger(skip) || skip < 0)
    throw createApiServiceError(
      'limit must be a positive integer and skip a non-negative integer.'
    );
  return { _limit: limit, _skip: skip };
};
const ids = (values: Body) => {
  for (const [key, value] of Object.entries(values))
    if (typeof value === 'string' && (key.endsWith('_id') || key === 'assigned_to'))
      segment(value, key);
};
const sanitizeResponse = (value: unknown, secrets: string[]): unknown => {
  if (typeof value === 'string')
    return secrets.reduce((text, secret) => text.replaceAll(secret, '[redacted]'), value);
  if (Array.isArray(value)) return value.map(item => sanitizeResponse(item, secrets));
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !secrets.some(secret => key.includes(secret)) &&
            !/^(?:password|secret|clientsecret|token|accesstoken|refreshtoken|apikey|authorization|credentials)$/.test(
              key
                .replace(/^custom\./i, '')
                .replace(/[_-]/g, '')
                .toLowerCase()
            )
        )
        .map(([key, item]) => [key, sanitizeResponse(item, secrets)])
    );
  return value;
};
export class Client {
  private readonly http;
  constructor(private readonly auth: CloseAuth) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.close.com/api/v1',
      authHeader: { value: authorization(auth) },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      validateStatus: () => true,
      errorAdapter: closeApiError
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: Body,
    params?: Body
  ) {
    ids(data ?? {});
    ids(params ?? {});
    const response = await this.http.request<unknown>({
      method,
      url: path,
      data,
      params: pickDefined(params ?? {})
    });
    if (response.status < 200 || response.status >= 300) {
      const retry = getResponseHeaderValue(response.headers, 'retry-after');
      const safeRetry =
        retry && /^\d+(?:\.\d+)?$/.test(retry) ? ` Wait at least ${retry} seconds.` : '';
      throw buildApiServiceError(
        { response: { status: response.status } },
        {
          providerLabel: 'Close',
          reason: 'close_api',
          extractMessage: () =>
            response.status === 429
              ? `Rate limit reached.${safeRetry} Do not immediately retry.`
              : response.status === 401
                ? 'Reconnect with a valid credential.'
                : response.status === 403
                  ? 'The connected user lacks permission for this operation.'
                  : response.status === 404
                    ? 'The resource was not found in the connected organization.'
                    : 'The request was rejected. Check the fields, permissions and resource IDs before retrying.'
        }
      );
    }
    return sanitizeResponse(
      response.data,
      [this.auth.token, this.auth.refreshToken].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      )
    );
  }
  private async page<T>(
    path: string,
    schema: z.ZodType<T>,
    options: Paging = {},
    filters: Body = {}
  ) {
    return parseResponse(
      pageSchema(schema),
      await this.request('GET', path, undefined, { ...paging(options), ...filters })
    );
  }
  private async remove(path: string) {
    const response = await this.request('DELETE', path);
    if (
      response !== undefined &&
      response !== null &&
      response !== '' &&
      (!isApiErrorRecord(response) || Object.keys(response).length !== 0)
    )
      throw createApiServiceError(
        'Close returned an unexpected deletion acknowledgment. Read the resource before retrying.'
      );
  }
  async getMe() {
    return parseResponse(meSchema, await this.request('GET', '/me/'));
  }
  async listUsers(options: Paging = {}) {
    return this.page('/user/', userSchema, options);
  }
  async listLeads(options: Paging & { query?: string } = {}) {
    if (options.query !== undefined) nonEmpty(options.query, 'query');
    return this.page('/lead/', leadSchema, options, { query: options.query });
  }
  private async leadChildren<T>(path: string, schema: z.ZodType<T>, leadId: string) {
    const items: T[] = [];
    for (let skip = 0, pages = 0; pages < 100; pages++) {
      const page = await this.page(path, schema, { limit: 100, skip }, { lead_id: leadId });
      items.push(...page.data);
      if (!page.has_more) return items;
      if (!page.data.length)
        throw createApiServiceError('Close child pagination did not advance.');
      skip += page.data.length;
    }
    throw createApiServiceError(
      'The lead has too many related records to return completely. Use the contact and opportunity list tools with pagination.'
    );
  }
  private async completeLead(value: unknown) {
    const lead = parseResponse(leadSchema, value);
    const contacts =
      lead.contacts ?? (await this.leadChildren('/contact/', contactSchema, lead.id));
    const opportunities =
      lead.opportunities ??
      (await this.leadChildren('/opportunity/', opportunitySchema, lead.id));
    return { ...lead, contacts, opportunities };
  }
  async getLead(id: string) {
    return this.completeLead(await this.request('GET', `/lead/${segment(id)}/`));
  }
  async createLead(data: Body) {
    return this.completeLead(await this.request('POST', '/lead/', data));
  }
  async updateLead(id: string, data: Body) {
    requireChanges(data);
    return this.completeLead(await this.request('PUT', `/lead/${segment(id)}/`, data));
  }
  async deleteLead(id: string) {
    return this.remove(`/lead/${segment(id)}/`);
  }
  async listContacts(options: Paging & { leadId?: string } = {}) {
    return this.page('/contact/', contactSchema, options, { lead_id: options.leadId });
  }
  async createContact(data: Body) {
    return parseResponse(contactSchema, await this.request('POST', '/contact/', data));
  }
  async updateContact(id: string, data: Body) {
    requireChanges(data);
    return parseResponse(
      contactSchema,
      await this.request('PUT', `/contact/${segment(id)}/`, data)
    );
  }
  async listOpportunities(
    options: Paging & {
      leadId?: string;
      userId?: string;
      statusId?: string;
      statusType?: string;
      query?: string;
    } = {}
  ) {
    return this.page('/opportunity/', opportunitySchema, options, {
      lead_id: options.leadId,
      user_id: options.userId,
      status_id: options.statusId,
      status_type: options.statusType,
      query: options.query
    });
  }
  async createOpportunity(data: Body) {
    return parseResponse(opportunitySchema, await this.request('POST', '/opportunity/', data));
  }
  async updateOpportunity(id: string, data: Body) {
    requireChanges(data);
    return parseResponse(
      opportunitySchema,
      await this.request('PUT', `/opportunity/${segment(id)}/`, data)
    );
  }
  async listTasks(
    options: Paging & {
      leadId?: string;
      assignedTo?: string;
      isComplete?: boolean;
      type?: string;
    } = {}
  ) {
    return this.page('/task/', taskSchema, options, {
      lead_id: options.leadId,
      assigned_to: options.assignedTo,
      is_complete: options.isComplete === undefined ? undefined : String(options.isComplete),
      _type: options.type ?? 'lead'
    });
  }
  async getTask(id: string) {
    return parseResponse(taskSchema, await this.request('GET', `/task/${segment(id)}/`));
  }
  async createTask(data: Body) {
    return parseResponse(taskSchema, await this.request('POST', '/task/', data));
  }
  async updateTask(id: string, data: Body) {
    requireChanges(data);
    if (data.text !== undefined && (await this.getTask(id))._type !== 'lead')
      throw createApiServiceError(
        'Only lead tasks support updating text. Use assignment, date or completion for this task type.'
      );
    return parseResponse(taskSchema, await this.request('PUT', `/task/${segment(id)}/`, data));
  }
  async deleteTask(id: string) {
    return this.remove(`/task/${segment(id)}/`);
  }
  async listActivities(
    options: Paging & {
      leadId?: string;
      userId?: string;
      contactId?: string;
      type?: string;
      typeIn?: string[];
      dateCreatedGt?: string;
      dateCreatedLt?: string;
    } = {}
  ) {
    if (
      (options.userId !== undefined ||
        options.contactId !== undefined ||
        options.typeIn !== undefined) &&
      !options.leadId
    )
      throw createApiServiceError(
        'leadId is required for user, contact or multiple-type activity filtering.'
      );
    if (options.type !== undefined && options.typeIn !== undefined)
      throw createApiServiceError('Provide activityType or activityTypes, not both.');
    if (options.typeIn?.length === 0)
      throw createApiServiceError('activityTypes must not be empty.');
    for (const type of options.typeIn ?? []) nonEmpty(type, 'Activity type');
    validateDate(options.dateCreatedGt, 'dateCreatedAfter');
    validateDate(options.dateCreatedLt, 'dateCreatedBefore');
    if (
      options.dateCreatedGt &&
      options.dateCreatedLt &&
      Date.parse(options.dateCreatedGt) >= Date.parse(options.dateCreatedLt)
    )
      throw createApiServiceError('dateCreatedAfter must be before dateCreatedBefore.');
    const route =
      options.type && !options.leadId
        ? `/activity/${options.type.toLowerCase()}/`
        : '/activity/';
    return this.page(route, activitySchema, options, {
      lead_id: options.leadId,
      user_id: options.userId,
      contact_id: options.contactId,
      _type: options.leadId ? options.type : undefined,
      _type__in: options.typeIn?.join(','),
      date_created__gt: options.dateCreatedGt,
      date_created__lt: options.dateCreatedLt,
      _order_by: '-date_created'
    });
  }
  async createNote(data: Body) {
    return parseResponse(noteSchema, await this.request('POST', '/activity/note/', data));
  }
  async updateNote(id: string, data: Body) {
    requireChanges(data);
    return parseResponse(
      noteSchema,
      await this.request('PUT', `/activity/note/${segment(id)}/`, data)
    );
  }
  async sendEmail(data: Body) {
    return parseResponse(emailSchema, await this.request('POST', '/activity/email/', data));
  }
  async createEmailTemplate(data: Body) {
    return parseResponse(templateSchema, await this.request('POST', '/email_template/', data));
  }
  async updateEmailTemplate(id: string, data: Body) {
    requireChanges(data);
    return parseResponse(
      templateSchema,
      await this.request('PUT', `/email_template/${segment(id)}/`, data)
    );
  }
  async listSmartViews(options: Paging & { type?: string } = {}) {
    return this.page(
      '/saved_search/',
      smartViewSchema,
      options,
      options.type ? { type: options.type } : { type__in: 'lead,contact' }
    );
  }
  async listPipelines() {
    return this.page('/pipeline/', pipelineSchema);
  }
  async listLeadStatuses() {
    return this.page('/status/lead/', leadStatusSchema);
  }
  async listOpportunityStatuses() {
    return this.page('/status/opportunity/', opportunityStatusSchema);
  }
  async searchLeads(
    query: Body,
    options: Paging & { fields?: string[]; sort?: Body[]; cursor?: string } = {}
  ) {
    const { _limit: limit, _skip: skip } = paging(options);
    if (options.cursor !== undefined && skip !== 0)
      throw createApiServiceError('Use cursor or skip, not both.');
    if (skip > 10000)
      throw createApiServiceError(
        'Advanced search is limited to 10,000 results. Narrow the query.'
      );
    if (options.cursor !== undefined) nonEmpty(options.cursor, 'cursor');
    if (!Object.keys(query).length)
      throw createApiServiceError('Provide a Close advanced-filter query.');
    const sort = options.sort?.map(item => {
      if (item.field !== undefined) return item;
      if (typeof item.field_name !== 'string')
        throw createApiServiceError('Each sort requires a field object or field_name.');
      return {
        direction: item.direction,
        field: { type: 'regular_field', object_type: 'lead', field_name: item.field_name }
      };
    });
    const body: Body = {
      query: { type: 'and', queries: [{ type: 'object_type', object_type: 'lead' }, query] },
      _fields: options.fields === undefined ? undefined : { lead: options.fields },
      include_counts: true,
      sort
    };
    let cursor = options.cursor,
      remaining = skip;
    const seen = new Set<string>();
    while (remaining > 0) {
      const take = Math.min(remaining, 100);
      const page = parseResponse(
        searchSchema,
        await this.request(
          'POST',
          '/data/search/',
          pickDefined({ ...body, _limit: take, cursor })
        )
      );
      remaining -= page.data.length;
      if (!page.cursor) return { ...page, data: [], cursor: null };
      if (page.data.length === 0 || seen.has(page.cursor))
        throw createApiServiceError(
          'Close search pagination did not advance. Restart with a narrower query.'
        );
      seen.add(page.cursor);
      cursor = page.cursor;
    }
    const page = parseResponse(
      searchSchema,
      await this.request(
        'POST',
        '/data/search/',
        pickDefined({ ...body, _limit: limit, cursor })
      )
    );
    return page;
  }
}
