import { createAxios } from 'slates';
import type {
  KitAccount,
  KitBroadcast,
  KitBroadcastStats,
  KitCustomField,
  KitEmailTemplate,
  KitForm,
  KitPaginatedResponse,
  KitPurchase,
  KitSegment,
  KitSequence,
  KitSubscriber,
  KitTag,
  KitWebhook
} from './types';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(private config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.kit.com/v4',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.http.interceptors.request.use(reqConfig => {
      // OAuth tokens are longer; API keys are shorter. Both work via different headers.
      // We try Bearer first; if the token looks like an API key, also set that header.
      // Kit accepts both simultaneously without issue.
      let headers = (reqConfig.headers ?? {}) as Record<string, string>;
      headers.Authorization = `Bearer ${this.config.token}`;
      headers['X-Kit-Api-Key'] = this.config.token;
      reqConfig.headers = headers as any;
      return reqConfig;
    });
  }

  // ──────────────────────────────────────────────
  // Account
  // ──────────────────────────────────────────────

  async getAccount(): Promise<KitAccount> {
    let response = await this.http.get('/account');
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Subscribers
  // ──────────────────────────────────────────────

  async listSubscribers(params?: {
    after?: string;
    before?: string;
    perPage?: number;
    status?: string;
    sortField?: string;
    sortOrder?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    emailAddress?: string;
  }): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.status) query.status = params.status;
    if (params?.sortField) query.sort_field = params.sortField;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.createdAfter) query.created_after = params.createdAfter;
    if (params?.createdBefore) query.created_before = params.createdBefore;
    if (params?.updatedAfter) query.updated_after = params.updatedAfter;
    if (params?.updatedBefore) query.updated_before = params.updatedBefore;
    if (params?.emailAddress) query.email_address = params.emailAddress;

    let response = await this.http.get('/subscribers', { params: query });
    return response.data;
  }

  async getSubscriber(subscriberId: number): Promise<{ subscriber: KitSubscriber }> {
    let response = await this.http.get(`/subscribers/${subscriberId}`);
    return response.data;
  }

  async createSubscriber(data: {
    emailAddress: string;
    firstName?: string;
    state?: string;
    fields?: Record<string, string>;
  }): Promise<{ subscriber: KitSubscriber }> {
    let body: Record<string, any> = {
      email_address: data.emailAddress
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.state) body.state = data.state;
    if (data.fields) body.fields = data.fields;

    let response = await this.http.post('/subscribers', body);
    return response.data;
  }

  async updateSubscriber(
    subscriberId: number,
    data: {
      emailAddress?: string;
      firstName?: string;
      fields?: Record<string, string>;
    }
  ): Promise<{ subscriber: KitSubscriber }> {
    let body: Record<string, any> = {};
    if (data.emailAddress) body.email_address = data.emailAddress;
    if (data.firstName) body.first_name = data.firstName;
    if (data.fields) body.fields = data.fields;

    let response = await this.http.put(`/subscribers/${subscriberId}`, body);
    return response.data;
  }

  async unsubscribeSubscriber(subscriberId: number): Promise<{ subscriber: KitSubscriber }> {
    let response = await this.http.post(`/subscribers/${subscriberId}/unsubscribe`);
    return response.data;
  }

  async listTagsForSubscriber(
    subscriberId: number,
    params?: {
      after?: string;
      before?: string;
      perPage?: number;
    }
  ): Promise<KitPaginatedResponse<KitTag>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.http.get(`/subscribers/${subscriberId}/tags`, { params: query });
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Tags
  // ──────────────────────────────────────────────

  async listTags(params?: {
    after?: string;
    before?: string;
    perPage?: number;
  }): Promise<KitPaginatedResponse<KitTag>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.http.get('/tags', { params: query });
    return response.data;
  }

  async createTag(name: string): Promise<{ tag: KitTag }> {
    let response = await this.http.post('/tags', { name });
    return response.data;
  }

  async updateTag(tagId: number, name: string): Promise<{ tag: KitTag }> {
    let response = await this.http.put(`/tags/${tagId}`, { name });
    return response.data;
  }

  async deleteTag(tagId: number): Promise<void> {
    await this.http.delete(`/tags/${tagId}`);
  }

  async tagSubscriber(tagId: number, subscriberId: number): Promise<void> {
    await this.http.post(`/tags/${tagId}/subscribers/${subscriberId}`);
  }

  async tagSubscriberByEmail(tagId: number, emailAddress: string): Promise<void> {
    await this.http.post(`/tags/${tagId}/subscribers`, { email_address: emailAddress });
  }

  async removeTagFromSubscriber(tagId: number, subscriberId: number): Promise<void> {
    await this.http.delete(`/tags/${tagId}/subscribers/${subscriberId}`);
  }

  async removeTagFromSubscriberByEmail(tagId: number, emailAddress: string): Promise<void> {
    await this.http.post(`/tags/${tagId}/subscribers/remove`, { email_address: emailAddress });
  }

  async listSubscribersForTag(
    tagId: number,
    params?: {
      after?: string;
      before?: string;
      perPage?: number;
      status?: string;
    }
  ): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.status) query.status = params.status;

    let response = await this.http.get(`/tags/${tagId}/subscribers`, { params: query });
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Custom Fields
  // ──────────────────────────────────────────────

  async listCustomFields(): Promise<KitPaginatedResponse<KitCustomField>> {
    let response = await this.http.get('/custom_fields');
    return response.data;
  }

  async createCustomField(label: string): Promise<{ custom_field: KitCustomField }> {
    let response = await this.http.post('/custom_fields', { label });
    return response.data;
  }

  async updateCustomField(
    customFieldId: number,
    label: string
  ): Promise<{ custom_field: KitCustomField }> {
    let response = await this.http.put(`/custom_fields/${customFieldId}`, { label });
    return response.data;
  }

  async deleteCustomField(customFieldId: number): Promise<void> {
    await this.http.delete(`/custom_fields/${customFieldId}`);
  }

  // ──────────────────────────────────────────────
  // Forms
  // ──────────────────────────────────────────────

  async listForms(params?: {
    type?: string;
    status?: string;
    after?: string;
    before?: string;
    perPage?: number;
  }): Promise<KitPaginatedResponse<KitForm>> {
    let query: Record<string, any> = {};
    if (params?.type) query.type = params.type;
    if (params?.status) query.status = params.status;
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.http.get('/forms', { params: query });
    return response.data;
  }

  async addSubscriberToForm(
    formId: number,
    subscriberId: number
  ): Promise<{ subscriber: KitSubscriber }> {
    let response = await this.http.post(`/forms/${formId}/subscribers/${subscriberId}`);
    return response.data;
  }

  async addSubscriberToFormByEmail(
    formId: number,
    emailAddress: string
  ): Promise<{ subscriber: KitSubscriber }> {
    let response = await this.http.post(`/forms/${formId}/subscribers`, {
      email_address: emailAddress
    });
    return response.data;
  }

  async listSubscribersForForm(
    formId: number,
    params?: {
      after?: string;
      before?: string;
      perPage?: number;
      status?: string;
    }
  ): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.status) query.status = params.status;

    let response = await this.http.get(`/forms/${formId}/subscribers`, { params: query });
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Broadcasts
  // ──────────────────────────────────────────────

  async listBroadcasts(params?: {
    after?: string;
    before?: string;
    perPage?: number;
  }): Promise<KitPaginatedResponse<KitBroadcast>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.http.get('/broadcasts', { params: query });
    return response.data;
  }

  async getBroadcast(broadcastId: number): Promise<{ broadcast: KitBroadcast }> {
    let response = await this.http.get(`/broadcasts/${broadcastId}`);
    return response.data;
  }

  async createBroadcast(data: {
    subject?: string;
    content?: string;
    description?: string;
    emailAddress?: string;
    emailTemplateId?: number;
    emailLayoutTemplate?: string;
    public?: boolean;
    publishedAt?: string;
    sendAt?: string;
    thumbnailAlt?: string;
    thumbnailUrl?: string;
    previewText?: string;
    subscriberFilter?: Record<string, any>[];
  }): Promise<{ broadcast: KitBroadcast }> {
    let body: Record<string, any> = {};
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.content !== undefined) body.content = data.content;
    if (data.description !== undefined) body.description = data.description;
    if (data.emailAddress !== undefined) body.email_address = data.emailAddress;
    if (data.emailTemplateId !== undefined) body.email_template_id = data.emailTemplateId;
    if (data.emailLayoutTemplate !== undefined)
      body.email_layout_template = data.emailLayoutTemplate;
    if (data.public !== undefined) body.public = data.public;
    if (data.publishedAt !== undefined) body.published_at = data.publishedAt;
    if (data.sendAt !== undefined) body.send_at = data.sendAt;
    if (data.thumbnailAlt !== undefined) body.thumbnail_alt = data.thumbnailAlt;
    if (data.thumbnailUrl !== undefined) body.thumbnail_url = data.thumbnailUrl;
    if (data.previewText !== undefined) body.preview_text = data.previewText;
    if (data.subscriberFilter !== undefined) body.subscriber_filter = data.subscriberFilter;

    let response = await this.http.post('/broadcasts', body);
    return response.data;
  }

  async updateBroadcast(
    broadcastId: number,
    data: {
      subject?: string;
      content?: string;
      description?: string;
      emailAddress?: string;
      emailTemplateId?: number;
      emailLayoutTemplate?: string;
      public?: boolean;
      publishedAt?: string;
      sendAt?: string;
      thumbnailAlt?: string;
      thumbnailUrl?: string;
      previewText?: string;
      subscriberFilter?: Record<string, any>[];
    }
  ): Promise<{ broadcast: KitBroadcast }> {
    let body: Record<string, any> = {};
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.content !== undefined) body.content = data.content;
    if (data.description !== undefined) body.description = data.description;
    if (data.emailAddress !== undefined) body.email_address = data.emailAddress;
    if (data.emailTemplateId !== undefined) body.email_template_id = data.emailTemplateId;
    if (data.emailLayoutTemplate !== undefined)
      body.email_layout_template = data.emailLayoutTemplate;
    if (data.public !== undefined) body.public = data.public;
    if (data.publishedAt !== undefined) body.published_at = data.publishedAt;
    if (data.sendAt !== undefined) body.send_at = data.sendAt;
    if (data.thumbnailAlt !== undefined) body.thumbnail_alt = data.thumbnailAlt;
    if (data.thumbnailUrl !== undefined) body.thumbnail_url = data.thumbnailUrl;
    if (data.previewText !== undefined) body.preview_text = data.previewText;
    if (data.subscriberFilter !== undefined) body.subscriber_filter = data.subscriberFilter;

    let response = await this.http.put(`/broadcasts/${broadcastId}`, body);
    return response.data;
  }

  async deleteBroadcast(broadcastId: number): Promise<void> {
    await this.http.delete(`/broadcasts/${broadcastId}`);
  }

  async getBroadcastStats(broadcastId: number): Promise<{ broadcast: KitBroadcastStats }> {
    let response = await this.http.get(`/broadcasts/${broadcastId}/stats`);
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Sequences
  // ──────────────────────────────────────────────

  async listSequences(params?: {
    after?: string;
    before?: string;
    perPage?: number;
  }): Promise<KitPaginatedResponse<KitSequence>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.http.get('/sequences', { params: query });
    return response.data;
  }

  async addSubscriberToSequence(
    sequenceId: number,
    subscriberId: number
  ): Promise<{ subscriber: KitSubscriber }> {
    let response = await this.http.post(
      `/sequences/${sequenceId}/subscribers/${subscriberId}`
    );
    return response.data;
  }

  async addSubscriberToSequenceByEmail(
    sequenceId: number,
    emailAddress: string
  ): Promise<{ subscriber: KitSubscriber }> {
    let response = await this.http.post(`/sequences/${sequenceId}/subscribers`, {
      email_address: emailAddress
    });
    return response.data;
  }

  async listSubscribersForSequence(
    sequenceId: number,
    params?: {
      after?: string;
      before?: string;
      perPage?: number;
      status?: string;
    }
  ): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.status) query.status = params.status;

    let response = await this.http.get(`/sequences/${sequenceId}/subscribers`, {
      params: query
    });
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Segments
  // ──────────────────────────────────────────────

  async listSegments(params?: {
    after?: string;
    before?: string;
    perPage?: number;
  }): Promise<KitPaginatedResponse<KitSegment>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.http.get('/segments', { params: query });
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Purchases
  // ──────────────────────────────────────────────

  async listPurchases(params?: {
    after?: string;
    before?: string;
    perPage?: number;
  }): Promise<KitPaginatedResponse<KitPurchase>> {
    let query: Record<string, any> = {};
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.http.get('/purchases', { params: query });
    return response.data;
  }

  async getPurchase(purchaseId: number): Promise<{ purchase: KitPurchase }> {
    let response = await this.http.get(`/purchases/${purchaseId}`);
    return response.data;
  }

  async createPurchase(data: {
    emailAddress: string;
    transactionId: string;
    currency?: string;
    transactionTime?: string;
    subtotal?: number;
    tax?: number;
    discount?: number;
    total?: number;
    status?: string;
    products: Array<{
      name: string;
      sku?: string;
      pid: number;
      lid: number;
      unitPrice: number;
      quantity: number;
    }>;
  }): Promise<{ purchase: KitPurchase }> {
    let body: Record<string, any> = {
      email_address: data.emailAddress,
      transaction_id: data.transactionId,
      products: data.products.map(p => ({
        name: p.name,
        sku: p.sku,
        pid: p.pid,
        lid: p.lid,
        unit_price: p.unitPrice,
        quantity: p.quantity
      }))
    };
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.transactionTime !== undefined) body.transaction_time = data.transactionTime;
    if (data.subtotal !== undefined) body.subtotal = data.subtotal;
    if (data.tax !== undefined) body.tax = data.tax;
    if (data.discount !== undefined) body.discount = data.discount;
    if (data.total !== undefined) body.total = data.total;
    if (data.status !== undefined) body.status = data.status;

    let response = await this.http.post('/purchases', body);
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Email Templates
  // ──────────────────────────────────────────────

  async listEmailTemplates(): Promise<KitPaginatedResponse<KitEmailTemplate>> {
    let response = await this.http.get('/email_templates');
    return response.data;
  }

  // ──────────────────────────────────────────────
  // Webhooks
  // ──────────────────────────────────────────────

  async createWebhook(
    targetUrl: string,
    event: {
      name: string;
      formId?: number;
      sequenceId?: number;
      tagId?: number;
      productId?: number;
      initiatorValue?: string;
    }
  ): Promise<{ webhook: KitWebhook }> {
    let eventPayload: Record<string, any> = { name: event.name };
    if (event.formId !== undefined) eventPayload.form_id = event.formId;
    if (event.sequenceId !== undefined) eventPayload.sequence_id = event.sequenceId;
    if (event.tagId !== undefined) eventPayload.tag_id = event.tagId;
    if (event.productId !== undefined) eventPayload.product_id = event.productId;
    if (event.initiatorValue !== undefined)
      eventPayload.initiator_value = event.initiatorValue;

    let response = await this.http.post('/webhooks', {
      target_url: targetUrl,
      event: eventPayload
    });
    return response.data;
  }

  async listWebhooks(): Promise<KitPaginatedResponse<KitWebhook>> {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }
}
