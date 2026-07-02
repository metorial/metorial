import { createAxios } from 'slates';

export class SimpleroClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; userAgent: string }) {
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
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.from) query.from = params.from;
    if (params?.to) query.to = params.to;
    if (params?.updatedFrom) query.updated_from = params.updatedFrom;
    if (params?.updatedTo) query.updated_to = params.updatedTo;
    if (params?.tagId !== undefined) query.tag_id = String(params.tagId);
    let response = await this.axios.get('/customers.json', { params: query });
    return response.data;
  }

  async getContact(contactId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/customers/${contactId}.json`);
    return response.data;
  }

  async findContact(identifier: {
    email?: string;
    contactId?: string;
    contactToken?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, string> = {};
    if (identifier.email) body.email = identifier.email;
    if (identifier.contactId) body.id = identifier.contactId;
    if (identifier.contactToken) body.token = identifier.contactToken;
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
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.note !== undefined) body.note = data.note;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.gdprConsent !== undefined) body.gdpr_consent = data.gdprConsent;
    if (data.gdprConsentText !== undefined) body.gdpr_consent_text = data.gdprConsentText;
    if (data.override) body.override = 'yes';
    if (data.customFields) {
      for (let [key, value] of Object.entries(data.customFields)) {
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
    let body: Record<string, string> = { tag };
    if (identifier.email) body.email = identifier.email;
    if (identifier.contactId) body.id = identifier.contactId;
    if (identifier.contactToken) body.token = identifier.contactToken;
    let response = await this.axios.post('/customers/add_tag.json', body);
    return response.data;
  }

  async removeTagFromContact(
    identifier: { email?: string; contactId?: string; contactToken?: string },
    tag: string
  ): Promise<Record<string, unknown>> {
    let body: Record<string, string> = { tag };
    if (identifier.email) body.email = identifier.email;
    if (identifier.contactId) body.id = identifier.contactId;
    if (identifier.contactToken) body.token = identifier.contactToken;
    let response = await this.axios.post('/customers/remove_tag.json', body);
    return response.data;
  }

  async getCourseCompletions(identifier: {
    email?: string;
    contactId?: string;
    contactToken?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, string> = {};
    if (identifier.email) body.email = identifier.email;
    if (identifier.contactId) body.id = identifier.contactId;
    if (identifier.contactToken) body.token = identifier.contactToken;
    let response = await this.axios.post('/customers/course_completions.json', body);
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
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    let response = await this.axios.get('/tags.json', { params: query });
    return response.data;
  }

  async getTag(tagId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/tags/${tagId}.json`);
    return response.data;
  }

  async tagContactById(
    tagId: string,
    identifier: { email?: string; contactId?: string; contactToken?: string }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, string> = {};
    if (identifier.email) body.email = identifier.email;
    if (identifier.contactId) body.id = identifier.contactId;
    if (identifier.contactToken) body.token = identifier.contactToken;
    let response = await this.axios.post(`/tags/${tagId}/tag.json`, body);
    return response.data;
  }

  async untagContactById(
    tagId: string,
    identifier: { email?: string; contactId?: string; contactToken?: string }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, string> = {};
    if (identifier.email) body.email = identifier.email;
    if (identifier.contactId) body.id = identifier.contactId;
    if (identifier.contactToken) body.token = identifier.contactToken;
    let response = await this.axios.post(`/tags/${tagId}/untag.json`, body);
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
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.gdprConsent !== undefined) body.gdpr_consent = data.gdprConsent;
    let response = await this.axios.post(`/lists/${listId}/subscribe.json`, body);
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
    let subscriberData = subscribers.map(s => {
      let entry: Record<string, string> = { email: s.email };
      if (s.firstName) entry.first_name = s.firstName;
      if (s.lastName) entry.last_name = s.lastName;
      return entry;
    });
    let response = await this.axios.post(`/lists/${listId}/bulk_subscribe.json`, {
      subscriber_data: subscriberData
    });
    return response.data;
  }

  async unsubscribeFromList(listId: string, email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/lists/${listId}/unsubscribe.json`, { email });
    return response.data;
  }

  async findSubscription(listId: string, email: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.post(`/lists/${listId}/subscriptions/find.json`, {
      email
    });
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
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
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
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    let response = await this.axios.get('/products.json', { params: query });
    return response.data;
  }

  async getProduct(productId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/products/${productId}.json`);
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
    let response = await this.axios.post(`/products/${productId}/purchases.json`, body);
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
    let body: Record<string, string> = {};
    if (identifier.email) body.email = identifier.email;
    if (identifier.purchaseId) body.id = identifier.purchaseId;
    if (identifier.purchaseToken) body.token = identifier.purchaseToken;
    let response = await this.axios.post(`/products/${productId}/purchases/find.json`, body);
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
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
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
    let query: Record<string, string> = {};
    if (params?.createdAtFrom) query.created_at_from = params.createdAtFrom;
    if (params?.createdAtTo) query.created_at_to = params.createdAtTo;
    if (params?.paidAtFrom) query.paid_at_from = params.paidAtFrom;
    if (params?.paidAtTo) query.paid_at_to = params.paidAtTo;
    if (params?.invoiceNumberFrom) query.invoice_number_from = params.invoiceNumberFrom;
    if (params?.invoiceNumberTo) query.invoice_number_to = params.invoiceNumberTo;
    if (params?.dir) query.dir = params.dir;
    if (params?.page !== undefined) query.page = String(params.page);
    let response = await this.axios.get('/invoices.json', { params: query });
    return response.data;
  }

  // ---- Administrators ----

  async listAdministrators(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/administratorships.json');
    return response.data;
  }

  async getAdministrator(adminId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/administratorships/${adminId}.json`);
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
    await this.axios.delete(`/administratorships/${adminId}.json`);
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
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.from) query.from = params.from;
    if (params?.to) query.to = params.to;
    let response = await this.axios.get('/broadcasts.json', { params: query });
    return response.data;
  }

  async getBroadcast(broadcastId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/broadcasts/${broadcastId}.json`);
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
    let reqBody: Record<string, unknown> = { subject: data.subject };
    if (data.body !== undefined) reqBody.body = data.body;
    if (data.senderName !== undefined) reqBody.sender_name = data.senderName;
    if (data.senderEmail !== undefined) reqBody.sender_email = data.senderEmail;
    if (data.replyTo !== undefined) reqBody.reply_to = data.replyTo;
    if (data.emailTemplateId !== undefined) reqBody.email_template_id = data.emailTemplateId;
    if (data.listIds !== undefined) reqBody.list_ids = data.listIds;
    if (data.segmentIds !== undefined) reqBody.segment_ids = data.segmentIds;
    if (data.deliveryType !== undefined) reqBody.delivery_type = data.deliveryType;
    if (data.deliverAt !== undefined) reqBody.deliver_at = data.deliverAt;
    let response = await this.axios.post('/broadcasts.json', reqBody);
    return response.data;
  }

  async sendTestBroadcast(
    broadcastId: string,
    email: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/broadcasts/${broadcastId}/send_test.json`, {
      email
    });
    return response.data;
  }

  async getBroadcastActivity(broadcastId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/broadcasts/${broadcastId}/activity.json`);
    return response.data;
  }

  // ---- Automations ----

  async listAutomations(params?: { page?: number }): Promise<Record<string, unknown>[]> {
    let query: Record<string, string> = {};
    if (params?.page !== undefined) query.page = String(params.page);
    let response = await this.axios.get('/automations.json', { params: query });
    return response.data;
  }

  async startAutomation(
    automationId: string,
    email: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/automations/${automationId}/start.json`, { email });
    return response.data;
  }

  // ---- Segments ----

  async listSegments(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/segments.json');
    return response.data;
  }

  // ---- Account ----

  async getAccountFields(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/account/fields.json');
    return response.data;
  }

  async getAccountInfo(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/account/zapier_who_am_i.json');
    return response.data;
  }

  // ---- Async Requests ----

  async getRequestStatus(requestToken: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/requests/${requestToken}.json`);
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
