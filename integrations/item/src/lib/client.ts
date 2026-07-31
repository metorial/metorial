import crypto from 'node:crypto';
import { createApiServiceError, createAuthenticatedAxios, requestAxiosData } from 'slates';
import { itemApiError } from './errors';

export { itemApiError } from './errors';

const BASE_URL = 'https://app.useitem.io';
export const MAX_WEBHOOK_PAYLOAD_BYTES = 1_000_000;

export type ItemRecord = Record<string, unknown>;

export type ItemPagination = {
  total?: number;
  limit?: number;
  offset?: number;
  has_more?: boolean;
};

export type ItemBatchObjectInput = {
  name: string;
  matchBy?: 'id' | 'email' | 'name';
  matchValue?: string | number;
  fields?: Record<string, unknown>;
  profileImageUrl?: string;
};

export type ItemBatchResult = {
  id: number | null;
  status: 'created' | 'updated' | 'failed';
  error?: string;
};

export type ItemBatchSummary = {
  total: number;
  created: number;
  updated: number;
  failed: number;
};

export type ItemFieldDefinition = {
  field_name: string;
  display_name: string;
  field_type: string;
  field_order?: number;
  is_required?: boolean;
  description?: string | null;
  select_options?: Array<{
    label: string;
    value: string;
    color?: string | null;
  }> | null;
  allow_multiple?: boolean | null;
  related_object_type_id?: number | null;
  relationship_type?: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many' | null;
  number_min?: number | null;
  number_max?: number | null;
  number_decimal_places?: number | null;
  currency_decimal_places?: number | null;
  default_value?: string | null;
  visibility_type?: string;
};

export type ItemObjectTypeSchema = {
  id: number;
  slug: string;
  display_name: string;
  plural_display_name?: string | null;
  description?: string | null;
  icon?: string | null;
  fields?: ItemFieldDefinition[];
};

export type ItemOrganizationUser = {
  id: string;
  full_name?: string | null;
  access_level: 'admin' | 'member';
};

export type ItemView = {
  id: string;
  name: string;
  view_type: 'table' | 'kanban';
  columns: string[];
};

export type ItemWebhookResult = {
  success: true;
  skillRunId: string;
  message?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const malformedResponse = (operation: string, detail: string) =>
  createApiServiceError(
    `Item API ${operation} returned a malformed success response: ${detail}`,
    {
      reason: 'item_malformed_success_response'
    }
  );

const requireRecord = (
  value: unknown,
  operation: string,
  label: string
): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw malformedResponse(operation, `${label} must be an object.`);
  }

  return value;
};

const requireDataArray = (value: unknown, operation: string): unknown[] => {
  let envelope = requireRecord(value, operation, 'response');
  if (!Array.isArray(envelope.data)) {
    throw malformedResponse(operation, 'data must be an array.');
  }

  return envelope.data;
};

const requireItemRecord = (value: unknown, operation: string): ItemRecord => {
  let envelope = requireRecord(value, operation, 'response');
  return requireRecord(envelope.data, operation, 'data');
};

const optionalNonnegativeInteger = (
  value: unknown,
  operation: string,
  label: string
): number | undefined => {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw malformedResponse(operation, `${label} must be a non-negative integer.`);
  }
  return value as number;
};

const parsePagination = (value: unknown, operation: string): ItemPagination | undefined => {
  if (value === undefined) return undefined;
  let pagination = requireRecord(value, operation, 'pagination');

  if (pagination.has_more !== undefined && typeof pagination.has_more !== 'boolean') {
    throw malformedResponse(operation, 'pagination.has_more must be a boolean.');
  }

  return {
    total: optionalNonnegativeInteger(pagination.total, operation, 'pagination.total'),
    limit: optionalNonnegativeInteger(pagination.limit, operation, 'pagination.limit'),
    offset: optionalNonnegativeInteger(pagination.offset, operation, 'pagination.offset'),
    has_more: pagination.has_more as boolean | undefined
  };
};

const parseObjectRecords = (value: unknown[], operation: string): ItemRecord[] =>
  value.map((record, index) => requireRecord(record, operation, `data[${index}]`));

const parseUuid = (value: unknown, operation: string, label: string): string => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw malformedResponse(operation, `${label} must be a UUID.`);
  }
  return value;
};

const requireString = (value: unknown, operation: string, label: string): string => {
  if (typeof value !== 'string') {
    throw malformedResponse(operation, `${label} must be a string.`);
  }
  return value;
};

const requirePositiveInteger = (value: unknown, operation: string, label: string): number => {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw malformedResponse(operation, `${label} must be a positive integer.`);
  }
  return value as number;
};

const RELATIONSHIP_TYPES = [
  'one_to_one',
  'one_to_many',
  'many_to_one',
  'many_to_many'
] as const;

const parseFieldDefinition = (
  value: unknown,
  operation: string,
  label: string
): ItemFieldDefinition => {
  let field = requireRecord(value, operation, label);
  let selectOptions = field.select_options;

  if (selectOptions !== undefined && selectOptions !== null) {
    if (!Array.isArray(selectOptions)) {
      throw malformedResponse(operation, `${label}.select_options must be an array or null.`);
    }

    selectOptions.forEach((option, index) => {
      let entry = requireRecord(option, operation, `${label}.select_options[${index}]`);
      requireString(entry.label, operation, `${label}.select_options[${index}].label`);
      requireString(entry.value, operation, `${label}.select_options[${index}].value`);
    });
  }

  if (
    field.relationship_type !== undefined &&
    field.relationship_type !== null &&
    !RELATIONSHIP_TYPES.includes(
      field.relationship_type as (typeof RELATIONSHIP_TYPES)[number]
    )
  ) {
    throw malformedResponse(operation, `${label}.relationship_type is invalid.`);
  }

  return {
    ...field,
    field_name: requireString(field.field_name, operation, `${label}.field_name`),
    display_name: requireString(field.display_name, operation, `${label}.display_name`),
    field_type: requireString(field.field_type, operation, `${label}.field_type`)
  } as ItemFieldDefinition;
};

const parseObjectTypeSchema = (
  value: unknown,
  operation: string,
  label: string
): ItemObjectTypeSchema => {
  let objectType = requireRecord(value, operation, label);
  let fields = objectType.fields;

  if (fields !== undefined && fields !== null && !Array.isArray(fields)) {
    throw malformedResponse(operation, `${label}.fields must be an array.`);
  }

  let fieldList: unknown[] = Array.isArray(fields) ? fields : [];

  return {
    ...objectType,
    id: requirePositiveInteger(objectType.id, operation, `${label}.id`),
    slug: requireString(objectType.slug, operation, `${label}.slug`),
    display_name: requireString(objectType.display_name, operation, `${label}.display_name`),
    fields: fieldList.map((field, index) =>
      parseFieldDefinition(field, operation, `${label}.fields[${index}]`)
    )
  } as ItemObjectTypeSchema;
};

const encodePathSegment = (value: string, label: string) => {
  if (!value.trim()) {
    throw createApiServiceError(`${label} must be a non-empty path segment.`, {
      reason: 'item_path_segment_invalid'
    });
  }
  return encodeURIComponent(value);
};

export const serializeWebhookPayload = (payload: Record<string, unknown>) => {
  let rawBody: string;
  try {
    rawBody = JSON.stringify(payload);
  } catch (error) {
    throw createApiServiceError('Webhook payload must be JSON serializable.', {
      reason: 'item_webhook_payload_not_serializable',
      parent: error
    });
  }

  let byteLength = Buffer.byteLength(rawBody, 'utf8');
  if (byteLength > MAX_WEBHOOK_PAYLOAD_BYTES) {
    throw createApiServiceError(
      `Webhook payload must be at most ${MAX_WEBHOOK_PAYLOAD_BYTES} UTF-8 bytes; received ${byteLength} bytes.`,
      { reason: 'item_webhook_payload_too_large' }
    );
  }

  return { rawBody, byteLength };
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: {
        name: 'x-api-key',
        value: config.token
      }
    });
  }

  private request<T>(operation: string, request: Parameters<typeof requestAxiosData<T>>[1]) {
    return requestAxiosData<T>(operation, request, (error, requestOperation) =>
      itemApiError(error, requestOperation, this.config.token)
    );
  }

  async listObjects(
    objectType: string,
    params?: {
      limit?: number;
      offset?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters?: Record<string, string | number | boolean>;
    }
  ): Promise<{ data: ItemRecord[]; pagination?: ItemPagination }> {
    let query: Record<string, string | number | boolean> = {};

    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.search !== undefined) query.search = params.search;
    if (params?.sortBy !== undefined) query.sort_by = params.sortBy;
    if (params?.sortOrder !== undefined) query.sort_order = params.sortOrder;

    for (let [fieldName, fieldValue] of Object.entries(params?.filters ?? {})) {
      query[`filter[${fieldName}]`] = String(fieldValue);
    }

    let operation = 'list objects';
    let response = await this.request<unknown>(operation, () =>
      this.http.get(`/api/objects/${encodePathSegment(objectType, 'objectType')}`, {
        params: query
      })
    );
    let envelope = requireRecord(response, operation, 'response');

    if (!Array.isArray(envelope.data)) {
      throw malformedResponse(operation, 'data must be an array.');
    }

    return {
      data: parseObjectRecords(envelope.data, operation),
      pagination: parsePagination(envelope.pagination, operation)
    };
  }

  async getObject(
    objectType: string,
    params: {
      objectId?: number;
      email?: string;
      includeAllFields?: boolean;
      includeSummary?: boolean;
    }
  ): Promise<ItemRecord> {
    let query: Record<string, string | number | boolean> = {};

    if (params.objectId !== undefined) query.id = params.objectId;
    if (params.email !== undefined) query.email = params.email;
    if (params.includeAllFields !== undefined) {
      query.include_all_fields = params.includeAllFields;
    }
    if (params.includeSummary !== undefined) query.include_summary = params.includeSummary;

    let operation = 'get object';
    let response = await this.request<unknown>(operation, () =>
      this.http.get(`/api/objects/${encodePathSegment(objectType, 'objectType')}`, {
        params: query
      })
    );
    return requireItemRecord(response, operation);
  }

  async createObject(
    objectType: string,
    body: {
      name: string;
      fields?: Record<string, unknown>;
      profileImageUrl?: string;
    }
  ): Promise<ItemRecord> {
    let operation = 'create object';
    let response = await this.request<unknown>(operation, () =>
      this.http.put(`/api/objects/${encodePathSegment(objectType, 'objectType')}`, {
        name: body.name,
        fields: body.fields,
        profile_image_url: body.profileImageUrl
      })
    );
    return requireItemRecord(response, operation);
  }

  async updateObject(
    objectType: string,
    body: {
      objectId?: number;
      email?: string;
      name?: string;
      fields?: Record<string, unknown>;
      profileImageUrl?: string;
    }
  ): Promise<ItemRecord> {
    let operation = 'update object';
    let response = await this.request<unknown>(operation, () =>
      this.http.patch(`/api/objects/${encodePathSegment(objectType, 'objectType')}`, {
        id: body.objectId,
        email: body.email,
        name: body.name,
        fields: body.fields,
        profile_image_url: body.profileImageUrl
      })
    );
    return requireItemRecord(response, operation);
  }

  async deleteObject(objectType: string, objectId: number): Promise<{ success: true }> {
    let operation = 'delete object';
    let response = await this.request<unknown>(operation, () =>
      this.http.delete(`/api/objects/${encodePathSegment(objectType, 'objectType')}`, {
        data: { id: objectId }
      })
    );
    let envelope = requireRecord(response, operation, 'response');

    if (envelope.success !== true) {
      throw malformedResponse(operation, 'success must be true.');
    }

    return { success: true };
  }

  async batchUpsertObjects(
    objectType: string,
    objects: ItemBatchObjectInput[]
  ): Promise<{ results: ItemBatchResult[]; summary: ItemBatchSummary }> {
    let operation = 'batch upsert objects';
    let response = await this.request<unknown>(operation, () =>
      this.http.post(`/api/objects/${encodePathSegment(objectType, 'objectType')}/batch`, {
        objects: objects.map(object => ({
          name: object.name,
          match_by: object.matchBy,
          match_value: object.matchValue,
          fields: object.fields,
          profile_image_url: object.profileImageUrl
        }))
      })
    );
    let envelope = requireRecord(response, operation, 'response');
    if (!Array.isArray(envelope.results) || envelope.results.length !== objects.length) {
      throw malformedResponse(
        operation,
        `results must contain exactly ${objects.length} entries.`
      );
    }

    let results = envelope.results.map((value, index): ItemBatchResult => {
      let result = requireRecord(value, operation, `results[${index}]`);
      if (!['created', 'updated', 'failed'].includes(String(result.status))) {
        throw malformedResponse(
          operation,
          `results[${index}].status must be created, updated, or failed.`
        );
      }
      if (result.id !== null && (!Number.isInteger(result.id) || (result.id as number) <= 0)) {
        throw malformedResponse(
          operation,
          `results[${index}].id must be a positive integer or null.`
        );
      }
      if (result.error !== undefined && typeof result.error !== 'string') {
        throw malformedResponse(operation, `results[${index}].error must be a string.`);
      }

      return {
        id: result.id as number | null,
        status: result.status as ItemBatchResult['status'],
        error: result.error as string | undefined
      };
    });

    let summary = results.reduce<ItemBatchSummary>(
      (counts, result) => {
        counts[result.status] += 1;
        return counts;
      },
      { total: results.length, created: 0, updated: 0, failed: 0 }
    );

    return { results, summary };
  }

  async getSchema(): Promise<ItemObjectTypeSchema[]> {
    let operation = 'get schema';
    let response = await this.request<unknown>(operation, () =>
      this.http.get('/api/meta/schema')
    );
    return requireDataArray(response, operation).map((value, index) =>
      parseObjectTypeSchema(value, operation, `data[${index}]`)
    );
  }

  async listUsers(): Promise<ItemOrganizationUser[]> {
    let operation = 'list users';
    let response = await this.request<unknown>(operation, () =>
      this.http.get('/api/meta/users')
    );

    return requireDataArray(response, operation).map((value, index) => {
      let user = requireRecord(value, operation, `data[${index}]`);
      let id = parseUuid(user.id, operation, `data[${index}].id`);
      if (
        user.full_name !== undefined &&
        user.full_name !== null &&
        typeof user.full_name !== 'string'
      ) {
        throw malformedResponse(
          operation,
          `data[${index}].full_name must be a string or null.`
        );
      }
      if (user.access_level !== 'admin' && user.access_level !== 'member') {
        throw malformedResponse(operation, `data[${index}].access_level is invalid.`);
      }

      return {
        id,
        full_name: user.full_name as string | null | undefined,
        access_level: user.access_level
      };
    });
  }

  async listViews(objectType: string): Promise<ItemView[]> {
    let operation = 'list views';
    let response = await this.request<unknown>(operation, () =>
      this.http.get(`/api/objects/${encodePathSegment(objectType, 'objectType')}/views`)
    );

    return requireDataArray(response, operation).map((value, index) => {
      let view = requireRecord(value, operation, `data[${index}]`);
      let id = parseUuid(view.id, operation, `data[${index}].id`);
      if (typeof view.name !== 'string') {
        throw malformedResponse(operation, `data[${index}].name must be a string.`);
      }
      if (view.view_type !== 'table' && view.view_type !== 'kanban') {
        throw malformedResponse(operation, `data[${index}].view_type is invalid.`);
      }
      if (
        !Array.isArray(view.columns) ||
        view.columns.some(column => typeof column !== 'string')
      ) {
        throw malformedResponse(
          operation,
          `data[${index}].columns must be an array of strings.`
        );
      }

      return {
        id,
        name: view.name,
        view_type: view.view_type,
        columns: view.columns as string[]
      };
    });
  }

  async executeView(
    objectType: string,
    viewId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    data: ItemRecord[];
    view?: { id?: string; name?: string };
    pagination?: ItemPagination;
  }> {
    let operation = 'execute view';
    let response = await this.request<unknown>(operation, () =>
      this.http.get(
        `/api/objects/${encodePathSegment(objectType, 'objectType')}/views/${encodePathSegment(viewId, 'viewId')}`,
        { params }
      )
    );
    let envelope = requireRecord(response, operation, 'response');
    if (!Array.isArray(envelope.data)) {
      throw malformedResponse(operation, 'data must be an array.');
    }

    let view: { id?: string; name?: string } | undefined;
    if (envelope.view !== undefined) {
      let rawView = requireRecord(envelope.view, operation, 'view');
      if (rawView.id !== undefined) parseUuid(rawView.id, operation, 'view.id');
      if (rawView.name !== undefined && typeof rawView.name !== 'string') {
        throw malformedResponse(operation, 'view.name must be a string.');
      }
      view = {
        id: rawView.id as string | undefined,
        name: rawView.name as string | undefined
      };
    }

    return {
      data: parseObjectRecords(envelope.data, operation),
      view,
      pagination: parsePagination(envelope.pagination, operation)
    };
  }

  async triggerSkillWebhook(
    skillId: string,
    payload: Record<string, unknown>,
    options?: {
      signPayload?: boolean;
    }
  ): Promise<ItemWebhookResult> {
    let { rawBody } = serializeWebhookPayload(payload);
    let headers: Record<string, string> = {};

    if (options?.signPayload === true) {
      let signature = crypto
        .createHmac('sha256', this.config.token)
        .update(rawBody, 'utf8')
        .digest('hex');
      headers['x-webhook-signature'] = `sha256=${signature}`;
    }

    let operation = 'trigger skill webhook';
    let response = await this.request<unknown>(operation, () =>
      this.http.post(`/api/webhooks/${encodePathSegment(skillId, 'skillId')}`, rawBody, {
        headers
      })
    );
    let result = requireRecord(response, operation, 'response');
    if (result.success !== true) {
      throw malformedResponse(operation, 'success must be true.');
    }
    let skillRunId = parseUuid(result.skillRunId, operation, 'skillRunId');
    if (result.message !== undefined && typeof result.message !== 'string') {
      throw malformedResponse(operation, 'message must be a string.');
    }

    return {
      success: true,
      skillRunId,
      message: result.message as string | undefined
    };
  }
}
