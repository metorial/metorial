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

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}
export interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}
export interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  meta?: {
    total_count?: number;
    current_page?: number;
    total_pages?: number;
    next_page?: number;
    next_cursor?: string;
  };
}
type ListParams = PaginationParams & {
  search?: string;
  name?: string;
  slug?: string;
  status?: string;
  include?: string;
  sort?: string;
};
type IncidentAttributes = {
  title?: string;
  summary?: string;
  status?: string;
  kind?: string;
  severityId?: string;
  private?: boolean;
  serviceIds?: string[];
  environmentIds?: string[];
  incidentTypeIds?: string[];
  functionalityIds?: string[];
  groupIds?: string[];
  labels?: Record<string, string>;
  mitigationMessage?: string;
  resolutionMessage?: string;
  cancellationMessage?: string;
  scheduledFor?: string;
  scheduledUntil?: string;
};
type ActionAttributes = {
  summary?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedToUserId?: string;
  dueDate?: string;
};
type HeartbeatAttributes = {
  name?: string;
  description?: string;
  interval?: number;
  intervalUnit?: string;
  notificationTargetType?: string;
  notificationTargetId?: string;
  alertSummary?: string;
  alertUrgencyId?: string;
  enabled?: boolean;
};
const record = z.record(z.string(), z.unknown());
const resourceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  attributes: record,
  relationships: record.optional()
});
const primaryResourceSchema = resourceSchema.refine(
  value => Object.keys(value.attributes).length > 0
);
const nullablePage = z
  .number()
  .int()
  .positive()
  .nullable()
  .transform(value => value ?? undefined);
const metaSchema = z.object({
  total_count: z.number().int().nonnegative(),
  current_page: nullablePage,
  total_pages: z.number().int().nonnegative(),
  next_page: nullablePage,
  prev_page: nullablePage,
  next_cursor: z
    .string()
    .nullish()
    .transform(value => value ?? undefined)
});
const linksSchema = z.object({
  self: z.string(),
  first: z.string(),
  prev: z.string().nullable(),
  next: z.string().nullable(),
  last: z.string().nullable()
});
const timestamps = { created_at: z.string(), updated_at: z.string() };
const namedAttributes = z.object({ name: z.string(), ...timestamps });
const attributesByType: Record<string, z.ZodType> = {
  incidents: z.object({ title: z.string(), private: z.boolean(), ...timestamps }),
  alerts: z.object({
    short_id: z.string(),
    source: z.string(),
    summary: z.string(),
    ...timestamps
  }),
  incident_action_items: z.object({ summary: z.string(), ...timestamps }),
  heartbeats: z.object({
    name: z.string(),
    alert_summary: z.string(),
    interval: z.number().finite().positive(),
    interval_unit: z.enum(['minutes', 'hours', 'days']).optional(),
    notification_target_id: z.string(),
    notification_target_type: z
      .enum(['User', 'Group', 'Service', 'EscalationPolicy', 'Functionality'])
      .optional(),
    enabled: z.boolean(),
    status: z.enum(['waiting', 'active', 'expired']).optional(),
    email_address: z.string(),
    ...timestamps
  }),
  users: z.object({ email: z.string(), ...timestamps }),
  schedules: z.object({ name: z.string(), owner_user_id: z.number().int(), ...timestamps }),
  escalation_policies: z.object({
    name: z.string(),
    repeat_count: z.number(),
    created_by_user_id: z.number().int()
  }),
  services: namedAttributes,
  teams: namedAttributes,
  workflows: namedAttributes,
  severities: namedAttributes,
  environments: namedAttributes,
  on_call_resources: z.object({
    escalation_policy_id: z.string(),
    escalation_policy_name: z.string(),
    user_id: z.number().int(),
    starts_at: z.string(),
    ends_at: z.string()
  })
};
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Rootly returned an invalid API response. Check the resource or try again.'
    );
  return result.data;
};
export const resourcePathId = (value: string) => {
  if (
    !value.trim() ||
    value === '.' ||
    value === '..' ||
    /[/\\?#%\s]/u.test(value) ||
    Array.from(value).some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError('Provide a valid Rootly resource ID or incident slug.');
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Provide a valid Rootly resource ID or incident slug.');
  }
};
const upstreamError = (error: unknown) => {
  const result = buildApiServiceError(error, {
    providerLabel: 'Rootly',
    reason: 'rootly_api_error',
    formatMessage: ({ status }) =>
      `Rootly request failed${status ? ` (HTTP ${status})` : ''}. Check the API key role, permissions, resource and inputs.`,
    parent: createApiServiceError('Rootly upstream request failed.', {
      upstreamStatus: getApiErrorStatus(error)
    })
  });
  const headers =
    isApiErrorRecord(error) && isApiErrorRecord(error.response)
      ? error.response.headers
      : undefined;
  for (const [key, header] of [
    ['retryAfter', 'Retry-After'],
    ['rateLimit', 'X-RateLimit-Limit'],
    ['rateLimitRemaining', 'X-RateLimit-Remaining'],
    ['rateLimitUsed', 'X-RateLimit-Used'],
    ['rateLimitReset', 'X-RateLimit-Reset']
  ] as const) {
    const value = getResponseHeaderValue(headers, header);
    if (
      value !== undefined &&
      /^(?:\d+(?:\.\d+)?|[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT)$/.test(
        value
      )
    )
      result.data[key] = value;
  }
  return result;
};
const validateResource = (resource: JsonApiResource, type: string) => {
  if (resource.type !== type)
    throw createApiServiceError(
      'Rootly returned an unexpected resource type. Try again or check the resource.'
    );
  const attributesSchema = attributesByType[type];
  if (attributesSchema) parse(attributesSchema, resource.attributes);
};
const requireUpdate = (attributes: Record<string, unknown>) => {
  if (!Object.values(attributes).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
const date = (value: string | undefined, label: string) => {
  if (value !== undefined && !Number.isFinite(Date.parse(value)))
    throw createApiServiceError(`Provide a valid ${label} date or timestamp.`);
};
const mapAttributes = (attributes: Record<string, unknown>, names: Record<string, string>) =>
  pickDefined(
    Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [names[key] ?? key, value])
    )
  );
const incidentNames = {
  severityId: 'severity_id',
  serviceIds: 'service_ids',
  environmentIds: 'environment_ids',
  incidentTypeIds: 'incident_type_ids',
  functionalityIds: 'functionality_ids',
  groupIds: 'group_ids',
  mitigationMessage: 'mitigation_message',
  resolutionMessage: 'resolution_message',
  cancellationMessage: 'cancellation_message',
  scheduledFor: 'scheduled_for',
  scheduledUntil: 'scheduled_until'
};
const heartbeatNames = {
  intervalUnit: 'interval_unit',
  notificationTargetType: 'notification_target_type',
  notificationTargetId: 'notification_target_id',
  alertSummary: 'alert_summary',
  alertUrgencyId: 'alert_urgency_id'
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string }) {
    if (
      !config.token.trim() ||
      /\s/.test(config.token) ||
      Array.from(config.token).some(
        character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      )
    )
      throw createApiServiceError('Provide a valid Rootly API key.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.rootly.com/v1',
      authHeader: { value: `Bearer ${config.token}` },
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true,
      errorAdapter: upstreamError
    });
  }
  private params(params: PaginationParams | undefined, filters: Record<string, unknown> = {}) {
    for (const key of ['pageNumber', 'pageSize'] as const) {
      const value = params?.[key];
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
        throw createApiServiceError(`Use a positive integer ${key}.`);
    }
    return pickDefined({
      ...filters,
      'page[number]': params?.pageNumber,
      'page[size]': params?.pageSize
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    schema: z.ZodType<JsonApiResponse>,
    attributes?: Record<string, unknown>,
    type?: string,
    params?: Record<string, unknown>
  ) {
    const response = await this.http.request<unknown>({
      method,
      url: path,
      params,
      data: type ? { data: { type, attributes: pickDefined(attributes ?? {}) } } : undefined
    });
    const expectedStatus =
      method === 'POST' && !/\/(acknowledge|resolve)$/.test(path) ? 201 : 200;
    if (response.status !== expectedStatus) throw upstreamError({ response });
    const body = parse(record, response.data);
    if (body.errors !== undefined || body.error !== undefined)
      throw createApiServiceError(
        'Rootly rejected the request. Check permissions, inputs and resource state.'
      );
    return parse(schema, body);
  }
  private async one(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    attributes?: Record<string, unknown>,
    type?: string,
    include?: string
  ) {
    const result = await this.request(
      method,
      path,
      z.object({ data: primaryResourceSchema, included: z.array(resourceSchema).optional() }),
      attributes,
      type,
      pickDefined({ include })
    );
    const resource = parse(resourceSchema, result.data);
    const segments = path.split('/').filter(Boolean);
    const expectedType = segments.includes('action_items')
      ? 'incident_action_items'
      : (segments[0] ?? '');
    validateResource(resource, expectedType);
    const expectedId =
      segments[1] === 'me' || (segments.length > 2 && segments[0] === 'incidents')
        ? undefined
        : segments[1];
    if (
      expectedId !== undefined &&
      resource.id !== decodeURIComponent(expectedId) &&
      !(
        segments[0] === 'incidents' &&
        resource.attributes.slug === decodeURIComponent(expectedId)
      )
    )
      throw createApiServiceError(
        'Rootly returned a different resource identifier. Try again or check the resource.'
      );
    return result;
  }
  private async list(
    path: string,
    params: PaginationParams | undefined,
    filters: Record<string, unknown> = {}
  ) {
    const collectionSchema = z.object({
      data: z.array(primaryResourceSchema),
      included: z.array(resourceSchema).optional()
    });
    const schema =
      path === '/oncalls'
        ? collectionSchema
        : collectionSchema.extend({ meta: metaSchema, links: linksSchema });
    const result = await this.request(
      'GET',
      path,
      schema,
      undefined,
      undefined,
      this.params(params, filters)
    );
    const type = path.includes('/action_items')
      ? 'incident_action_items'
      : path === '/oncalls'
        ? 'on_call_resources'
        : path.slice(1);
    const rows = parse(z.array(resourceSchema), result.data);
    for (const row of rows) validateResource(row, type);
    const pageNumber = params?.pageNumber ?? 1;
    if (
      result.meta &&
      ((result.meta.current_page !== undefined && result.meta.current_page !== pageNumber) ||
        (result.meta.total_count !== undefined && result.meta.total_count < rows.length) ||
        (result.meta.next_page !== undefined &&
          (result.meta.next_page <= pageNumber ||
            (result.meta.total_pages !== undefined &&
              result.meta.next_page > result.meta.total_pages))))
    )
      throw createApiServiceError(
        'Rootly returned inconsistent pagination. Try again before continuing.'
      );
    return result;
  }
  private filterPage(
    result: JsonApiResponse,
    search?: string,
    sort?: string,
    status?: string
  ) {
    let data = parse(z.array(resourceSchema), result.data);
    if (status !== undefined) data = data.filter(row => row.attributes.status === status);
    if (search !== undefined) {
      const keyword = search.toLocaleLowerCase();
      data = data.filter(row =>
        [row.attributes.summary, row.attributes.description].some(
          value => typeof value === 'string' && value.toLocaleLowerCase().includes(keyword)
        )
      );
    }
    if (sort !== undefined) {
      if (!['created_at', '-created_at', 'updated_at', '-updated_at'].includes(sort))
        throw createApiServiceError(
          'For page-local sorting, use created_at or updated_at, optionally prefixed with -.'
        );
      const field = sort.replace(/^-/, '');
      data.sort(
        (a, b) =>
          String(a.attributes[field] ?? '').localeCompare(String(b.attributes[field] ?? '')) *
          (sort.startsWith('-') ? -1 : 1)
      );
    }
    return {
      ...result,
      data,
      meta: result.meta
        ? {
            ...result.meta,
            total_count:
              search !== undefined || status !== undefined
                ? undefined
                : result.meta.total_count,
            total_pages:
              search !== undefined || status !== undefined
                ? undefined
                : result.meta.total_pages
          }
        : undefined
    };
  }
  async listIncidents(
    params?: ListParams & {
      severity?: string;
      serviceIds?: string;
      teamIds?: string;
      kind?: string;
    }
  ) {
    return this.list('/incidents', params, {
      'filter[search]': params?.search,
      'filter[status]': params?.status,
      'filter[kind]': params?.kind,
      'filter[severity]': params?.severity,
      'filter[service_ids]': params?.serviceIds,
      'filter[team_ids]': params?.teamIds,
      sort: params?.sort,
      include: params?.include
    });
  }
  async getIncident(incidentId: string, include?: string) {
    return this.one(
      'GET',
      `/incidents/${resourcePathId(incidentId)}`,
      undefined,
      undefined,
      include
    );
  }
  async createIncident(attributes: IncidentAttributes) {
    date(attributes.scheduledFor, 'scheduledFor');
    date(attributes.scheduledUntil, 'scheduledUntil');
    return this.one(
      'POST',
      '/incidents',
      mapAttributes(
        { kind: 'normal', private: false, ...pickDefined(attributes) },
        incidentNames
      ),
      'incidents'
    );
  }
  async updateIncident(incidentId: string, attributes: IncidentAttributes) {
    requireUpdate(attributes);
    date(attributes.scheduledFor, 'scheduledFor');
    date(attributes.scheduledUntil, 'scheduledUntil');
    const previous = parse(resourceSchema, (await this.getIncident(incidentId)).data);
    const settings = parse(
      z.object({ kind: z.string(), private: z.boolean() }),
      previous.attributes
    );
    if (settings.private && attributes.private === false)
      throw createApiServiceError(
        'Rootly private incidents cannot be converted back to public incidents.'
      );
    return this.one(
      'PUT',
      `/incidents/${resourcePathId(previous.id)}`,
      mapAttributes(
        { kind: settings.kind, private: settings.private, ...pickDefined(attributes) },
        incidentNames
      ),
      'incidents'
    );
  }
  async deleteIncident(incidentId: string) {
    return this.one('DELETE', `/incidents/${resourcePathId(incidentId)}`);
  }
  async listAlerts(
    params?: ListParams & { source?: string; services?: string; environments?: string }
  ) {
    const result = await this.list('/alerts', params, {
      'filter[status]': params?.status,
      'filter[source]': params?.source,
      'filter[services]': params?.services,
      'filter[environments]': params?.environments,
      include: params?.include
    });
    return this.filterPage(result, params?.search, params?.sort);
  }
  async getAlert(alertId: string, include?: string) {
    return this.one(
      'GET',
      `/alerts/${resourcePathId(alertId)}`,
      undefined,
      undefined,
      include
    );
  }
  async createAlert(attributes: {
    source: string;
    summary: string;
    description?: string;
    status?: string;
    serviceIds?: string[];
    groupIds?: string[];
    environmentIds?: string[];
    externalId?: string;
    externalUrl?: string;
    alertUrgencyId?: string;
    notificationTargetType?: string;
    notificationTargetId?: string;
    deduplicationKey?: string;
    labels?: Array<{ key: string; value: string }>;
  }) {
    if (!attributes.summary.trim())
      throw createApiServiceError('Provide a non-empty alert summary.');
    if (
      (attributes.notificationTargetType === undefined) !==
      (attributes.notificationTargetId === undefined)
    )
      throw createApiServiceError(
        'Provide both notificationTargetType and notificationTargetId, or omit both.'
      );
    return this.one(
      'POST',
      '/alerts',
      mapAttributes(attributes, {
        serviceIds: 'service_ids',
        groupIds: 'group_ids',
        environmentIds: 'environment_ids',
        externalId: 'external_id',
        externalUrl: 'external_url',
        alertUrgencyId: 'alert_urgency_id',
        notificationTargetType: 'notification_target_type',
        notificationTargetId: 'notification_target_id',
        deduplicationKey: 'deduplication_key'
      }),
      'alerts'
    );
  }
  async acknowledgeAlert(alertId: string) {
    const result = await this.one('POST', `/alerts/${resourcePathId(alertId)}/acknowledge`);
    if (parse(resourceSchema, result.data).attributes.status !== 'acknowledged')
      throw createApiServiceError(
        'Rootly did not confirm the acknowledged alert state. Read the alert before retrying.'
      );
    return result;
  }
  async resolveAlert(alertId: string) {
    const result = await this.one(
      'POST',
      `/alerts/${resourcePathId(alertId)}/resolve`,
      { resolve_related_incidents: false },
      'alerts'
    );
    if (parse(resourceSchema, result.data).attributes.status !== 'resolved')
      throw createApiServiceError(
        'Rootly did not confirm the resolved alert state. Read the alert before retrying.'
      );
    return result;
  }
  async listSchedules(params?: ListParams) {
    return this.list('/schedules', params, {
      'filter[search]': params?.search,
      'filter[name]': params?.name,
      include: params?.include
    });
  }
  async listOnCalls(
    params?: PaginationParams & { include?: string }
  ): Promise<JsonApiResponse> {
    this.params(params);
    const result = await this.list('/oncalls', undefined, { include: params?.include });
    const all = parse(z.array(resourceSchema), result.data);
    const size = params?.pageSize ?? all.length;
    const offset = ((params?.pageNumber ?? 1) - 1) * size;
    return {
      ...result,
      data: all.slice(offset, offset + size),
      meta: { total_count: all.length }
    };
  }
  async listEscalationPolicies(params?: ListParams) {
    return this.list('/escalation_policies', params, {
      'filter[search]': params?.search,
      'filter[name]': params?.name,
      include: params?.include
    });
  }
  async listServices(params?: ListParams) {
    return this.list('/services', params, {
      'filter[search]': params?.search,
      'filter[name]': params?.name,
      'filter[slug]': params?.slug,
      include: params?.include,
      sort: params?.sort
    });
  }
  async listTeams(params?: ListParams) {
    return this.list('/teams', params, {
      'filter[search]': params?.search,
      'filter[name]': params?.name,
      'filter[slug]': params?.slug,
      include: params?.include,
      sort: params?.sort
    });
  }
  async listUsers(params?: ListParams & { email?: string }) {
    return this.list('/users', params, {
      'filter[search]': params?.search,
      'filter[email]': params?.email,
      include: params?.include,
      sort: params?.sort
    });
  }
  async getCurrentUser() {
    return this.one('GET', '/users/me');
  }
  async listWorkflows(params?: ListParams) {
    return this.list('/workflows', params, {
      'filter[search]': params?.search,
      'filter[name]': params?.name,
      include: params?.include,
      sort: params?.sort
    });
  }
  async listActionItems(params?: ListParams & { incidentId?: string }) {
    const path = params?.incidentId
      ? `/incidents/${resourcePathId(params.incidentId)}/action_items`
      : '/action_items';
    const result = await this.list(path, params, {
      'filter[status]': params?.incidentId ? undefined : params?.status,
      include: params?.include,
      sort: params?.incidentId ? undefined : params?.sort
    });
    return this.filterPage(
      result,
      params?.search,
      params?.incidentId ? params.sort : undefined,
      params?.incidentId ? params.status : undefined
    );
  }
  private actionAttributes(attributes: ActionAttributes) {
    if (
      attributes.status !== undefined &&
      !['open', 'in_progress', 'done', 'cancelled'].includes(attributes.status)
    )
      throw createApiServiceError(
        'Action item status must be open, in_progress, done or cancelled.'
      );
    if (
      attributes.priority !== undefined &&
      !['high', 'medium', 'low'].includes(attributes.priority)
    )
      throw createApiServiceError('Action item priority must be high, medium or low.');
    const assignedTo =
      attributes.assignedToUserId === undefined
        ? undefined
        : Number(attributes.assignedToUserId);
    if (
      assignedTo !== undefined &&
      (!/^\d+$/.test(attributes.assignedToUserId ?? '') ||
        !Number.isSafeInteger(assignedTo) ||
        assignedTo < 1)
    )
      throw createApiServiceError(
        'Use the numeric user ID returned by list_users for assignedToUserId.'
      );
    date(attributes.dueDate, 'dueDate');
    return {
      ...mapAttributes(attributes, {
        assignedToUserId: 'assigned_to_user_id',
        dueDate: 'due_date'
      }),
      assigned_to_user_id: assignedTo
    };
  }
  async createActionItem(
    incidentId: string,
    attributes: ActionAttributes & { summary: string }
  ) {
    if (!attributes.summary.trim())
      throw createApiServiceError('Provide a non-empty action item summary.');
    return this.one(
      'POST',
      `/incidents/${resourcePathId(incidentId)}/action_items`,
      this.actionAttributes(attributes),
      'incident_action_items'
    );
  }
  async getActionItem(actionItemId: string) {
    return this.one('GET', `/action_items/${resourcePathId(actionItemId)}`);
  }
  async updateActionItem(
    incidentId: string,
    actionItemId: string,
    attributes: ActionAttributes
  ) {
    requireUpdate(attributes);
    resourcePathId(actionItemId);
    let found = false;
    for (let pageNumber = 1, scanned = 0; scanned < 100; scanned++) {
      const page = await this.listActionItems({ incidentId, pageNumber, pageSize: 50 });
      const items = parse(z.array(resourceSchema), page.data);
      if (items.some(item => item.id === actionItemId)) {
        found = true;
        break;
      }
      if (page.meta?.next_page !== undefined) pageNumber = page.meta.next_page;
      else if (page.meta?.total_pages !== undefined && pageNumber < page.meta.total_pages)
        pageNumber++;
      else break;
    }
    if (!found)
      throw createApiServiceError(
        'The action item was not found within the specified incident. Check both IDs.'
      );
    return this.one(
      'PUT',
      `/action_items/${resourcePathId(actionItemId)}`,
      this.actionAttributes(attributes),
      'incident_action_items'
    );
  }
  async deleteActionItem(actionItemId: string) {
    return this.one('DELETE', `/action_items/${resourcePathId(actionItemId)}`);
  }
  async listHeartbeats(params?: ListParams) {
    return this.list('/heartbeats', params, {
      'filter[search]': params?.search,
      'filter[name]': params?.name,
      include: params?.include
    });
  }
  async getHeartbeat(heartbeatId: string) {
    return this.one('GET', `/heartbeats/${resourcePathId(heartbeatId)}`);
  }
  private heartbeatAttributes(attributes: HeartbeatAttributes, creating = false) {
    if (
      attributes.interval !== undefined &&
      (!Number.isFinite(attributes.interval) || attributes.interval <= 0)
    )
      throw createApiServiceError('Use a positive heartbeat interval.');
    if (creating)
      for (const key of [
        'name',
        'interval',
        'intervalUnit',
        'notificationTargetType',
        'notificationTargetId',
        'alertSummary'
      ] as const)
        if (attributes[key] === undefined || attributes[key] === '')
          throw createApiServiceError(
            `Heartbeat creation requires ${key}. Provide the notification target and alert summary, even for a disabled monitor.`
          );
    return mapAttributes(attributes, heartbeatNames);
  }
  async createHeartbeat(attributes: HeartbeatAttributes) {
    return this.one(
      'POST',
      '/heartbeats',
      this.heartbeatAttributes(attributes, true),
      'heartbeats'
    );
  }
  async updateHeartbeat(heartbeatId: string, attributes: HeartbeatAttributes) {
    requireUpdate(attributes);
    return this.one(
      'PUT',
      `/heartbeats/${resourcePathId(heartbeatId)}`,
      this.heartbeatAttributes(attributes),
      'heartbeats'
    );
  }
  async deleteHeartbeat(heartbeatId: string) {
    return this.one('DELETE', `/heartbeats/${resourcePathId(heartbeatId)}`);
  }
  async listSeverities(params?: PaginationParams) {
    return this.list('/severities', params);
  }
  async listEnvironments(params?: ListParams) {
    return this.list('/environments', params, { 'filter[search]': params?.search });
  }
}
export const flattenResource = (resource: JsonApiResource): Record<string, unknown> => {
  const value = parse(resourceSchema, resource);
  const { secret: _secret, ...attributes } = value.attributes;
  return {
    ...attributes,
    id: value.id,
    type: value.type,
    ...(value.relationships ? { relationships: value.relationships } : {})
  };
};
export const flattenResources = (resources: JsonApiResource[]): Record<string, unknown>[] =>
  parse(z.array(resourceSchema), resources).map(flattenResource);
