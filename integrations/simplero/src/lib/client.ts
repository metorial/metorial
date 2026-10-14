import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  extractApiErrorMessage
} from 'slates';

export class SimpleroClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; userAgent: string }) {
    if (!params.token.trim()) {
      throw createApiServiceError('Provide a Simplero API key to connect.');
    }
    if (!/\S.*\([^()\s]+@[^()\s]+\)/.test(params.userAgent)) {
      throw createApiServiceError(
        'Set userAgent to your application name and contact email, such as "My App (me@example.com)".'
      );
    }
    this.axios = createAxios({
      baseURL: 'https://simplero.com/api/v1',
      auth: {
        username: params.token,
        password: ''
      },
      headers: {
        'User-Agent': params.userAgent,
        'Content-Type': 'application/json'
      }
    });

    // Request transforms run after the SDK's User-Agent interceptor.
    let transforms = this.axios.defaults.transformRequest;
    this.axios.defaults.transformRequest = [
      ...(Array.isArray(transforms) ? transforms : transforms ? [transforms] : []),
      (data, headers) => {
        headers.set('User-Agent', params.userAgent);
        return data;
      }
    ];
    this.axios.interceptors.response.use(
      response => {
        if (response.data?.success === false) {
          throw createApiServiceError(
            extractApiErrorMessage(undefined, {
              response: { data: response.data },
              detailKeys: ['error', 'message', 'reason'],
              fallbackMessage: 'Simplero did not complete the operation.'
            })
          );
        }
        return response;
      },
      error => {
        throw buildApiServiceError(error, {
          providerLabel: 'Simplero',
          reason: 'simplero_api_error',
          extractResponse: (error, helpers) => {
            let raw = helpers.getResponse(error);
            if (!helpers.isRecord(error) || !helpers.isRecord(error.data)) return raw;
            let data = error.data;
            let baggage = helpers.isRecord(data.baggage) ? data.baggage : undefined;
            let upstream = helpers.isRecord(data.upstream) ? data.upstream : undefined;
            let status = upstream?.status ?? data.status ?? raw?.status;
            return {
              status:
                typeof status === 'number' || typeof status === 'string' ? status : undefined,
              statusText: raw?.statusText,
              data: baggage?.response ?? raw?.data
            };
          },
          detailKeys: ['error', 'message', 'reason']
        });
      }
    );
  }

  private contactIdentifier(identifier: {
    email?: string;
    contactId?: string;
    contactToken?: string;
  }): Record<string, string> {
    let body: Record<string, string> = {};
    if (identifier.email) body.email = identifier.email;
    if (identifier.contactId) body.id = identifier.contactId;
    if (identifier.contactToken) body.token = identifier.contactToken;
    if (Object.keys(body).length === 0) {
      throw createApiServiceError(
        'Provide email, contactId, or contactToken to identify the contact.'
      );
    }
    return body;
  }

  private async contactEmail(identifier: {
    email?: string;
    contactId?: string;
    contactToken?: string;
  }): Promise<string> {
    if (identifier.email) return identifier.email;
    let contact = await this.findContact(identifier);
    if (typeof contact.email !== 'string' || !contact.email) {
      throw createApiServiceError(
        'This contact has no email address. Provide a contact with an email.'
      );
    }
    return contact.email;
  }

  private paginationQuery(
    params?: { page?: number; perPage?: number },
    firstPage = 0
  ): Record<string, string> {
    let query: Record<string, string> = {};
    if (params?.page !== undefined) {
      if (!Number.isInteger(params.page) || params.page < firstPage) {
        throw createApiServiceError(`page must be a whole number of at least ${firstPage}.`);
      }
      query.page = String(params.page);
    }
    if (params?.perPage !== undefined) {
      if (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > 100) {
        throw createApiServiceError('perPage must be a whole number between 1 and 100.');
      }
      query.per_page = String(params.perPage);
    }
    return query;
  }

  // ---- Contacts ----

  async listContacts(params?: {
    page?: number;
    perPage?: number;
    from?: string;
    to?: string;
    updatedFrom?: string;
    updatedTo?: string;
    tagId?: number;
  }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params);
    if (params?.from) query.from = params.from;
    if (params?.to) query.to = params.to;
    if (params?.updatedFrom) query.updated_from = params.updatedFrom;
    if (params?.updatedTo) query.updated_to = params.updatedTo;
    if (params?.tagId !== undefined) query.tag_id = String(params.tagId);
    let response = await this.axios.get('/customers.json', { params: query });
    return response.data;
  }

  async getContact(contactId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/customers/${encodeURIComponent(contactId)}.json`);
    return response.data;
  }

  async findContact(identifier: {
    email?: string;
    contactId?: string;
    contactToken?: string;
  }): Promise<Record<string, unknown>> {
    let body = this.contactIdentifier(identifier);
    let response = await this.axios.post('/customers/find.json', body);
    return response.data;
  }

  async createOrUpdateContact(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    ipAddress?: string;
    referrer?: string;
    ref?: string;
    track?: string;
    firstActivatedAt?: string;
    autoResponderStartAt?: string;
    landingPageId?: number;
    tags?: string[];
    note?: string;
    phone?: string;
    gdprConsent?: boolean;
    gdprConsentText?: string;
    override?: boolean;
    customFields?: Record<string, string>;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { email: data.email };
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.ipAddress !== undefined) body.ip_address = data.ipAddress;
    if (data.referrer !== undefined) body.referrer = data.referrer;
    if (data.ref !== undefined) body.ref = data.ref;
    if (data.track !== undefined) body.track = data.track;
    if (data.firstActivatedAt !== undefined) body.first_activated_at = data.firstActivatedAt;
    if (data.autoResponderStartAt !== undefined)
      body.auto_responder_start_at = data.autoResponderStartAt;
    if (data.landingPageId !== undefined) body.landing_page_id = data.landingPageId;
    if (data.tags !== undefined) body.tags = data.tags.join(',');
    if (data.note !== undefined) body.note = data.note;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.gdprConsent !== undefined) body.gdpr_consent = data.gdprConsent ? 1 : 0;
    if (data.gdprConsentText !== undefined) body.gdpr_consent_text = data.gdprConsentText;
    if (data.override) body.override = 'yes';
    if (data.customFields) {
      for (let [key, value] of Object.entries(data.customFields)) {
        if (!/^field_\d+_[a-zA-Z0-9_]+$/.test(key)) {
          throw createApiServiceError(
            'Use internal custom field names such as field_123_value.'
          );
        }
        body[key] = value;
      }
    }
    let response = await this.axios.post('/customers.json', body);
    return response.data;
  }

  async updateContactCredentials(data: {
    email?: string;
    contactId?: string;
    contactToken?: string;
    firstName?: string;
    lastName?: string;
    updateLoginEmail?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, string> = {};
    if (data.email) body.email = data.email;
    if (data.contactId) body.id = data.contactId;
    if (data.contactToken) body.token = data.contactToken;
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.updateLoginEmail !== undefined) body.update_login_email = data.updateLoginEmail;
    let response = await this.axios.post('/customers/update_credentials.json', body);
    return response.data;
  }

  async addTagToContact(
    identifier: { email?: string; contactId?: string; contactToken?: string },
    tag: string
  ): Promise<Record<string, unknown>> {
    let body = { ...this.contactIdentifier(identifier), tag };
    let response = await this.axios.post('/customers/add_tag.json', body);
    return response.data;
  }

  async removeTagFromContact(
    identifier: { email?: string; contactId?: string; contactToken?: string },
    tag: string
  ): Promise<Record<string, unknown>> {
    let body = { ...this.contactIdentifier(identifier), tag };
    let response = await this.axios.post('/customers/remove_tag.json', body);
    return response.data;
  }

  async getCourseCompletions(identifier: {
    email?: string;
    contactId?: string;
    contactToken?: string;
  }): Promise<Record<string, unknown>> {
    let email = await this.contactEmail(identifier);
    let response = await this.axios.post('/customers/course_completions.json', { email });
    return response.data;
  }

  async issuePoints(data: {
    email?: string;
    contactId?: string;
    contactToken?: string;
    pointTypeId: number;
    amount: number;
    note?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      point_type_id: data.pointTypeId,
      amount: data.amount
    };
    if (data.email) body.email = data.email;
    if (data.contactId) body.id = data.contactId;
    if (data.contactToken) body.token = data.contactToken;
    if (data.note !== undefined) body.note = data.note;
    let response = await this.axios.post('/customers/issue_points.json', body);
    return response.data;
  }

  // ---- Tags ----

  async listTags(params?: {
    page?: number;
    perPage?: number;
  }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params);
    let response = await this.axios.get('/tags.json', { params: query });
    return response.data;
  }

  async getTag(tagId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/tags/${encodeURIComponent(tagId)}.json`);
    return response.data;
  }

  async tagContactById(
    tagId: string,
    identifier: { email?: string; contactId?: string; contactToken?: string }
  ): Promise<Record<string, unknown>> {
    let email = await this.contactEmail(identifier);
    let response = await this.axios.post(`/tags/${encodeURIComponent(tagId)}/tag.json`, {
      email
    });
    return response.data;
  }

  async untagContactById(
    tagId: string,
    identifier: { email?: string; contactId?: string; contactToken?: string }
  ): Promise<Record<string, unknown>> {
    let email = await this.contactEmail(identifier);
    let response = await this.axios.post(`/tags/${encodeURIComponent(tagId)}/untag.json`, {
      email
    });
    return response.data;
  }

  // ---- Lists ----

  async getLists(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/lists.json');
    return response.data;
  }

  async subscribeToList(
    listId: string,
    data: {
      email: string;
      firstName?: string;
      lastName?: string;
      ipAddress?: string;
      referrer?: string;
      ref?: string;
      track?: string;
      firstActivatedAt?: string;
      autoResponderStartAt?: string;
      landingPageId?: number;
      tags?: string[];
      phone?: string;
      gdprConsent?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { email: data.email };
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.ipAddress !== undefined) body.ip_address = data.ipAddress;
    if (data.referrer !== undefined) body.referrer = data.referrer;
    if (data.ref !== undefined) body.ref = data.ref;
    if (data.track !== undefined) body.track = data.track;
    if (data.firstActivatedAt !== undefined) body.first_activated_at = data.firstActivatedAt;
    if (data.autoResponderStartAt !== undefined)
      body.auto_responder_start_at = data.autoResponderStartAt;
    if (data.landingPageId !== undefined) body.landing_page_id = data.landingPageId;
    if (data.tags !== undefined) body.tags = data.tags.join(',');
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.gdprConsent !== undefined) body.gdpr_consent = data.gdprConsent;
    let response = await this.axios.post(
      `/lists/${encodeURIComponent(listId)}/subscribe.json`,
      body
    );
    return response.data;
  }

  async bulkSubscribeToList(
    listId: string,
    subscribers: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
    }>
  ): Promise<{ token: string }> {
    if (subscribers.length === 0 || subscribers.length > 1000) {
      throw createApiServiceError(
        'Provide between 1 and 1,000 subscribers for bulk subscribe.'
      );
    }
    if (subscribers.some(subscriber => !subscriber.email.trim())) {
      throw createApiServiceError('Every bulk subscriber must have an email address.');
    }
    let subscriberData = subscribers.map(s => {
      let entry: Record<string, string> = { email: s.email };
      if (s.firstName) entry.first_name = s.firstName;
      if (s.lastName) entry.last_name = s.lastName;
      return entry;
    });
    let response = await this.axios.post(
      `/lists/${encodeURIComponent(listId)}/bulk_subscribe.json`,
      {
        subscriber_data: subscriberData
      }
    );
    return response.data;
  }

  async unsubscribeFromList(listId: string, email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/lists/${encodeURIComponent(listId)}/unsubscribe.json`,
      { email }
    );
    return response.data;
  }

  async findSubscription(listId: string, email: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.post(
      `/lists/${encodeURIComponent(listId)}/subscriptions/find.json`,
      {
        email
      }
    );
    return response.data;
  }

  async listSubscriptions(params?: {
    page?: number;
    perPage?: number;
    listId?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params);
    if (params?.listId) query.list_id = params.listId;
    if (params?.status) query.status = params.status;
    if (params?.from) query.from = params.from;
    if (params?.to) query.to = params.to;
    let response = await this.axios.get('/subscriptions.json', { params: query });
    return response.data;
  }

  // ---- Products ----

  async listProducts(params?: {
    page?: number;
    perPage?: number;
  }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params);
    let response = await this.axios.get('/products.json', { params: query });
    return response.data;
  }

  async getProduct(productId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/products/${encodeURIComponent(productId)}.json`);
    return response.data;
  }

  // ---- Purchases ----

  async createFreePurchase(
    productId: string,
    data: {
      email: string;
      firstName?: string;
      lastName?: string;
      skipContract?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { email: data.email };
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.skipContract !== undefined) body.skip_contract = data.skipContract;
    let response = await this.axios.post(
      `/products/${encodeURIComponent(productId)}/purchases.json`,
      body
    );
    return response.data;
  }

  async findPurchase(
    productId: string,
    identifier: {
      email?: string;
      purchaseId?: string;
      purchaseToken?: string;
    }
  ): Promise<unknown> {
    if (!identifier.email && !identifier.purchaseId && !identifier.purchaseToken) {
      throw createApiServiceError(
        'Provide email, purchaseId, or purchaseToken to find a purchase.'
      );
    }
    let body: Record<string, string> = {};
    if (identifier.email) body.email = identifier.email;
    if (identifier.purchaseId) body.id = identifier.purchaseId;
    if (identifier.purchaseToken) body.token = identifier.purchaseToken;
    let response = await this.axios.post(
      `/products/${encodeURIComponent(productId)}/purchases/find.json`,
      body
    );
    return response.data;
  }

  async searchPurchases(params?: {
    page?: number;
    perPage?: number;
    productId?: string;
    state?: string;
    createdStartAt?: string;
    createdEndAt?: string;
    firstSuccessfulChargeStartAt?: string;
    firstSuccessfulChargeEndAt?: string;
  }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params, 1);
    if (params?.productId) query['filters[product_id]'] = params.productId;
    if (params?.state) query['filters[state]'] = params.state;
    if (params?.createdStartAt) query['filters[created][start_at]'] = params.createdStartAt;
    if (params?.createdEndAt) query['filters[created][end_at]'] = params.createdEndAt;
    if (params?.firstSuccessfulChargeStartAt)
      query['filters[first_successful_charge][start_at]'] =
        params.firstSuccessfulChargeStartAt;
    if (params?.firstSuccessfulChargeEndAt)
      query['filters[first_successful_charge][end_at]'] = params.firstSuccessfulChargeEndAt;
    let response = await this.axios.get('/purchases/search.json', { params: query });
    return response.data;
  }

  // ---- Invoices ----

  async listInvoices(params?: {
    createdAtFrom?: string;
    createdAtTo?: string;
    paidAtFrom?: string;
    paidAtTo?: string;
    invoiceNumberFrom?: string;
    invoiceNumberTo?: string;
    dir?: string;
    page?: number;
  }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params, 1);
    if (params?.createdAtFrom) query.created_at_from = params.createdAtFrom;
    if (params?.createdAtTo) query.created_at_to = params.createdAtTo;
    if (params?.paidAtFrom) query.paid_at_from = params.paidAtFrom;
    if (params?.paidAtTo) query.paid_at_to = params.paidAtTo;
    if (params?.invoiceNumberFrom) query.invoice_number_from = params.invoiceNumberFrom;
    if (params?.invoiceNumberTo) query.invoice_number_to = params.invoiceNumberTo;
    if (params?.dir) query.dir = params.dir;
    let response = await this.axios.get('/invoices.json', { params: query });
    return response.data;
  }

  // ---- Administrators ----

  async listAdministrators(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/administratorships.json');
    return response.data;
  }

  async getAdministrator(adminId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/administratorships/${encodeURIComponent(adminId)}.json`
    );
    return response.data;
  }

  async findAdministrator(email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/administratorships/find.json', { email });
    return response.data;
  }

  async createOrUpdateAdministrator(data: {
    email: string;
    adminRoleId: number;
    ticketAssignee?: boolean;
    showOnTicket?: boolean;
    autogenerate?: boolean;
    inviteeName?: string;
    inviterEmail?: string;
    message?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      email: data.email,
      admin_role_id: data.adminRoleId
    };
    if (data.ticketAssignee !== undefined) body.ticket_assignee = data.ticketAssignee;
    if (data.showOnTicket !== undefined) body.show_on_ticket = data.showOnTicket;
    if (data.autogenerate !== undefined) body.autogenerate = data.autogenerate;
    if (data.inviteeName !== undefined) body.invitee_name = data.inviteeName;
    if (data.inviterEmail !== undefined) body.inviter_email = data.inviterEmail;
    if (data.message !== undefined) body.message = data.message;
    let response = await this.axios.post('/administratorships.json', body);
    return response.data;
  }

  async removeAdministrator(adminId: string): Promise<void> {
    await this.axios.delete(`/administratorships/${encodeURIComponent(adminId)}.json`);
  }

  async listAdminRoles(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/admin_roles.json');
    return response.data;
  }

  // ---- Broadcasts ----

  async listBroadcasts(params?: {
    page?: number;
    perPage?: number;
    from?: string;
    to?: string;
  }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params);
    if (params?.from) query.from = params.from;
    if (params?.to) query.to = params.to;
    let response = await this.axios.get('/broadcasts.json', { params: query });
    return response.data;
  }

  async getBroadcast(broadcastId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/broadcasts/${encodeURIComponent(broadcastId)}.json`);
    return response.data;
  }

  async createBroadcast(data: {
    subject: string;
    body?: string;
    senderName?: string;
    senderEmail?: string;
    replyTo?: string;
    emailTemplateId?: number;
    listIds?: number[];
    segmentIds?: number[];
    deliveryType?: string;
    deliverAt?: string;
  }): Promise<Record<string, unknown>> {
    if (data.deliveryType === 'later' && !data.deliverAt?.trim()) {
      throw createApiServiceError('deliverAt is required when deliveryType is "later".');
    }
    let reqBody: Record<string, unknown> = { subject: data.subject };
    if (data.body !== undefined) reqBody.body = data.body;
    if (data.senderName !== undefined) reqBody.sender_name = data.senderName;
    if (data.senderEmail !== undefined) reqBody.sender_email = data.senderEmail;
    if (data.replyTo !== undefined) reqBody.reply_to = data.replyTo;
    if (data.emailTemplateId !== undefined) reqBody.email_template_id = data.emailTemplateId;
    if (data.listIds !== undefined) reqBody.list_ids = data.listIds;
    if (data.segmentIds !== undefined) reqBody.segment_ids = data.segmentIds;
    if (data.deliveryType !== undefined && data.deliveryType !== 'draft') {
      reqBody.delivery_type = data.deliveryType;
    }
    if (data.deliverAt !== undefined) reqBody.deliver_at = data.deliverAt;
    let response = await this.axios.post('/broadcasts.json', reqBody);
    return response.data;
  }

  async sendTestBroadcast(
    broadcastId: string,
    email: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/broadcasts/${encodeURIComponent(broadcastId)}/send_test.json`,
      {
        email
      }
    );
    return response.data;
  }

  async getBroadcastActivity(broadcastId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/broadcasts/${encodeURIComponent(broadcastId)}/activity.json`
    );
    return response.data;
  }

  // ---- Automations ----

  async listAutomations(params?: { page?: number }): Promise<Record<string, unknown>[]> {
    let query = this.paginationQuery(params);
    let response = await this.axios.get('/automations.json', { params: query });
    return response.data;
  }

  async startAutomation(
    automationId: string,
    email: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/automations/${encodeURIComponent(automationId)}/start.json`,
      { email }
    );
    return response.data;
  }

  // ---- Segments ----

  async listSegments(params?: {
    page?: number;
    perPage?: number;
    after?: number;
    query?: string;
  }): Promise<{
    data: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    let query = this.paginationQuery(params, 1);
    if (params?.after !== undefined) {
      if (!Number.isInteger(params.after) || params.after < 0) {
        throw createApiServiceError('after must be a nonnegative whole number.');
      }
      query.after = String(params.after);
    }
    if (params?.query !== undefined) query.q = params.query;
    let response = await this.axios.get('https://simplero.com/api/v2/segments', {
      params: query
    });
    return response.data;
  }

  // ---- Account ----

  async getAccountFields(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/account/fields.json');
    return response.data;
  }

  async getAccountInfo(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/account/zapier_who_am_i.json');
    return response.data;
  }

  // ---- Async Requests ----

  async getRequestStatus(requestToken: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/requests/${encodeURIComponent(requestToken)}.json`);
    return response.data;
  }

  // ---- Zapier Subscriptions (Webhooks) ----

  async createZapierSubscription(data: {
    event: string;
    targetId?: number;
    targetUrl: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      event: data.event,
      target_url: data.targetUrl
    };
    if (data.targetId !== undefined) body.target_id = data.targetId;
    let response = await this.axios.post('/zapier_subscriptions.json', body);
    return response.data;
  }

  async destroyZapierSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/zapier_subscriptions/${subscriptionId}.json`);
    return response.data;
  }
}
