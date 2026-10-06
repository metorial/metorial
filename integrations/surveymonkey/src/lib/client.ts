import { getCurrentContext, pickDefined, requestAxios } from 'slates';
import { z } from 'zod';
import { adaptError, apiOrigin, authenticatedHttp, responsePrivacy } from './http';
import {
  bulkSchema,
  collectorListSchema,
  collectorSchema,
  contactListSchema,
  contactSchema,
  id,
  invalid,
  malformed,
  messageSchema,
  nativeId,
  pageSchema,
  parse,
  parseNativeJson,
  preserveIds,
  responseSchema,
  surveySchema,
  userSchema
} from './response';

export class Client {
  private http;
  private checkPrivacy;
  readonly origin: string;
  constructor(config: { token: string; accessUrl?: string }) {
    this.origin = apiOrigin(config.accessUrl);
    this.http = authenticatedHttp(config.token, config.accessUrl);
    this.checkPrivacy = responsePrivacy(config.token);
  }

  private async request<T extends z.ZodType>(
    schema: T,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, string>,
    onReceiptId?: (id: string) => void
  ) {
    let response = await requestAxios(
      `${method} ${path}`,
      () => this.http.request<unknown>({ method, url: path, data, params }),
      (error, operation) => {
        this.checkPrivacy(getCurrentContext().getHttpTraces());
        return adaptError(error, operation);
      }
    );
    this.checkPrivacy(getCurrentContext().getHttpTraces());
    if (method === 'DELETE') {
      if (![200, 204].includes(response.status)) throw malformed();
      return parse(schema, response.data);
    }
    let value: unknown = response.data;
    if (typeof value === 'string') value = parseNativeJson(value);
    if (
      onReceiptId &&
      response.status >= 200 &&
      response.status < 300 &&
      value !== null &&
      typeof value === 'object' &&
      'id' in value
    ) {
      let receiptId = nativeId.safeParse(value.id);
      if (receiptId.success) {
        this.checkPrivacy(receiptId.data);
        onReceiptId(receiptId.data);
      }
    }
    this.checkPrivacy(value);
    if (![200, 201].includes(response.status)) throw malformed();
    return parse(schema, preserveIds(value));
  }

  private resourceId(value: string) {
    let result = id.safeParse(value);
    if (!result.success) throw invalid('Provide an exact numeric resource ID as text.');
    return result.data;
  }
  private query(params: Record<string, unknown> = {}) {
    let query: Record<string, string> = {};
    for (let [key, value] of Object.entries(params))
      if (value !== undefined) {
        if (
          (key === 'page' || key === 'per_page') &&
          (typeof value !== 'number' ||
            !Number.isSafeInteger(value) ||
            value < 1 ||
            (key === 'per_page' && value > 1000))
        )
          throw invalid('Use positive integer pages and a page size from 1 to 1000.');
        query[key] = String(value);
      }
    return query;
  }
  private async paged<T extends z.ZodType>(
    schema: T,
    path: string,
    params: Record<string, string>
  ) {
    let result = await this.request(pageSchema(schema), 'GET', path, undefined, params);
    let offset = (BigInt(result.page) - 1n) * BigInt(result.per_page);
    let remaining = BigInt(result.total) - offset;
    let expected =
      remaining <= 0n
        ? 0
        : Number(remaining < BigInt(result.per_page) ? remaining : BigInt(result.per_page));
    if (result.data.length !== expected) throw malformed();
    let ids = new Set<string>();
    for (let item of result.data) {
      if (item !== null && typeof item === 'object' && 'id' in item) {
        let itemId = nativeId.safeParse(item.id);
        if (!itemId.success || ids.has(itemId.data)) throw malformed();
        ids.add(itemId.data);
      }
    }
    let nextPage: number | undefined;
    if (result.links.next) {
      if (offset + BigInt(result.per_page) >= BigInt(result.total)) throw malformed();
      let url: URL;
      try {
        url = new URL(result.links.next);
      } catch {
        throw malformed();
      }
      if (
        url.origin !== this.origin ||
        url.pathname !== path ||
        url.username ||
        url.password ||
        url.hash
      )
        throw malformed();
      let page = url.searchParams.get('page');
      if (!page || !/^\d+$/.test(page)) throw malformed();
      nextPage = Number(page);
      if (!Number.isSafeInteger(nextPage) || nextPage !== result.page + 1) throw malformed();
      for (let [key, value] of Object.entries(params))
        if (key !== 'page' && url.searchParams.has(key) && url.searchParams.get(key) !== value)
          throw malformed();
    } else if (offset + BigInt(result.per_page) < BigInt(result.total)) throw malformed();
    if (params.page && Number(params.page) !== result.page) throw malformed();
    return { ...result, nextPage };
  }
  private async exact<T extends z.ZodType<{ id: string }>>(
    schema: T,
    method: 'GET' | 'PATCH',
    path: string,
    expected: string,
    body?: unknown
  ) {
    let result = await this.request(schema, method, path, body);
    this.assertId(result.id, expected);
    return result;
  }
  private assertId(actual: string, expected: string) {
    if (actual !== expected) throw malformed();
  }
  private body(value: Record<string, unknown>) {
    let result = pickDefined(value);
    if (!Object.keys(result).length) throw invalid('Provide at least one field to update.');
    return result;
  }
  private async remove(path: string) {
    await this.request(z.unknown(), 'DELETE', path);
    try {
      await this.request(z.unknown(), 'GET', path);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'data' in error &&
        typeof error.data === 'object' &&
        error.data !== null &&
        'upstreamStatus' in error.data &&
        error.data.upstreamStatus === 404
      )
        return;
      throw error;
    }
    throw invalid(
      'SurveyMonkey still exposes the resource after deletion. Its cleanup is unresolved; inspect it before retrying.'
    );
  }

  // ── Surveys ──

  async listSurveys(params?: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: string;
    title?: string;
    startModifiedAt?: string;
    endModifiedAt?: string;
    folderId?: string;
    include?: string;
  }) {
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.sortBy !== undefined) query.sort_by = params.sortBy;
    if (params?.sortOrder !== undefined) query.sort_order = params.sortOrder;
    if (params?.title !== undefined) query.title = params.title;
    if (params?.startModifiedAt !== undefined)
      query.start_modified_at = params.startModifiedAt;
    if (params?.endModifiedAt !== undefined) query.end_modified_at = params.endModifiedAt;
    if (params?.folderId !== undefined) query.folder_id = params.folderId;
    if (params?.include !== undefined) query.include = params.include;

    return this.paged(surveySchema.extend({ href: z.string() }), '/v3/surveys', query);
  }

  async getSurvey(surveyId: string) {
    return this.exact(
      surveySchema,
      'GET',
      `/v3/surveys/${this.resourceId(surveyId)}`,
      surveyId
    );
  }

  async getSurveyDetails(surveyId: string) {
    return this.exact(
      surveySchema,
      'GET',
      `/v3/surveys/${this.resourceId(surveyId)}/details`,
      surveyId
    );
  }

  async createSurvey(data: {
    title?: string;
    fromTemplateId?: string;
    fromSurveyId?: string;
    nickname?: string;
    language?: string;
    folderId?: string;
  }) {
    if (data.fromTemplateId && data.fromSurveyId)
      throw invalid('Choose one copy source: fromTemplateId or fromSurveyId.');
    for (let value of [data.fromTemplateId, data.fromSurveyId, data.folderId])
      if (value !== undefined) this.resourceId(value);
    let body: Record<string, unknown> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.fromTemplateId !== undefined) body.from_template_id = data.fromTemplateId;
    if (data.fromSurveyId !== undefined) body.from_survey_id = data.fromSurveyId;
    if (data.nickname !== undefined) body.nickname = data.nickname;
    if (data.language !== undefined) body.language = data.language;
    if (data.folderId !== undefined) body.folder_id = data.folderId;

    return this.request(surveySchema, 'POST', '/v3/surveys', pickDefined(body));
  }

  async updateSurvey(
    surveyId: string,
    data: {
      title?: string;
      nickname?: string;
      language?: string;
      folderId?: string;
    }
  ) {
    if (data.folderId !== undefined) this.resourceId(data.folderId);
    let body: Record<string, unknown> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.nickname !== undefined) body.nickname = data.nickname;
    if (data.language !== undefined) body.language = data.language;
    if (data.folderId !== undefined) body.folder_id = data.folderId;

    return this.exact(
      surveySchema,
      'PATCH',
      `/v3/surveys/${this.resourceId(surveyId)}`,
      surveyId,
      this.body(body)
    );
  }

  async deleteSurvey(surveyId: string) {
    await this.remove(`/v3/surveys/${this.resourceId(surveyId)}`);
  }

  // ── Collectors ──

  async listCollectors(
    surveyId: string,
    params?: {
      page?: number;
      perPage?: number;
      sortBy?: string;
      sortOrder?: string;
      include?: string;
    }
  ) {
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.sortBy !== undefined) query.sort_by = params.sortBy;
    if (params?.sortOrder !== undefined) query.sort_order = params.sortOrder;
    if (params?.include !== undefined) query.include = params.include;

    return this.paged(
      collectorListSchema,
      `/v3/surveys/${this.resourceId(surveyId)}/collectors`,
      query
    );
  }

  async getCollector(collectorId: string) {
    return this.exact(
      collectorSchema,
      'GET',
      `/v3/collectors/${this.resourceId(collectorId)}`,
      collectorId
    );
  }

  async createCollector(
    surveyId: string,
    data: {
      type: string;
      name?: string;
      thankYouMessage?: string;
      closeDate?: string;
      redirectUrl?: string;
      allowMultipleResponses?: boolean;
      anonymous?: string;
      password?: string;
      responseLimit?: number;
      senderEmail?: string;
    }
  ) {
    if (!data.name?.trim())
      throw invalid('Provide a collector name; the current API requires it.');
    if (data.type === 'email' && data.allowMultipleResponses !== undefined)
      throw invalid('allowMultipleResponses is unavailable for email collectors.');
    let body: Record<string, unknown> = { type: data.type };
    if (data.name !== undefined) body.name = data.name;
    if (data.thankYouMessage !== undefined) body.thank_you_message = data.thankYouMessage;
    if (data.closeDate !== undefined) body.close_date = data.closeDate;
    if (data.redirectUrl !== undefined) body.redirect_url = data.redirectUrl;
    if (data.allowMultipleResponses !== undefined)
      body.allow_multiple_responses = data.allowMultipleResponses;
    if (data.anonymous !== undefined) body.anonymous_type = data.anonymous;
    if (data.password !== undefined) body.password = data.password;
    if (data.responseLimit !== undefined) body.response_limit = data.responseLimit;
    if (data.senderEmail !== undefined) body.sender_email = data.senderEmail;

    return this.request(
      collectorSchema,
      'POST',
      `/v3/surveys/${this.resourceId(surveyId)}/collectors`,
      this.body(body)
    );
  }

  async updateCollector(
    collectorId: string,
    data: {
      name?: string;
      thankYouMessage?: string;
      closeDate?: string;
      redirectUrl?: string;
      allowMultipleResponses?: boolean;
      anonymous?: string;
      password?: string;
      responseLimit?: number;
      status?: string;
    }
  ) {
    let current = await this.getCollector(collectorId);
    this.assertId(current.id, collectorId);
    if (current.type === 'email' && data.allowMultipleResponses !== undefined)
      throw invalid('allowMultipleResponses is unavailable for email collectors.');
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.thankYouMessage !== undefined) body.thank_you_message = data.thankYouMessage;
    if (data.closeDate !== undefined) body.close_date = data.closeDate;
    if (data.redirectUrl !== undefined) body.redirect_url = data.redirectUrl;
    if (data.allowMultipleResponses !== undefined)
      body.allow_multiple_responses = data.allowMultipleResponses;
    if (data.anonymous !== undefined) body.anonymous_type = data.anonymous;
    if (data.password !== undefined) body.password = data.password;
    if (data.responseLimit !== undefined) body.response_limit = data.responseLimit;
    if (data.status !== undefined) body.status = data.status;

    return this.exact(
      collectorSchema,
      'PATCH',
      `/v3/collectors/${this.resourceId(collectorId)}`,
      collectorId,
      this.body(body)
    );
  }

  async deleteCollector(collectorId: string) {
    await this.remove(`/v3/collectors/${this.resourceId(collectorId)}`);
  }

  // ── Responses ──

  async listResponses(
    surveyId: string,
    params?: {
      page?: number;
      perPage?: number;
      startCreatedAt?: string;
      endCreatedAt?: string;
      startModifiedAt?: string;
      endModifiedAt?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ) {
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.startCreatedAt !== undefined) query.start_created_at = params.startCreatedAt;
    if (params?.endCreatedAt !== undefined) query.end_created_at = params.endCreatedAt;
    if (params?.startModifiedAt !== undefined)
      query.start_modified_at = params.startModifiedAt;
    if (params?.endModifiedAt !== undefined) query.end_modified_at = params.endModifiedAt;
    if (params?.status !== undefined) query.status = params.status;
    if (params?.sortBy !== undefined) query.sort_by = params.sortBy;
    if (params?.sortOrder !== undefined) query.sort_order = params.sortOrder;

    return this.paged(
      responseSchema,
      `/v3/surveys/${this.resourceId(surveyId)}/responses`,
      query
    );
  }

  async getResponsesBulk(
    surveyId: string,
    params?: {
      page?: number;
      perPage?: number;
      startCreatedAt?: string;
      endCreatedAt?: string;
      startModifiedAt?: string;
      endModifiedAt?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
      simple?: boolean;
      collectorIds?: string[];
    }
  ) {
    if (params?.perPage !== undefined && params.perPage > 100)
      throw invalid('Full responses allow at most 100 results per page.');
    params?.collectorIds?.forEach(value => this.resourceId(value));
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.startCreatedAt !== undefined) query.start_created_at = params.startCreatedAt;
    if (params?.endCreatedAt !== undefined) query.end_created_at = params.endCreatedAt;
    if (params?.startModifiedAt !== undefined)
      query.start_modified_at = params.startModifiedAt;
    if (params?.endModifiedAt !== undefined) query.end_modified_at = params.endModifiedAt;
    if (params?.status !== undefined) query.status = params.status;
    if (params?.sortBy !== undefined) query.sort_by = params.sortBy;
    if (params?.sortOrder !== undefined) query.sort_order = params.sortOrder;
    if (params?.simple !== undefined) query.simple = String(params.simple);
    if (params?.collectorIds?.length) query.collector_ids = params.collectorIds.join(',');

    return this.paged(
      responseSchema,
      `/v3/surveys/${this.resourceId(surveyId)}/responses/bulk`,
      query
    );
  }

  async getResponse(surveyId: string, responseId: string) {
    let result = await this.exact(
      responseSchema,
      'GET',
      `/v3/surveys/${this.resourceId(surveyId)}/responses/${this.resourceId(responseId)}/details`,
      responseId
    );
    if (result.survey_id !== undefined && result.survey_id !== surveyId) throw malformed();
    return result;
  }

  // ── Contacts ──

  async listContactLists(params?: { page?: number; perPage?: number }) {
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);

    return this.paged(contactListSchema, '/v3/contact_lists', query);
  }

  async getContactList(contactListId: string) {
    return this.exact(
      contactListSchema,
      'GET',
      `/v3/contact_lists/${this.resourceId(contactListId)}`,
      contactListId
    );
  }

  async createContactList(name: string) {
    let result = await this.request(z.unknown(), 'POST', '/v3/contact_lists', { name });
    if (typeof result === 'object' && result !== null && 'data' in result) {
      let page = parse(pageSchema(contactListSchema), result);
      if (page.data.length !== 1) throw malformed();
      return page.data[0]!;
    }
    return parse(contactListSchema, result);
  }

  async updateContactList(contactListId: string, name: string) {
    return this.exact(
      contactListSchema,
      'PATCH',
      `/v3/contact_lists/${this.resourceId(contactListId)}`,
      contactListId,
      { name }
    );
  }

  async deleteContactList(contactListId: string) {
    await this.remove(`/v3/contact_lists/${this.resourceId(contactListId)}`);
  }

  async listContacts(
    contactListId: string,
    params?: {
      page?: number;
      perPage?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
      search?: string;
      searchBy?: string;
    }
  ) {
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.status !== undefined) query.status = params.status;
    if (params?.sortBy !== undefined) query.sort_by = params.sortBy;
    if (params?.sortOrder !== undefined) query.sort_order = params.sortOrder;
    if (params?.search !== undefined) query.search = params.search;
    if (params?.searchBy !== undefined) query.search_by = params.searchBy;

    return this.paged(
      contactSchema,
      `/v3/contact_lists/${this.resourceId(contactListId)}/contacts/bulk`,
      query
    );
  }

  async createContact(
    contactListId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      customFields?: Record<string, string>;
    }
  ) {
    this.validateContact(data);
    let body: Record<string, unknown> = {
      first_name: data.firstName,
      last_name: data.lastName
    };
    if (data.email !== undefined) body.email = data.email;
    if (data.phoneNumber !== undefined) body.phone_number = data.phoneNumber;
    if (data.customFields !== undefined) body.custom_fields = data.customFields;

    return this.request(
      contactSchema,
      'POST',
      `/v3/contact_lists/${this.resourceId(contactListId)}/contacts`,
      this.body(body)
    );
  }

  async createContactsBulk(
    contactListId: string,
    contacts: Array<{
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      customFields?: Record<string, string>;
    }>,
    updateExisting?: boolean
  ) {
    if (!contacts.length || contacts.length > 1000)
      throw invalid('Provide from 1 to 1000 contacts.');
    contacts.forEach(contact => this.validateContact(contact));
    let body: Record<string, unknown> = {
      contacts: contacts.map(c => {
        let contact: Record<string, unknown> = {
          first_name: c.firstName,
          last_name: c.lastName
        };
        if (c.email) contact.email = c.email;
        if (c.phoneNumber) contact.phone_number = c.phoneNumber;
        if (c.customFields) contact.custom_fields = c.customFields;
        return contact;
      })
    };
    if (updateExisting !== undefined) body.update_existing = updateExisting;

    return this.request(
      bulkSchema,
      'POST',
      `/v3/contact_lists/${this.resourceId(contactListId)}/contacts/bulk`,
      this.body(body)
    );
  }

  // ── Messages ──

  async createMessage(
    collectorId: string,
    data: {
      type: string;
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      recipientStatus?: string;
      isBrandingEnabled?: boolean;
    },
    onCreated?: (messageId: string) => void
  ) {
    let body: Record<string, unknown> = { type: data.type };
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.bodyHtml !== undefined) body.body_html = data.bodyHtml;
    if (data.bodyText !== undefined) body.body_text = data.bodyText;
    if (data.recipientStatus !== undefined) body.recipient_status = data.recipientStatus;
    if (data.isBrandingEnabled !== undefined)
      body.is_branding_enabled = data.isBrandingEnabled;

    return this.request(
      messageSchema,
      'POST',
      `/v3/collectors/${this.resourceId(collectorId)}/messages`,
      this.body(body),
      undefined,
      onCreated
    );
  }

  async sendMessage(collectorId: string, messageId: string) {
    return this.request(
      z
        .object({
          is_scheduled: z.boolean(),
          scheduled_date: z.string().nullish(),
          type: z.string(),
          recipients: z.array(nativeId)
        })
        .passthrough(),
      'POST',
      `/v3/collectors/${this.resourceId(collectorId)}/messages/${this.resourceId(messageId)}/send`,
      {}
    );
  }

  async addMessageRecipients(
    collectorId: string,
    messageId: string,
    contactListIds: string[]
  ) {
    let body = { contact_list_ids: contactListIds };
    return this.request(
      bulkSchema,
      'POST',
      `/v3/collectors/${this.resourceId(collectorId)}/messages/${this.resourceId(messageId)}/recipients/bulk`,
      this.body(body)
    );
  }

  // ── Users ──

  async getCurrentUser() {
    return this.request(userSchema, 'GET', '/v3/users/me');
  }

  // ── Survey Templates ──

  async listSurveyTemplates(params?: {
    page?: number;
    perPage?: number;
    language?: string;
    category?: string;
  }) {
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.language !== undefined) query.language = params.language;
    if (params?.category !== undefined) query.category = params.category;

    return this.paged(z.object({ id: nativeId }).passthrough(), '/v3/survey_templates', query);
  }

  // ── Survey Categories ──

  async listSurveyCategories(params?: { page?: number; perPage?: number; language?: string }) {
    this.query({ page: params?.page, per_page: params?.perPage });
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.language !== undefined) query.language = params.language;

    return this.paged(
      z.object({ id: nativeId }).passthrough(),
      '/v3/survey_categories',
      query
    );
  }
  private validateContact(data: {
    email?: string;
    phoneNumber?: string;
    customFields?: Record<string, string>;
  }) {
    if (!data.email?.trim() && !data.phoneNumber?.trim())
      throw invalid('Provide an email address or phone number.');
    if (
      data.customFields &&
      Object.keys(data.customFields).some(key => !/^([1-9]|[1-4][0-9]|50)$/.test(key))
    )
      throw invalid('Custom field keys must be the documented integers 1 through 50.');
  }
  async getContact(contactId: string) {
    let result = await this.request(
      contactSchema,
      'GET',
      `/v3/contacts/${this.resourceId(contactId)}`
    );
    this.assertId(result.id, contactId);
    return result;
  }
  async updateContact(
    contactId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      customFields?: Record<string, string>;
    }
  ) {
    if (
      data.customFields &&
      Object.keys(data.customFields).some(key => !/^([1-9]|[1-4][0-9]|50)$/.test(key))
    )
      throw invalid('Custom field keys must be 1 through 50.');
    let body = this.body({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone_number: data.phoneNumber,
      custom_fields: data.customFields
    });
    let result = await this.request(
      contactSchema,
      'PATCH',
      `/v3/contacts/${this.resourceId(contactId)}`,
      body
    );
    this.assertId(result.id, contactId);
    return result;
  }
  async deleteContact(contactId: string) {
    await this.remove(`/v3/contacts/${this.resourceId(contactId)}`);
  }
  async getMessage(collectorId: string, messageId: string) {
    let result = await this.request(
      messageSchema,
      'GET',
      `/v3/collectors/${this.resourceId(collectorId)}/messages/${this.resourceId(messageId)}`
    );
    this.assertId(result.id, messageId);
    return result;
  }
  async deleteMessage(collectorId: string, messageId: string) {
    await this.remove(
      `/v3/collectors/${this.resourceId(collectorId)}/messages/${this.resourceId(messageId)}`
    );
  }
  async listMessageRecipients(collectorId: string, messageId: string, page = 1) {
    return this.paged(
      z
        .object({
          id: nativeId,
          email: z.string().optional(),
          phone_number: z.string().optional()
        })
        .passthrough(),
      `/v3/collectors/${this.resourceId(collectorId)}/messages/${this.resourceId(messageId)}/recipients`,
      { page: String(page), per_page: '1000' }
    );
  }
  async listReferenceData(
    resource: 'survey_templates' | 'survey_categories' | 'survey_folders',
    params: { page?: number; perPage?: number; language?: string; category?: string } = {}
  ) {
    return this.paged(
      z.object({ id: nativeId }).passthrough(),
      `/v3/${resource}`,
      this.query({
        page: params.page,
        per_page: params.perPage,
        language: params.language,
        category: params.category
      })
    );
  }
}
