import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

const text = z.string();
const optionalText = text.nullish().transform(value => value ?? undefined);
const object = z.record(z.string(), z.unknown());
const named = z.object({ id: text.min(1), name: text }).passthrough();
const dated = named.extend({ created_at: text, updated_at: text });
const pagination = z
  .object({
    after: optionalText,
    total_record_count: z.number().int().nonnegative().optional()
  })
  .passthrough();
const incident = dated.extend({
  reference: text,
  visibility: text,
  mode: text,
  summary: optionalText,
  permalink: optionalText,
  call_url: optionalText,
  slack_channel_id: optionalText,
  slack_channel_name: optionalText,
  severity: object.nullish(),
  incident_status: named.extend({ category: text }).passthrough(),
  incident_type: object.nullish(),
  creator: object.nullish(),
  incident_role_assignments: z.array(object).optional(),
  custom_field_entries: z.array(object).optional(),
  incident_timestamp_values: z.array(object).optional(),
  duration_metrics: z.array(object).optional()
});
const user = named.extend({
  email: optionalText,
  role: optionalText,
  slack_user_id: optionalText
});
const entry = z
  .object({
    start_at: text,
    end_at: text,
    entry_id: optionalText,
    rotation_id: optionalText,
    user: user.nullish()
  })
  .passthrough();
const schedule = dated.extend({
  timezone: text,
  config: object.optional(),
  current_shifts: z.array(entry).optional(),
  next_shifts: z.array(entry).optional(),
  team_ids: z.array(text).optional(),
  permalink: optionalText
});
const override = z
  .object({
    id: text.min(1),
    schedule_id: text,
    rotation_id: text,
    layer_id: text,
    start_at: text,
    end_at: text,
    created_at: text,
    updated_at: text,
    user: user.nullish()
  })
  .passthrough();
const binding = z
  .object({
    value: z.object({ literal: optionalText }).passthrough().nullish(),
    array_value: z.array(z.object({ literal: optionalText }).passthrough()).nullish()
  })
  .passthrough();
const catalogEntry = dated.extend({
  catalog_type_id: text,
  aliases: z.array(text),
  external_id: optionalText,
  attribute_values: z.record(z.string(), binding),
  archived_at: optionalText
});
const catalogType = dated.extend({
  description: optionalText,
  schema: object.optional(),
  estimated_count: z.number().nullish(),
  is_editable: z.boolean()
});
const statusPageIncident = named.extend({
  status_page_id: text,
  incident_status: text,
  published_at: text,
  updates: z.array(object),
  component_impacts: z.array(object)
});
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'incident.io returned an invalid API response. Try again or check the resource.',
      { reason: 'incident_io_invalid_response' }
    );
  return result.data;
};
export const incidentApiError = (error: unknown) => {
  const result = buildApiServiceError(error, {
    providerLabel: 'incident.io',
    reason: 'incident_io_api_error',
    parent: createApiServiceError('The upstream request failed.'),
    extractUpstreamCode: (_error, response) =>
      isApiErrorRecord(response?.data) && typeof response.data.type === 'string'
        ? response.data.type
        : undefined,
    formatMessage: ({ status }) =>
      `incident.io request failed${status ? ` (HTTP ${status})` : ''}. Check the credentials, API key permissions, resource and request fields.`
  });
  const headers =
    isApiErrorRecord(error) && isApiErrorRecord(error.response)
      ? error.response.headers
      : undefined;
  for (const [key, header] of [
    ['retryAfter', 'Retry-After'],
    ['rateLimit', 'X-RateLimit-Limit'],
    ['rateLimitRemaining', 'X-RateLimit-Remaining'],
    ['rateLimitReset', 'X-RateLimit-Reset']
  ] as const) {
    const value = getResponseHeaderValue(headers, header);
    if (value !== undefined) result.data[key] = value;
  }
  return result;
};
const pathId = (value: string) => {
  if (
    !value.trim() ||
    value === '.' ||
    value === '..' ||
    Array.from(value).some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError('Provide a nonempty resource ID or supported identifier.');
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Provide a valid resource identifier.');
  }
};
const token = (value: string) => {
  if (
    !value.trim() ||
    /\s/.test(value) ||
    Array.from(value).some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError(
      'Provide a valid incident.io credential without spaces or control characters.'
    );
  return value;
};
const query = (values: Record<string, string | number | string[] | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value])
      params.append(key, String(item));
  }
  return params;
};
const window = (start: string, end: string) => {
  if (
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    Date.parse(start) >= Date.parse(end)
  )
    throw createApiServiceError('Provide valid timestamps with the start before the end.');
};
export type CustomFieldValue = {
  value_literal?: string;
  value_link?: string;
  value_catalog_entry_id?: string;
  value_text?: string;
  value_numeric?: string;
  value_option_id?: string;
  value_timestamp?: string;
};
export type IncidentFields = {
  name?: string;
  summary?: string;
  callUrl?: string;
  severityId?: string;
  incidentStatusId?: string;
  customFieldEntries?: Array<{ custom_field_id: string; values: CustomFieldValue[] }>;
  incidentRoleAssignments?: Array<{
    incident_role_id: string;
    assignee: { email?: string; id?: string; slack_user_id?: string };
  }>;
  incidentTimestampValues?: Array<{ incident_timestamp_id: string; value: string }>;
};
export type Attributes = Record<
  string,
  { value?: { literal?: string }; array_value?: Array<{ literal?: string }> }
>;
export type Components = Array<{ component_id: string; component_status: string }>;
export type Paging = { pageSize?: number; after?: string };

const validatePaging = (params?: Paging, maximum = 250) => {
  if (
    params?.pageSize !== undefined &&
    (!Number.isInteger(params.pageSize) || params.pageSize < 1 || params.pageSize > maximum)
  )
    throw createApiServiceError(`pageSize must be an integer from 1 to ${maximum}.`);
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private config: { token: string; alertSourceToken?: string }) {
    this.http = this.connection(token(config.token));
  }
  private connection(secret: string) {
    return createAuthenticatedAxios({
      baseURL: 'https://api.incident.io',
      authHeader: { value: `Bearer ${secret}` },
      timeout: 30_000,
      maxRedirects: 0,
      validateStatus: () => true,
      errorAdapter: incidentApiError
    });
  }
  private async get<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: URLSearchParams
  ): Promise<T> {
    const response = await this.http.get(path, { params });
    if (response.status !== 200) throw incidentApiError({ response });
    return parse(schema, response.data);
  }
  private async write<T>(
    method: 'post' | 'put',
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    status = 200
  ): Promise<T> {
    const response = await this.http[method](path, body);
    if (response.status !== status) throw incidentApiError({ response });
    return parse(schema, response.data);
  }
  private async remove(path: string) {
    const response = await this.http.delete(path);
    if (response.status !== 204) throw incidentApiError({ response });
  }
  async getIdentity() {
    return this.get(
      '/v1/identity',
      z.object({
        identity: z.object({ name: text, dashboard_url: text, roles: z.array(text) })
      })
    );
  }
  async listIncidents(
    params?: Paging & {
      sortBy?: string;
      status?: string[];
      severity?: string[];
      statusCategory?: string[];
      incidentType?: string[];
      mode?: string[];
      createdAtGte?: string;
      createdAtLte?: string;
    }
  ) {
    validatePaging(params);
    return this.get(
      '/v2/incidents',
      z.object({ incidents: z.array(incident), pagination_meta: pagination.optional() }),
      query({
        page_size: params?.pageSize,
        after: params?.after,
        sort_by: params?.sortBy,
        'status[one_of]': params?.status,
        'severity[one_of]': params?.severity,
        'status_category[one_of]': params?.statusCategory,
        'incident_type[one_of]': params?.incidentType,
        'mode[one_of]': params?.mode,
        'created_at[gte]': params?.createdAtGte,
        'created_at[lte]': params?.createdAtLte
      })
    );
  }
  async getIncident(id: string) {
    return this.get(`/v2/incidents/${pathId(id)}`, z.object({ incident }));
  }
  private async incidentBody(data: IncidentFields) {
    let fields = data.customFieldEntries;
    if (fields) {
      const needsLegacy = fields.some(field =>
        field.values.some(value => value.value_literal !== undefined)
      );
      const definitions = needsLegacy
        ? (
            await this.get(
              '/v2/custom_fields',
              z.object({
                custom_fields: z.array(
                  named.extend({ field_type: text, catalog_type_id: optionalText })
                )
              })
            )
          ).custom_fields
        : [];
      fields = fields.map(field => ({
        ...field,
        values: field.values.map(value => {
          if (Object.values(value).filter(value => value !== undefined).length !== 1)
            throw createApiServiceError(
              'Provide exactly one value representation for each custom field value.'
            );
          if (value.value_literal === undefined) return pickDefined(value);
          const definition = definitions.find(
            definition => definition.id === field.custom_field_id
          );
          if (!definition)
            throw createApiServiceError(
              'The custom field was not found. Use its current field ID.'
            );
          const legacy = value.value_literal;
          if (definition.catalog_type_id) return { value_catalog_entry_id: legacy };
          if (definition.field_type === 'text') return { value_text: legacy };
          if (definition.field_type === 'numeric') return { value_numeric: legacy };
          if (definition.field_type === 'link') return { value_link: legacy };
          throw createApiServiceError(
            'For select custom fields, provide valueOptionId; valueLiteral cannot identify an option safely.'
          );
        })
      }));
    }
    return pickDefined({
      name: data.name,
      summary: data.summary,
      call_url: data.callUrl,
      severity_id: data.severityId,
      incident_status_id: data.incidentStatusId,
      custom_field_entries: fields,
      incident_role_assignments: data.incidentRoleAssignments,
      incident_timestamp_values: data.incidentTimestampValues
    });
  }
  async createIncident(
    data: IncidentFields & {
      idempotencyKey: string;
      visibility: 'public' | 'private';
      incidentTypeId?: string;
      mode?: string;
      retrospectiveIncidentOptions?: {
        externalId?: number;
        postmortemDocumentUrl?: string;
        slackChannelId?: string;
      };
    }
  ) {
    return this.write(
      'post',
      '/v2/incidents',
      {
        ...(await this.incidentBody(data)),
        ...pickDefined({
          idempotency_key: data.idempotencyKey,
          visibility: data.visibility,
          incident_type_id: data.incidentTypeId,
          mode: data.mode,
          retrospective_incident_options: data.retrospectiveIncidentOptions
            ? pickDefined({
                external_id: data.retrospectiveIncidentOptions.externalId,
                postmortem_document_url:
                  data.retrospectiveIncidentOptions.postmortemDocumentUrl,
                slack_channel_id: data.retrospectiveIncidentOptions.slackChannelId
              })
            : undefined
        })
      },
      z.object({ incident })
    );
  }
  async editIncident(
    id: string,
    data: { notifyIncidentChannel: boolean; incident: IncidentFields }
  ) {
    const body = await this.incidentBody(data.incident);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one incident field to update.');
    return this.write(
      'post',
      `/v2/incidents/${pathId(id)}/actions/edit`,
      { incident: body, notify_incident_channel: data.notifyIncidentChannel },
      z.object({ incident })
    );
  }
  async listAlerts(
    params?: Paging & { deduplicationKey?: string; alertSourceId?: string; status?: string }
  ) {
    validatePaging(params, 50);
    return this.get(
      '/v2/alerts',
      z.object({
        alerts: z.array(
          z
            .object({
              id: text.min(1),
              alert_source_id: text,
              deduplication_key: text,
              title: optionalText,
              status: optionalText,
              created_at: optionalText
            })
            .passthrough()
        ),
        pagination_meta: pagination
      }),
      query({
        page_size: params?.pageSize ?? 25,
        after: params?.after,
        deduplication_key: params?.deduplicationKey,
        alert_source: params?.alertSourceId,
        status: params?.status
      })
    );
  }
  async createAlertEvent(
    id: string,
    data: {
      title: string;
      status: 'firing' | 'resolved';
      description?: string;
      deduplicationKey?: string;
      metadata?: Record<string, unknown>;
      sourceUrl?: string;
    }
  ) {
    if (!this.config.alertSourceToken || this.config.alertSourceToken === this.config.token)
      throw createApiServiceError(
        'Configure the HTTP alert source secret as alertSourceToken in authentication. The organization API key cannot authenticate alert ingestion.'
      );
    const response = await this.connection(token(this.config.alertSourceToken)).post(
      `/v2/alert_events/http/${pathId(id)}`,
      pickDefined({
        title: data.title,
        status: data.status,
        description: data.description,
        deduplication_key: data.deduplicationKey,
        metadata: data.metadata,
        source_url: data.sourceUrl
      })
    );
    if (response.status !== 202) throw incidentApiError({ response });
    return parse(
      z.object({ status: text.min(1), message: text, deduplication_key: text }),
      response.data
    );
  }
  async listAlertSources() {
    return this.get(
      '/v2/alert_sources',
      z.object({
        alert_sources: z.array(
          named.extend({ source_type: text, alert_events_url: optionalText })
        )
      })
    );
  }
  async listSchedules(params?: Paging) {
    validatePaging(params);
    return this.get(
      '/v2/schedules',
      z.object({ schedules: z.array(schedule), pagination_meta: pagination.optional() }),
      query({ page_size: params?.pageSize, after: params?.after })
    );
  }
  async getSchedule(id: string) {
    return this.get(`/v2/schedules/${pathId(id)}`, z.object({ schedule }));
  }
  async listScheduleEntries(params: {
    scheduleId: string;
    entryWindowStart: string;
    entryWindowEnd: string;
  }) {
    return this.get(
      '/v2/schedule_entries',
      z.object({
        schedule_entries: z.object({
          scheduled: z.array(entry),
          overrides: z.array(entry),
          final: z.array(entry)
        }),
        pagination_meta: pagination.optional()
      }),
      query({
        schedule_id: params.scheduleId,
        entry_window_start: params.entryWindowStart,
        entry_window_end: params.entryWindowEnd
      })
    );
  }
  async createScheduleOverride(data: {
    scheduleId: string;
    startAt: string;
    endAt: string;
    rotationId: string;
    layerId: string;
    userId?: string;
  }) {
    window(data.startAt, data.endAt);
    return this.write(
      'post',
      '/v2/schedule_overrides',
      {
        schedule_id: data.scheduleId,
        rotation_id: data.rotationId,
        layer_id: data.layerId,
        start_at: data.startAt,
        end_at: data.endAt,
        user: data.userId ? { id: data.userId } : {}
      },
      z.object({ override }),
      201
    );
  }
  async listScheduleOverrides(scheduleId: string, params?: Paging) {
    validatePaging(params);
    return this.get(
      '/v2/schedule_overrides',
      z.object({ overrides: z.array(override), pagination_meta: pagination.optional() }),
      query({ schedule_id: scheduleId, page_size: params?.pageSize, after: params?.after })
    );
  }
  async getScheduleOverride(id: string) {
    return this.get(`/v2/schedule_overrides/${pathId(id)}`, z.object({ override }));
  }
  async deleteScheduleOverride(id: string) {
    await this.remove(`/v2/schedule_overrides/${pathId(id)}`);
  }
  async listCatalogTypes() {
    return this.get('/v3/catalog_types', z.object({ catalog_types: z.array(catalogType) }));
  }
  async getCatalogType(id: string) {
    return this.get(
      `/v3/catalog_types/${pathId(id)}`,
      z.object({ catalog_type: catalogType })
    );
  }
  async listCatalogEntries(catalogTypeId: string, params?: Paging) {
    validatePaging(params);
    return this.get(
      '/v3/catalog_entries',
      z.object({
        catalog_entries: z.array(catalogEntry),
        pagination_meta: pagination
      }),
      query({
        catalog_type_id: catalogTypeId,
        page_size: params?.pageSize,
        after: params?.after
      })
    );
  }
  async getCatalogEntry(id: string) {
    return this.get(
      `/v3/catalog_entries/${pathId(id)}`,
      z.object({ catalog_entry: catalogEntry })
    );
  }
  async createCatalogEntry(data: {
    catalogTypeId: string;
    name: string;
    externalId?: string;
    aliases?: string[];
    attributeValues?: Attributes;
  }) {
    return this.write(
      'post',
      '/v3/catalog_entries',
      pickDefined({
        catalog_type_id: data.catalogTypeId,
        name: data.name,
        external_id: data.externalId,
        aliases: data.aliases,
        attribute_values: data.attributeValues ?? {}
      }),
      z.object({ catalog_entry: catalogEntry }),
      201
    );
  }
  async updateCatalogEntry(
    id: string,
    data: {
      name?: string;
      externalId?: string;
      aliases?: string[];
      attributeValues?: Attributes;
    }
  ) {
    if (!Object.values(data).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one catalog entry field to update.');
    const current = (await this.getCatalogEntry(id)).catalog_entry;
    // V3 PUT requires name and attributes; only explicitly supplied attribute keys change.
    return this.write(
      'put',
      `/v3/catalog_entries/${pathId(id)}`,
      pickDefined({
        name: data.name ?? current.name,
        external_id: data.externalId ?? current.external_id,
        aliases: data.aliases ?? current.aliases,
        attribute_values: data.attributeValues ?? {},
        update_attributes: Object.keys(data.attributeValues ?? {})
      }),
      z.object({ catalog_entry: catalogEntry })
    );
  }
  async deleteCatalogEntry(id: string) {
    await this.remove(`/v3/catalog_entries/${pathId(id)}`);
  }
  async listSeverities() {
    return this.get(
      '/v1/severities',
      z.object({
        severities: z.array(
          named.extend({ description: optionalText, rank: z.number().optional() })
        )
      })
    );
  }
  async listIncidentStatuses() {
    return this.get(
      '/v1/incident_statuses',
      z.object({
        incident_statuses: z.array(
          named.extend({
            description: optionalText,
            rank: z.number().optional(),
            category: text
          })
        )
      })
    );
  }
  async listIncidentRoles() {
    return this.get(
      '/v2/incident_roles',
      z.object({
        incident_roles: z.array(
          named.extend({
            description: optionalText,
            required: z.boolean().optional(),
            shortform: optionalText
          })
        )
      })
    );
  }
  async listIncidentTypes() {
    return this.get(
      '/v1/incident_types',
      z.object({
        incident_types: z.array(
          named.extend({ description: optionalText, is_default: z.boolean().optional() })
        )
      })
    );
  }
  async listFollowUps(params?: Paging & { incidentId?: string; incidentMode?: string }) {
    validatePaging(params);
    return this.get(
      '/v3/follow_ups',
      z.object({
        follow_ups: z.array(
          z.object({
            id: text.min(1),
            created_at: text,
            updated_at: text,
            title: text,
            status: text,
            incident_id: text,
            completed_at: optionalText,
            priority: object.nullish(),
            assignee: user.nullish()
          })
        ),
        pagination_meta: pagination
      }),
      query({
        incident_id: params?.incidentId,
        incident_mode: params?.incidentMode,
        page_size: params?.pageSize,
        after: params?.after
      })
    );
  }
  async listStatusPages(params?: Paging) {
    validatePaging(params);
    return this.get(
      '/v2/status_pages',
      z.object({
        status_pages: z.array(
          named.extend({ description: optionalText, public_url: optionalText })
        ),
        pagination_meta: pagination
      }),
      query({ page_size: params?.pageSize, after: params?.after })
    );
  }
  async getStatusPageIncident(id: string) {
    return this.get(
      `/v2/status_page_incidents/${pathId(id)}`,
      z.object({ status_page_incident: statusPageIncident })
    );
  }
  async listStatusPageIncidents(params?: Paging & { statusPageId?: string }) {
    validatePaging(params);
    return this.get(
      '/v2/status_page_incidents',
      z.object({
        status_page_incidents: z.array(statusPageIncident),
        pagination_meta: pagination
      }),
      query({
        status_page_id: params?.statusPageId,
        page_size: params?.pageSize,
        after: params?.after
      })
    );
  }
  async createStatusPageIncident(data: {
    statusPageId: string;
    name: string;
    incidentStatus: string;
    message: string;
    idempotencyKey: string;
    notifySubscribers?: boolean;
    componentStatuses?: Components;
  }) {
    return this.write(
      'post',
      '/v2/status_page_incidents',
      pickDefined({
        status_page_id: data.statusPageId,
        name: data.name,
        incident_status: data.incidentStatus,
        message: data.message,
        idempotency_key: data.idempotencyKey,
        notify_subscribers: data.notifySubscribers ?? false,
        component_statuses: data.componentStatuses
      }),
      z.object({ status_page_incident: statusPageIncident }),
      201
    );
  }
  async updateStatusPageIncident(
    id: string,
    data: {
      name?: string;
      incidentStatus?: string;
      message?: string;
      componentStatuses?: Components;
      notifySubscribers?: boolean;
    }
  ) {
    if (
      (data.incidentStatus !== undefined || data.componentStatuses !== undefined) &&
      data.message === undefined
    )
      throw createApiServiceError(
        'Provide a message when updating the status or components of a status page incident.'
      );
    if (data.name === undefined && data.message === undefined)
      throw createApiServiceError('Provide a name or update message.');
    if (data.name !== undefined)
      await this.write(
        'put',
        `/v2/status_page_incidents/${pathId(id)}`,
        { name: data.name },
        z.object({ status_page_incident: statusPageIncident })
      );
    if (data.message !== undefined)
      await this.postStatusPageIncidentUpdate(id, { ...data, message: data.message });
    return this.getStatusPageIncident(id);
  }
  async postStatusPageIncidentUpdate(
    id: string,
    data: {
      message: string;
      incidentStatus?: string;
      componentStatuses?: Components;
      notifySubscribers?: boolean;
    }
  ) {
    if (data.incidentStatus === 'resolved' && data.componentStatuses !== undefined)
      throw createApiServiceError(
        'Omit componentStatuses when resolving an incident; incident.io restores affected components automatically.'
      );
    return this.write(
      'post',
      '/v2/status_page_incident_updates',
      pickDefined({
        status_page_incident_id: id,
        message: data.message,
        incident_status: data.incidentStatus,
        notify_subscribers: data.notifySubscribers ?? false,
        component_statuses: data.componentStatuses
      }),
      z.object({
        status_page_incident_update: z
          .object({
            id: text.min(1),
            status_page_incident_id: text,
            message: text,
            incident_status: text,
            published_at: text
          })
          .passthrough()
      }),
      201
    );
  }
  async listWorkflows() {
    return this.get(
      '/v2/workflows',
      z.object({
        workflows: z.array(
          named.extend({
            trigger: z.object({ name: text, label: text }),
            state: text,
            runs_on_incidents: text,
            runs_on_incident_modes: z.array(text),
            created_at: optionalText,
            updated_at: optionalText
          })
        )
      })
    );
  }
  async listUsers(params?: Paging) {
    validatePaging(params);
    return this.get(
      '/v2/users',
      z.object({ users: z.array(user), pagination_meta: pagination }),
      query({ page_size: params?.pageSize, after: params?.after })
    );
  }
}
