import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string; accessUrl?: string }) {
    let baseURL = config.accessUrl || 'https://api.surveymonkey.com';
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
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
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.title) query.title = params.title;
    if (params?.startModifiedAt) query.start_modified_at = params.startModifiedAt;
    if (params?.endModifiedAt) query.end_modified_at = params.endModifiedAt;
    if (params?.folderId) query.folder_id = params.folderId;
    if (params?.include) query.include = params.include;

    let response = await this.http.get('/v3/surveys', { params: query });
    return response.data;
  }

  async getSurvey(surveyId: string) {
    let response = await this.http.get(`/v3/surveys/${surveyId}`);
    return response.data;
  }

  async getSurveyDetails(surveyId: string) {
    let response = await this.http.get(`/v3/surveys/${surveyId}/details`);
    return response.data;
  }

  async createSurvey(data: {
    title?: string;
    fromTemplateId?: string;
    fromSurveyId?: string;
    nickname?: string;
    language?: string;
    folderId?: string;
  }) {
    let body: Record<string, unknown> = {};
    if (data.title) body.title = data.title;
    if (data.fromTemplateId) body.from_template_id = data.fromTemplateId;
    if (data.fromSurveyId) body.from_survey_id = data.fromSurveyId;
    if (data.nickname) body.nickname = data.nickname;
    if (data.language) body.language = data.language;
    if (data.folderId) body.folder_id = data.folderId;

    let response = await this.http.post('/v3/surveys', body);
    return response.data;
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
    let body: Record<string, unknown> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.nickname !== undefined) body.nickname = data.nickname;
    if (data.language !== undefined) body.language = data.language;
    if (data.folderId !== undefined) body.folder_id = data.folderId;

    let response = await this.http.patch(`/v3/surveys/${surveyId}`, body);
    return response.data;
  }

  async deleteSurvey(surveyId: string) {
    await this.http.delete(`/v3/surveys/${surveyId}`);
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
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.include) query.include = params.include;

    let response = await this.http.get(`/v3/surveys/${surveyId}/collectors`, {
      params: query
    });
    return response.data;
  }

  async getCollector(collectorId: string) {
    let response = await this.http.get(`/v3/collectors/${collectorId}`);
    return response.data;
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
    let body: Record<string, unknown> = { type: data.type };
    if (data.name) body.name = data.name;
    if (data.thankYouMessage) body.thank_you_message = data.thankYouMessage;
    if (data.closeDate) body.close_date = data.closeDate;
    if (data.redirectUrl) body.redirect_url = data.redirectUrl;
    if (data.allowMultipleResponses !== undefined)
      body.allow_multiple_responses = data.allowMultipleResponses;
    if (data.anonymous) body.anonymous_type = data.anonymous;
    if (data.password) body.password = data.password;
    if (data.responseLimit) body.response_limit = data.responseLimit;
    if (data.senderEmail) body.sender_email = data.senderEmail;

    let response = await this.http.post(`/v3/surveys/${surveyId}/collectors`, body);
    return response.data;
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

    let response = await this.http.patch(`/v3/collectors/${collectorId}`, body);
    return response.data;
  }

  async deleteCollector(collectorId: string) {
    await this.http.delete(`/v3/collectors/${collectorId}`);
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
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.startCreatedAt) query.start_created_at = params.startCreatedAt;
    if (params?.endCreatedAt) query.end_created_at = params.endCreatedAt;
    if (params?.startModifiedAt) query.start_modified_at = params.startModifiedAt;
    if (params?.endModifiedAt) query.end_modified_at = params.endModifiedAt;
    if (params?.status) query.status = params.status;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortOrder) query.sort_order = params.sortOrder;

    let response = await this.http.get(`/v3/surveys/${surveyId}/responses`, { params: query });
    return response.data;
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
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.startCreatedAt) query.start_created_at = params.startCreatedAt;
    if (params?.endCreatedAt) query.end_created_at = params.endCreatedAt;
    if (params?.startModifiedAt) query.start_modified_at = params.startModifiedAt;
    if (params?.endModifiedAt) query.end_modified_at = params.endModifiedAt;
    if (params?.status) query.status = params.status;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.simple) query.simple = 'true';
    if (params?.collectorIds?.length) query.collector_ids = params.collectorIds.join(',');

    let response = await this.http.get(`/v3/surveys/${surveyId}/responses/bulk`, {
      params: query
    });
    return response.data;
  }

  async getResponse(surveyId: string, responseId: string) {
    let response = await this.http.get(`/v3/surveys/${surveyId}/responses/${responseId}`);
    return response.data;
  }

  // ── Contacts ──

  async listContactLists(params?: { page?: number; perPage?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);

    let response = await this.http.get('/v3/contact_lists', { params: query });
    return response.data;
  }

  async getContactList(contactListId: string) {
    let response = await this.http.get(`/v3/contact_lists/${contactListId}`);
    return response.data;
  }

  async createContactList(name: string) {
    let response = await this.http.post('/v3/contact_lists', { name });
    return response.data;
  }

  async updateContactList(contactListId: string, name: string) {
    let response = await this.http.patch(`/v3/contact_lists/${contactListId}`, { name });
    return response.data;
  }

  async deleteContactList(contactListId: string) {
    await this.http.delete(`/v3/contact_lists/${contactListId}`);
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
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.status) query.status = params.status;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.search) query.search = params.search;
    if (params?.searchBy) query.search_by = params.searchBy;

    let response = await this.http.get(`/v3/contact_lists/${contactListId}/contacts`, {
      params: query
    });
    return response.data;
  }

  async createContact(
    contactListId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phoneNumber?: string;
      customFields?: Record<string, string>;
    }
  ) {
    let body: Record<string, unknown> = {
      first_name: data.firstName,
      last_name: data.lastName
    };
    if (data.email) body.email = data.email;
    if (data.phoneNumber) body.phone_number = data.phoneNumber;
    if (data.customFields) body.custom_fields = data.customFields;

    let response = await this.http.post(`/v3/contact_lists/${contactListId}/contacts`, body);
    return response.data;
  }

  async createContactsBulk(
    contactListId: string,
    contacts: Array<{
      firstName: string;
      lastName: string;
      email?: string;
      phoneNumber?: string;
      customFields?: Record<string, string>;
    }>,
    updateExisting?: boolean
  ) {
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

    let response = await this.http.post(
      `/v3/contact_lists/${contactListId}/contacts/bulk`,
      body
    );
    return response.data;
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
    }
  ) {
    let body: Record<string, unknown> = { type: data.type };
    if (data.subject) body.subject = data.subject;
    if (data.bodyHtml) body.body_html = data.bodyHtml;
    if (data.bodyText) body.body_text = data.bodyText;
    if (data.recipientStatus) body.recipient_status = data.recipientStatus;
    if (data.isBrandingEnabled !== undefined)
      body.is_branding_enabled = data.isBrandingEnabled;

    let response = await this.http.post(`/v3/collectors/${collectorId}/messages`, body);
    return response.data;
  }

  async sendMessage(collectorId: string, messageId: string) {
    let response = await this.http.post(
      `/v3/collectors/${collectorId}/messages/${messageId}/send`,
      {}
    );
    return response.data;
  }

  async addMessageRecipients(
    collectorId: string,
    messageId: string,
    contactListIds: string[]
  ) {
    let body = { contact_list_ids: contactListIds };
    let response = await this.http.post(
      `/v3/collectors/${collectorId}/messages/${messageId}/recipients/bulk`,
      body
    );
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks(params?: { page?: number; perPage?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);

    let response = await this.http.get('/v3/webhooks', { params: query });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/v3/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    eventType: string;
    objectType: string;
    objectIds: string[];
    subscriptionUrl: string;
  }) {
    let body = {
      name: data.name,
      event_type: data.eventType,
      object_type: data.objectType,
      object_ids: data.objectIds,
      subscription_url: data.subscriptionUrl
    };

    let response = await this.http.post('/v3/webhooks', body);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      name?: string;
      eventType?: string;
      objectType?: string;
      objectIds?: string[];
      subscriptionUrl?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.eventType !== undefined) body.event_type = data.eventType;
    if (data.objectType !== undefined) body.object_type = data.objectType;
    if (data.objectIds !== undefined) body.object_ids = data.objectIds;
    if (data.subscriptionUrl !== undefined) body.subscription_url = data.subscriptionUrl;

    let response = await this.http.patch(`/v3/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/v3/webhooks/${webhookId}`);
  }

  // ── Users ──

  async getCurrentUser() {
    let response = await this.http.get('/v3/users/me');
    return response.data;
  }

  // ── Survey Templates ──

  async listSurveyTemplates(params?: {
    page?: number;
    perPage?: number;
    language?: string;
    category?: string;
  }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.language) query.language = params.language;
    if (params?.category) query.category = params.category;

    let response = await this.http.get('/v3/survey_templates', { params: query });
    return response.data;
  }

  // ── Survey Categories ──

  async listSurveyCategories(params?: { page?: number; perPage?: number; language?: string }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.language) query.language = params.language;

    let response = await this.http.get('/v3/survey_categories', { params: query });
    return response.data;
  }
}
