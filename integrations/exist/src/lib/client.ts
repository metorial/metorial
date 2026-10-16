import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

export let existApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Exist',
    reason: 'exist_api_error',
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure)
  });

export let requireText = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`${label} must not be blank.`);
};

export let validateDate = (value: string | undefined, label: string) => {
  if (value === undefined) return;
  let date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createApiServiceError(`${label} must be a real date in YYYY-MM-DD format.`);
  }
};

let validateQuery = (
  params?: { page?: number; limit?: number; dateMin?: string; dateMax?: string },
  maxLimit?: number
) => {
  for (let [name, value] of [
    ['page', params?.page],
    ['limit', params?.limit]
  ] as const) {
    if (
      value !== undefined &&
      (!Number.isInteger(value) ||
        value < 1 ||
        (name === 'limit' && maxLimit !== undefined && value > maxLimit))
    ) {
      throw createApiServiceError(
        `${name} must be a positive whole number${name === 'limit' && maxLimit !== undefined ? ` at most ${maxLimit}` : ''}.`
      );
    }
  }
  validateDate(params?.dateMin, 'dateMin');
  validateDate(params?.dateMax, 'dateMax');
  if (
    params?.dateMin !== undefined &&
    params?.dateMax !== undefined &&
    params.dateMin > params.dateMax
  ) {
    throw createApiServiceError('dateMin must be on or before dateMax.');
  }
};

let parseResponse = <T extends z.ZodType>(
  schema: T,
  data: unknown,
  operation: string
): z.output<T> => {
  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw createApiServiceError(
      `Exist returned an invalid ${operation} response. Required data is missing or has an unexpected type.`,
      { reason: 'exist_invalid_response' }
    );
  }
  return parsed.data;
};

let groupSchema = z
  .object({ name: z.string(), label: z.string(), priority: z.number() })
  .passthrough();
let valueSchema = z
  .object({ date: z.string(), value: z.union([z.number(), z.string(), z.null()]) })
  .passthrough();
let templateSchema = z
  .object({
    name: z.string(),
    label: z.string(),
    group: groupSchema,
    priority: z.number(),
    value_type: z.number(),
    value_type_description: z.string()
  })
  .passthrough();
let attributeSchema = templateSchema
  .extend({
    template: z.string(),
    manual: z.boolean(),
    active: z.boolean(),
    service: z.object({ name: z.string(), label: z.string() }).passthrough().nullable(),
    values: z.array(valueSchema).optional()
  })
  .passthrough();
let profileSchema = z
  .object({
    username: z.string().min(1),
    first_name: z.string(),
    last_name: z.string(),
    avatar: z.string(),
    timezone: z.string(),
    imperial_distance: z.boolean(),
    imperial_weight: z.boolean(),
    imperial_energy: z.boolean(),
    imperial_liquid: z.boolean(),
    imperial_temperature: z.boolean(),
    trial: z.boolean(),
    delinquent: z.boolean(),
    local_time: z.string().optional()
  })
  .passthrough();
let correlationSchema = z
  .object({
    date: z.string(),
    period: z.number(),
    attribute: z.string(),
    attribute2: z.string(),
    value: z.number(),
    p: z.number(),
    percentage: z.number(),
    stars: z.number(),
    second_person: z.string(),
    second_person_elements: z.array(z.string()),
    attribute_category: z.string().nullable(),
    strength_description: z.string(),
    stars_description: z.string(),
    description: z.string().nullable()
  })
  .passthrough();
let insightSchema = z
  .object({
    created: z.string(),
    target_date: z.string(),
    type: z
      .object({
        name: z.string(),
        period: z.number(),
        priority: z.number(),
        attribute: z
          .object({
            name: z.string(),
            label: z.string(),
            group: z.object({ name: z.string(), label: z.string() }).passthrough()
          })
          .passthrough()
      })
      .passthrough(),
    html: z.string(),
    text: z.string()
  })
  .passthrough();
let averageSchema = z
  .object({
    attribute: z.string(),
    date: z.string(),
    overall: z.number(),
    monday: z.number(),
    tuesday: z.number(),
    wednesday: z.number(),
    thursday: z.number(),
    friday: z.number(),
    saturday: z.number(),
    sunday: z.number()
  })
  .passthrough();
let paginatedSchema = <T extends z.ZodType>(item: T) =>
  z
    .object({
      count: z.number().int().nonnegative(),
      next: z.string().nullable(),
      previous: z.string().nullable(),
      results: z.array(item)
    })
    .passthrough();
let writeResultSchema = z
  .object({
    success: z.array(z.record(z.string(), z.unknown())),
    failed: z.array(z.object({ error: z.string(), error_code: z.string() }).passthrough())
  })
  .passthrough();

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  [key: string]: unknown;
};
export type UserProfile = z.infer<typeof profileSchema>;
export type AttributeTemplate = z.infer<typeof templateSchema>;
export type AttributeValue = z.infer<typeof valueSchema>;
export type Attribute = z.infer<typeof attributeSchema>;
export type Correlation = z.infer<typeof correlationSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type Average = z.infer<typeof averageSchema>;
export type WriteResult = z.infer<typeof writeResultSchema>;

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private authType: string;

  constructor(config: { token: string; authType?: string }) {
    requireText(config.token, 'Exist access token');
    this.authType = config.authType ?? 'oauth';
    this.http = createAuthenticatedAxios({
      baseURL: 'https://exist.io/api/2',
      timeout: 30_000,
      authHeader: {
        value: `${this.authType === 'simple_token' ? 'Token' : 'Bearer'} ${config.token}`
      },
      errorAdapter: existApiError
    });
  }

  private requireWriteAuth() {
    if (this.authType === 'simple_token') {
      throw createApiServiceError(
        'This operation requires an OAuth2 connection with the appropriate write scope. Username and password connections are read-only.'
      );
    }
  }

  async getProfile(): Promise<UserProfile> {
    let response = await this.http.get('/accounts/profile/');
    return parseResponse(profileSchema, response.data, 'getProfile');
  }

  async getAttributes(params?: {
    groups?: string;
    attributes?: string;
    limit?: number;
    page?: number;
    owned?: boolean;
    manual?: boolean;
    includeInactive?: boolean;
    excludeCustom?: boolean;
    includeLowPriority?: boolean;
  }): Promise<PaginatedResponse<Attribute>> {
    validateQuery(params);
    let response = await this.http.get('/attributes/', {
      params: {
        groups: params?.groups,
        attributes: params?.attributes,
        limit: params?.limit,
        page: params?.page,
        owned: params?.owned,
        manual: params?.manual,
        include_inactive: params?.includeInactive,
        exclude_custom: params?.excludeCustom,
        include_low_priority: params?.includeLowPriority
      }
    });
    return parseResponse(paginatedSchema(attributeSchema), response.data, 'getAttributes');
  }

  async getAttributesWithValues(params?: {
    groups?: string;
    attributes?: string;
    days?: number;
    templates?: string;
    manual?: boolean;
    dateMax?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Attribute>> {
    if (
      params?.days !== undefined &&
      (!Number.isInteger(params.days) || params.days < 1 || params.days > 31)
    ) {
      throw createApiServiceError('days must be a whole number between 1 and 31.');
    }
    if (params?.attributes !== undefined && params?.templates !== undefined) {
      throw createApiServiceError(
        'Use either attributeNames or templateNames when including values.'
      );
    }
    validateQuery(params);
    let response = await this.http.get('/attributes/with-values/', {
      params: {
        groups: params?.groups,
        attributes: params?.attributes,
        days: params?.days,
        templates: params?.templates,
        manual: params?.manual,
        date_max: params?.dateMax,
        limit: params?.limit,
        page: params?.page
      }
    });
    return parseResponse(
      paginatedSchema(attributeSchema),
      response.data,
      'getAttributesWithValues'
    );
  }

  async getAttributeValues(params: {
    attribute: string;
    limit?: number;
    page?: number;
    dateMin?: string;
    dateMax?: string;
  }): Promise<PaginatedResponse<AttributeValue>> {
    requireText(params.attribute, 'attributeName');
    validateQuery(params, 100);
    let response = await this.http.get('/attributes/values/', {
      params: {
        attribute: params.attribute,
        limit: params.limit,
        page: params.page,
        date_min: params.dateMin,
        date_max: params.dateMax
      }
    });
    return parseResponse(paginatedSchema(valueSchema), response.data, 'getAttributeValues');
  }

  async getAttributeTemplates(params?: {
    groups?: string;
    includeLowPriority?: boolean;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<AttributeTemplate>> {
    validateQuery(params);
    let response = await this.http.get('/attributes/templates/', {
      params: {
        groups: params?.groups,
        include_low_priority: params?.includeLowPriority,
        limit: params?.limit,
        page: params?.page
      }
    });
    return parseResponse(
      paginatedSchema(templateSchema),
      response.data,
      'getAttributeTemplates'
    );
  }

  async acquireAttributes(
    attributes: Array<{ template?: string; name?: string; manual?: boolean }>
  ): Promise<WriteResult> {
    this.requireWriteAuth();
    for (let attribute of attributes) {
      if (!attribute.template && !attribute.name)
        throw createApiServiceError(
          'Each acquisition requires templateName or attributeName. Use get_attribute_templates or get_attributes to discover names.'
        );
      if (attribute.template !== undefined) requireText(attribute.template, 'templateName');
      if (attribute.name !== undefined) requireText(attribute.name, 'attributeName');
    }
    let response = await this.http.post('/attributes/acquire/', attributes, {
      params: { success_objects: 1 }
    });
    return parseResponse(writeResultSchema, response.data, 'acquireAttributes');
  }

  async releaseAttributes(attributes: Array<{ name: string }>): Promise<WriteResult> {
    this.requireWriteAuth();
    for (let attribute of attributes) requireText(attribute.name, 'attributeName');
    let response = await this.http.post('/attributes/release/', attributes);
    return parseResponse(writeResultSchema, response.data, 'releaseAttributes');
  }

  async getOwnedAttributes(params?: {
    groups?: string;
    manual?: boolean;
    includeInactive?: boolean;
    excludeCustom?: boolean;
    includeLowPriority?: boolean;
    attributes?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Attribute>> {
    this.requireWriteAuth();
    validateQuery(params);
    let response = await this.http.get('/attributes/owned/', {
      params: {
        groups: params?.groups,
        manual: params?.manual,
        include_inactive: params?.includeInactive,
        exclude_custom: params?.excludeCustom,
        include_low_priority: params?.includeLowPriority,
        attributes: params?.attributes,
        limit: params?.limit,
        page: params?.page
      }
    });
    return parseResponse(
      paginatedSchema(attributeSchema),
      response.data,
      'getOwnedAttributes'
    );
  }

  async createAttributes(
    attributes: Array<{
      template?: string;
      label?: string;
      group?: string;
      valueType?: number;
      manual?: boolean;
    }>
  ): Promise<WriteResult> {
    this.requireWriteAuth();
    let payload = attributes.map(attr => {
      if (attr.template !== undefined) requireText(attr.template, 'templateName');
      if (!attr.template) {
        if (
          attr.label === undefined ||
          attr.group === undefined ||
          attr.valueType === undefined
        )
          throw createApiServiceError(
            'Custom attributes require label, group, and valueType. Use get_attribute_templates to discover supported groups and templates.'
          );
        requireText(attr.label, 'label');
        requireText(attr.group, 'group');
        if (
          !Number.isInteger(attr.valueType) ||
          ![0, 1, 2, 3, 4, 5, 7, 8].includes(attr.valueType)
        )
          throw createApiServiceError(
            'valueType must be one of 0, 1, 2, 3, 4, 5, 7, or 8. Type 6 is reserved for templates.'
          );
      }
      if (attr.template) {
        return pickDefined({ template: attr.template, manual: attr.manual });
      }
      return pickDefined({
        label: attr.label,
        group: attr.group,
        value_type: attr.valueType,
        manual: attr.manual
      });
    });
    let response = await this.http.post('/attributes/create/', payload, {
      params: { success_objects: 1 }
    });
    return parseResponse(writeResultSchema, response.data, 'createAttributes');
  }

  async updateAttributeValues(
    updates: Array<{ name: string; date: string; value: number | string }>
  ): Promise<WriteResult> {
    this.requireWriteAuth();
    for (let update of updates) {
      requireText(update.name, 'attributeName');
      validateDate(update.date, 'date');
    }
    let response = await this.http.post('/attributes/update/', updates);
    return parseResponse(writeResultSchema, response.data, 'updateAttributeValues');
  }

  async incrementAttributeValues(
    increments: Array<{ name: string; date?: string; value: number }>
  ): Promise<WriteResult> {
    this.requireWriteAuth();
    for (let increment of increments) {
      requireText(increment.name, 'attributeName');
      validateDate(increment.date, 'date');
    }
    let response = await this.http.post('/attributes/increment/', increments);
    return parseResponse(writeResultSchema, response.data, 'incrementAttributeValues');
  }

  async getCorrelations(params?: {
    attribute?: string;
    limit?: number;
    page?: number;
    strong?: boolean;
    confident?: boolean;
  }): Promise<PaginatedResponse<Correlation>> {
    validateQuery(params, 100);
    let response = await this.http.get('/correlations/', {
      params: {
        attribute: params?.attribute,
        limit: params?.limit,
        page: params?.page,
        strong: params?.strong === undefined ? undefined : Number(params.strong),
        confident: params?.confident === undefined ? undefined : Number(params.confident)
      }
    });
    return parseResponse(paginatedSchema(correlationSchema), response.data, 'getCorrelations');
  }

  async getCorrelationCombo(params: {
    attribute: string;
    attribute2: string;
  }): Promise<Correlation> {
    requireText(params.attribute, 'firstAttribute');
    requireText(params.attribute2, 'secondAttribute');
    let response = await this.http.get('/correlations/combo/', {
      params: {
        attribute: params.attribute,
        attribute2: params.attribute2
      }
    });
    return parseResponse(correlationSchema, response.data, 'getCorrelationCombo');
  }

  async getInsights(params?: {
    limit?: number;
    page?: number;
    dateMin?: string;
    dateMax?: string;
    priority?: number;
  }): Promise<PaginatedResponse<Insight>> {
    if (
      params?.priority !== undefined &&
      (!Number.isInteger(params.priority) || params.priority < 1 || params.priority > 4)
    )
      throw createApiServiceError('priority must be a whole number from 1 through 4.');
    validateQuery(params, 100);
    let response = await this.http.get('/insights/', {
      params: {
        limit: params?.limit,
        page: params?.page,
        date_min: params?.dateMin,
        date_max: params?.dateMax,
        priority: params?.priority
      }
    });
    return parseResponse(paginatedSchema(insightSchema), response.data, 'getInsights');
  }

  async getAverages(params?: {
    groups?: string;
    attributes?: string;
    limit?: number;
    page?: number;
    dateMin?: string;
    dateMax?: string;
    includeHistorical?: boolean;
  }): Promise<PaginatedResponse<Average>> {
    validateQuery(params);
    let response = await this.http.get('/averages/', {
      params: {
        groups: params?.groups,
        attributes: params?.attributes,
        limit: params?.limit,
        page: params?.page,
        date_min: params?.dateMin,
        date_max: params?.dateMax,
        include_historical: params?.includeHistorical
      }
    });
    return parseResponse(paginatedSchema(averageSchema), response.data, 'getAverages');
  }
}
