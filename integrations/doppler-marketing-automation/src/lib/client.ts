import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface ClientConfig {
  token: string;
  accountEmail: string;
}

export let rawSchema = z.record(z.string(), z.unknown());
let fieldValueSchema = z
  .object({ name: z.string(), value: z.string().nullable().optional() })
  .passthrough();
let subscriberSchema = z
  .object({
    email: z.string(),
    fields: z.array(fieldValueSchema).optional(),
    status: z.string().nullable().optional(),
    score: z.number().int().optional(),
    unsubscribedDate: z.string().nullable().optional(),
    unsubscriptionDate: z.string().nullable().optional(),
    unsubscriptionType: z.string().nullable().optional()
  })
  .passthrough();
let listSchema = z
  .object({
    listId: z.number().int(),
    name: z.string(),
    currentStatus: z.string(),
    subscribersCount: z.number().int(),
    creationDate: z.string()
  })
  .passthrough();
let campaignSchema = z
  .object({
    campaignId: z.number().int(),
    name: z.string(),
    fromName: z.string(),
    fromEmail: z.string(),
    subject: z.string(),
    status: z.string(),
    preheader: z.string().nullable().optional(),
    replyTo: z.string().nullable().optional(),
    scheduledDate: z.string().nullable().optional()
  })
  .passthrough();
let fieldSchema = z
  .object({
    name: z.string(),
    type: z.string(),
    predefined: z.boolean().optional(),
    private: z.boolean(),
    readonly: z.boolean(),
    sample: z.string().optional(),
    sampleValue: z.string().optional()
  })
  .passthrough();
let creationSchema = z
  .object({ createdResourceId: z.string(), message: z.string() })
  .passthrough();
let messageSchema = z.object({ message: z.string() }).passthrough();
let recipientSchema = z
  .object({
    lists: z
      .array(
        z.object({ id: z.number(), name: z.string().nullable().optional() }).passthrough()
      )
      .optional(),
    segments: z
      .array(
        z.object({ id: z.number(), name: z.string().nullable().optional() }).passthrough()
      )
      .optional()
  })
  .passthrough();
let taskSchema = z
  .object({
    taskId: z.string(),
    taskType: z.string(),
    status: z.string(),
    itemsProcessed: z.number().int().optional(),
    startDate: z.string().optional(),
    finishDate: z.string().optional(),
    importDetails: rawSchema.optional()
  })
  .passthrough();

export interface FieldValue {
  name: string;
  value: string;
}
type CampaignInput = {
  name: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preheader?: string | null;
  replyTo?: string | null;
};

let parse = <T>(schema: z.ZodType<T>, data: unknown, resource: string): T => {
  let result = schema.safeParse(data);
  if (!result.success)
    throw createApiServiceError(`Doppler returned an invalid ${resource} response.`, {
      reason: 'invalid_doppler_response'
    });
  return result.data;
};

export let requireInteger = (value: number, field: string, maximum = 2147483647): number => {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    throw createApiServiceError(
      `${field} must be a positive integer no greater than ${maximum}.`
    );
  return value;
};
let requireText = (value: string, field: string, maximum: number): string => {
  if (!value.trim() || value.length > maximum)
    throw createApiServiceError(`${field} must contain between 1 and ${maximum} characters.`);
  return value;
};
let validateEmail = (value: string, field = 'email'): string => {
  if (!z.email().safeParse(value).success || value.length > 100)
    throw createApiServiceError(
      `${field} must be a valid email address of at most 100 characters.`
    );
  return value;
};
let validateDate = (value: string | undefined, field: string) => {
  if (value !== undefined && !z.iso.datetime({ offset: true }).safeParse(value).success)
    throw createApiServiceError(`${field} must be an ISO 8601 date and time with a timezone.`);
};
let validateRange = (from?: string, to?: string) => {
  validateDate(from, 'from');
  validateDate(to, 'to');
  if (from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to))
    throw createApiServiceError('from must be earlier than or equal to to.');
};
let pagination = (page?: number, pageSize?: number) => {
  if (page !== undefined) requireInteger(page, 'page');
  if (pageSize !== undefined) requireInteger(pageSize, 'pageSize', 100);
  return pickDefined({ page, per_page: pageSize });
};
let validateFields = (fields?: FieldValue[]) => {
  for (let field of fields ?? []) {
    requireText(field.name, 'field name', 50);
    if (!/^[0-9a-zA-ZñÑ_-]+$/.test(field.name))
      throw createApiServiceError(
        'Field names must contain only letters, digits, underscores, or hyphens.'
      );
    if (field.value.length > 400)
      throw createApiServiceError('Field values must be at most 400 characters.');
  }
};

export let redactProviderData = <T>(value: T, token: string): T => {
  let redact = (item: unknown): unknown => {
    if (typeof item === 'string') {
      let result = item;
      for (let secret of [token, encodeURIComponent(token)])
        if (secret) result = result.split(secret).join('[REDACTED]');
      return result.replace(
        /([?&](?:access_token|refresh_token|api[_-]?(?:key|token)|token|client_secret|secret|password|authorization)=)[^&#\s]*/gi,
        '$1[REDACTED]'
      );
    }
    if (Array.isArray(item)) return item.map(redact);
    if (isApiErrorRecord(item))
      return Object.fromEntries(
        Object.entries(item).map(([key, field]) => [
          key,
          /^(?:authorization|access[_-]?token|refresh[_-]?token|api[_-]?(?:key|token)|token|secret|client[_-]?secret|password|cookie|set-cookie)$/i.test(
            key
          ) &&
          field !== null &&
          field !== undefined
            ? '[REDACTED]'
            : redact(field)
        ])
      );
    return item;
  };
  return redact(value) as T;
};

let mapSubscriber = (value: z.infer<typeof subscriberSchema>) => ({
  email: value.email,
  status: value.status ?? undefined,
  score: value.score,
  fields: value.fields?.map(field => ({ name: field.name, value: field.value ?? undefined })),
  unsubscriptionDate:
    (value.unsubscribedDate !== undefined
      ? value.unsubscribedDate
      : value.unsubscriptionDate) ?? undefined,
  unsubscriptionType: value.unsubscriptionType ?? undefined
});
let mapCampaign = (value: z.infer<typeof campaignSchema>) => ({
  ...value,
  preheader: value.preheader ?? undefined,
  replyTo: value.replyTo ?? undefined,
  scheduledDate: value.scheduledDate ?? undefined
});

export class Client {
  private axios;
  readonly accountEmail: string;
  private token: string;

  constructor(config: ClientConfig) {
    if (!config.token.trim()) throw createApiServiceError('A Doppler API key is required.');
    if (!z.email().safeParse(config.accountEmail).success)
      throw createApiServiceError(
        'accountEmail must be the email address used to sign in to Doppler.'
      );
    this.accountEmail = config.accountEmail;
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: `https://restapi.fromdoppler.com/accounts/${encodeURIComponent(this.accountEmail)}`,
      timeout: 30000,
      authHeader: { value: `token ${config.token}` },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Doppler',
          reason: 'doppler_api_error',
          detailKeys: ['message', 'detail', 'error', 'error_description', 'title', 'code'],
          nestedKeys: ['errors', 'modelState'],
          extractResponse: (input, helpers) => {
            let response = helpers.getResponseWithBody(input);
            return response
              ? { ...response, data: redactProviderData(response.data, config.token) }
              : undefined;
          },
          extractMessage: (input, helpers) => {
            let body = redactProviderData(
              helpers.getResponseWithBody(input)?.data,
              config.token
            );
            let details: string[] = [];
            helpers.collectDetails(body, details, {
              nestedKeys: ['errors', 'modelState'],
              detailKeys: ['message', 'detail', 'error', 'error_description', 'title', 'code']
            });
            if (isApiErrorRecord(body))
              for (let key of ['errors', 'modelState']) {
                if (isApiErrorRecord(body[key]))
                  for (let value of Object.values(body[key]))
                    helpers.collectDetails(value, details);
              }
            return details.length ? details.join('; ') : undefined;
          },
          formatMessage: ({ statusLabel, message }) =>
            redactProviderData(
              `Doppler API request failed: ${statusLabel}${message}`,
              config.token
            ),
          parent: { name: 'DopplerApiError' }
        })
    });
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    headers?: Record<string, string>
  ) {
    let response = await this.axios.request({ method, url, data, params, headers });
    return redactProviderData(response.data as unknown, this.token);
  }

  private async collection<T>(
    url: string,
    schema: z.ZodType<T>,
    params: Record<string, unknown>
  ) {
    let raw = parse(
      rawSchema,
      await this.request('GET', url, undefined, params),
      'collection'
    );
    let result = parse(
      z.object({
        items: z.array(schema),
        itemsCount: z.number().int().nonnegative(),
        currentPage: z.number().int(),
        pagesCount: z.number().int()
      }),
      raw,
      'collection'
    );
    return { ...result, raw };
  }

  async getAccountHome() {
    return parse(messageSchema, await this.request('GET', ''), 'account home');
  }
  async getLists(page?: number, pageSize?: number) {
    return this.collection('/lists', listSchema, pagination(page, pageSize));
  }
  async getList(listId: number) {
    return parse(
      listSchema,
      await this.request('GET', `/lists/${requireInteger(listId, 'listId')}`),
      'list'
    );
  }
  async createList(name: string) {
    let result = parse(
      creationSchema,
      await this.request('POST', '/lists', { name: requireText(name, 'name', 100) }),
      'list creation'
    );
    return { ...result, createdResourceId: this.createdId(result.createdResourceId) };
  }
  private createdId(value: string) {
    if (!/^\d+$/.test(value))
      throw createApiServiceError('Doppler returned an invalid numeric resource ID.');
    return requireInteger(Number(value), 'Doppler resource ID');
  }
  async updateList(listId: number, name: string) {
    await this.request('PUT', `/lists/${requireInteger(listId, 'listId')}`, {
      name: requireText(name, 'name', 100)
    });
  }
  async deleteList(listId: number) {
    await this.request('DELETE', `/lists/${requireInteger(listId, 'listId')}`);
  }

  async getListSubscribers(
    listId: number,
    options: { page?: number; pageSize?: number; from?: string; to?: string } = {}
  ) {
    if (options.from !== undefined || options.to !== undefined)
      throw createApiServiceError(
        'Doppler does not support date filters on list subscribers. Use get_subscribers with updatedAfter to search account subscribers.'
      );
    let result = await this.collection(
      `/lists/${requireInteger(listId, 'listId')}/subscribers`,
      subscriberSchema,
      pagination(options.page, options.pageSize)
    );
    return { ...result, items: result.items.map(mapSubscriber) };
  }
  async getSubscribers(options: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    updatedAfter?: string;
    resumeFrom?: number;
  }) {
    validateDate(options.updatedAfter, 'updatedAfter');
    if (options.resumeFrom !== undefined)
      requireInteger(options.resumeFrom, 'resumeFrom', Number.MAX_SAFE_INTEGER);
    let result = await this.collection('/subscribers', subscriberSchema, {
      ...pagination(options.page, options.pageSize),
      ...pickDefined({
        keyword: options.keyword,
        updatedAfter: options.updatedAfter,
        resumeFrom: options.resumeFrom
      })
    });
    return result;
  }
  async getSubscriber(email: string) {
    let raw = parse(
      subscriberSchema,
      await this.request('GET', `/subscribers/${encodeURIComponent(validateEmail(email))}`),
      'subscriber'
    );
    return { ...mapSubscriber(raw), raw };
  }
  async addOrUpdateSubscriber(
    listId: number,
    subscriber: { email: string; fields?: FieldValue[] }
  ) {
    validateEmail(subscriber.email);
    validateFields(subscriber.fields);
    await this.request(
      'POST',
      `/lists/${requireInteger(listId, 'listId')}/subscribers`,
      pickDefined(subscriber),
      undefined,
      { 'X-Doppler-Subscriber-Origin': 'RestAPI' }
    );
  }
  async removeSubscriberFromList(listId: number, email: string) {
    await this.request(
      'DELETE',
      `/lists/${requireInteger(listId, 'listId')}/subscribers/${encodeURIComponent(validateEmail(email))}`
    );
  }
  async unsubscribeFromAccount(email: string, reason?: string, comment?: string) {
    if (comment !== undefined && comment.length > 200)
      throw createApiServiceError('unsubscriptionComment must be at most 200 characters.');
    await this.request(
      'POST',
      '/unsubscribed',
      pickDefined({
        email: validateEmail(email),
        manualUnsubscriptionReason: reason,
        unsubscriptionComment: comment
      })
    );
  }
  async importSubscribers(
    listId: number,
    items: { email: string; fields?: FieldValue[] }[],
    fields?: string[],
    callbackUrl?: string
  ) {
    if (items.length < 1 || items.length > 10000)
      throw createApiServiceError('Provide between 1 and 10,000 subscribers per import.');
    for (let item of items) {
      validateEmail(item.email);
      validateFields(item.fields);
    }
    if (
      callbackUrl !== undefined &&
      (!z.url().safeParse(callbackUrl).success ||
        !/^https?:\/\//i.test(callbackUrl) ||
        callbackUrl.length > 500)
    )
      throw createApiServiceError(
        'callbackUrl must be an HTTP or HTTPS URL of at most 500 characters.'
      );
    return parse(
      creationSchema,
      await this.request(
        'POST',
        `/lists/${requireInteger(listId, 'listId')}/subscribers/import`,
        pickDefined({ items, fields: fields ?? [], callback: callbackUrl }),
        undefined,
        { 'X-Doppler-Subscriber-Origin': 'RestAPI' }
      ),
      'import creation'
    );
  }
  async getFields() {
    let raw = parse(
      z.object({ items: z.array(fieldSchema) }).passthrough(),
      await this.request('GET', '/fields'),
      'fields'
    );
    return {
      items: raw.items.map(field => ({ ...field, sample: field.sample ?? field.sampleValue })),
      raw
    };
  }
  async createField(field: { name: string; type: string; private?: boolean }) {
    this.validateFieldName(field.name);
    return parse(
      creationSchema,
      await this.request('POST', '/fields', {
        ...field,
        private: field.private ?? false,
        readonly: false
      }),
      'field creation'
    );
  }
  private validateFieldName(name: string) {
    requireText(name, 'fieldName', 50);
    if (!/^[0-9a-zA-ZñÑ_-]+$/.test(name))
      throw createApiServiceError(
        'fieldName must contain only letters, digits, underscores, or hyphens.'
      );
  }
  async updateField(fieldName: string, updates: { name?: string; private?: boolean }) {
    this.validateFieldName(fieldName);
    if (updates.name === undefined && updates.private === undefined)
      throw createApiServiceError('Provide newName or isPrivate when updating a field.');
    if (updates.name !== undefined) this.validateFieldName(updates.name);
    let current = (await this.getFields()).items.find(field => field.name === fieldName);
    if (!current)
      throw createApiServiceError(
        'The custom field was not found. Call get_custom_fields to discover fields.'
      );
    if (current.readonly) throw createApiServiceError('Read-only fields cannot be edited.');
    await this.request('PUT', `/fields/${encodeURIComponent(fieldName)}`, {
      name: updates.name ?? current.name,
      private: updates.private ?? current.private,
      readonly: current.readonly,
      type: current.type
    });
  }
  async deleteField(fieldName: string) {
    this.validateFieldName(fieldName);
    await this.request('DELETE', `/fields/${encodeURIComponent(fieldName)}`);
  }

  async getCampaigns(page?: number, pageSize?: number, status?: string) {
    let result = await this.collection('/campaigns', campaignSchema, {
      ...pagination(page, pageSize),
      ...pickDefined({ state: status })
    });
    return { ...result, items: result.items.map(mapCampaign) };
  }
  async getCampaign(campaignId: number) {
    let raw = parse(
      campaignSchema,
      await this.request('GET', `/campaigns/${requireInteger(campaignId, 'campaignId')}`),
      'campaign'
    );
    return { ...mapCampaign(raw), raw };
  }
  private validateCampaign(campaign: CampaignInput) {
    for (let [key, value] of Object.entries(campaign)) {
      if (value === undefined || value === null) continue;
      if (key === 'fromEmail' || key === 'replyTo') validateEmail(value, key);
      else if (key === 'preheader') {
        if (value.length > 100)
          throw createApiServiceError('preheader must be at most 100 characters.');
      } else requireText(value, key, 100);
    }
  }
  async createCampaign(campaign: CampaignInput) {
    this.validateCampaign(campaign);
    let result = parse(
      creationSchema,
      await this.request('POST', '/campaigns', pickDefined(campaign)),
      'campaign creation'
    );
    return { ...result, createdResourceId: this.createdId(result.createdResourceId) };
  }
  async updateCampaign(campaignId: number, updates: Partial<CampaignInput>) {
    if (!Object.values(updates).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one campaign field to update.');
    let current = (await this.getCampaign(campaignId)).raw;
    let campaign = {
      name: current.name,
      fromName: current.fromName,
      fromEmail: current.fromEmail,
      subject: current.subject,
      preheader: current.preheader,
      replyTo: current.replyTo,
      ...pickDefined(updates)
    };
    this.validateCampaign(campaign);
    await this.request(
      'PUT',
      `/campaigns/${requireInteger(campaignId, 'campaignId')}`,
      pickDefined(campaign)
    );
  }
  async deleteCampaign(campaignId: number) {
    await this.request('DELETE', `/campaigns/${requireInteger(campaignId, 'campaignId')}`);
  }
  async sendCampaign(
    campaignId: number,
    type: 'immediate' | 'scheduled',
    scheduledDate?: string
  ) {
    if (type === 'scheduled' && scheduledDate === undefined)
      throw createApiServiceError('scheduledDate is required for scheduled sending.');
    if (type === 'immediate' && scheduledDate !== undefined)
      throw createApiServiceError('Omit scheduledDate for immediate sending.');
    validateDate(scheduledDate, 'scheduledDate');
    await this.request(
      'POST',
      `/campaigns/${requireInteger(campaignId, 'campaignId')}/shippings`,
      pickDefined({ type, scheduledDate })
    );
  }
  async getCampaignReport(campaignId: number) {
    let raw = parse(
      z
        .object({
          totalRecipients: z.number().int().nonnegative(),
          totalShipped: z.number().int().nonnegative(),
          successFullDeliveries: z.number().int().nonnegative(),
          uniqueOpens: z.number().int(),
          totalTimesOpened: z.number().int(),
          uniqueClicks: z.number().int(),
          totalClicks: z.number().int(),
          totalUnopened: z.number().int(),
          totalHardBounces: z.number().int(),
          totalSoftBounces: z.number().int(),
          totalUnsubscribers: z.number().int(),
          lastOpenDate: z.string().optional(),
          lastClickDate: z.string().optional()
        })
        .passthrough(),
      await this.request(
        'GET',
        `/campaigns/${requireInteger(campaignId, 'campaignId')}/results-summary`
      ),
      'campaign report'
    );
    let campaign = await this.getCampaign(campaignId);
    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      campaignSubject: campaign.subject,
      campaignStatus: campaign.status,
      deliveryRate:
        raw.totalRecipients > 0
          ? (raw.successFullDeliveries / raw.totalRecipients) * 100
          : undefined,
      totalShipped: raw.totalShipped,
      uniqueOpens: raw.uniqueOpens,
      totalOpens: raw.totalTimesOpened,
      lastOpenDate: raw.lastOpenDate,
      uniqueClicks: raw.uniqueClicks,
      totalClicks: raw.totalClicks,
      lastClickDate: raw.lastClickDate,
      totalUnopened: raw.totalUnopened,
      hardBounces: raw.totalHardBounces,
      softBounces: raw.totalSoftBounces,
      totalUnsubscribes: raw.totalUnsubscribers,
      raw: { summary: raw, campaign: campaign.raw }
    };
  }
  async getUnsubscribed(
    options: { from?: string; to?: string; page?: number; pageSize?: number } = {}
  ) {
    validateRange(options.from, options.to);
    let result = await this.collection('/unsubscribed', subscriberSchema, {
      ...pagination(options.page, options.pageSize),
      ...pickDefined({ from: options.from, to: options.to })
    });
    return { ...result, items: result.items.map(mapSubscriber) };
  }
  async getTask(taskId: string) {
    return parse(
      taskSchema,
      await this.request(
        'GET',
        `/tasks/${encodeURIComponent(requireText(taskId, 'taskId', 200))}`
      ),
      'task'
    );
  }
  async getCampaignRecipients(campaignId: number) {
    return parse(
      recipientSchema,
      await this.request(
        'GET',
        `/campaigns/${requireInteger(campaignId, 'campaignId')}/recipients`
      ),
      'campaign recipients'
    );
  }
  async setCampaignRecipients(
    campaignId: number,
    listIds: number[],
    segmentIds: number[] = []
  ) {
    if (listIds.length + segmentIds.length === 0)
      throw createApiServiceError('Provide at least one recipient list or segment.');
    await this.request(
      'PUT',
      `/campaigns/${requireInteger(campaignId, 'campaignId')}/recipients`,
      {
        lists: listIds.map(id => ({ id: requireInteger(id, 'listIds') })),
        segments: segmentIds.map(id => ({ id: requireInteger(id, 'segmentIds') }))
      }
    );
  }
  async setCampaignContent(campaignId: number, html: string) {
    if (!html.trim()) throw createApiServiceError('html must contain campaign content.');
    await this.request(
      'PUT',
      `/campaigns/${requireInteger(campaignId, 'campaignId')}/content`,
      html,
      undefined,
      { 'Content-Type': 'text/html' }
    );
  }
  getCampaignContentUrl(campaignId: number) {
    return `https://restapi.fromdoppler.com/accounts/${encodeURIComponent(this.accountEmail)}/campaigns/${requireInteger(campaignId, 'campaignId')}/content`;
  }
}
