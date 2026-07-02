import { createAxios } from 'slates';
import type {
  Account,
  Broadcast,
  CustomField,
  EmailTemplate,
  Form,
  PaginationInfo,
  Purchase,
  Segment,
  Sequence,
  Subscriber,
  Tag,
  Webhook
} from './types';

interface ClientConfig {
  token: string;
  authMethod?: 'oauth' | 'api_key';
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.authMethod === 'api_key') {
      headers['X-Kit-Api-Key'] = config.token;
    } else {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.http = createAxios({
      baseURL: 'https://api.kit.com/v4',
      headers
    });
  }

  // ── Account ──

  async getAccount(): Promise<Account> {
    let response = await this.http.get('/account');
    return response.data as Account;
  }

  // ── Subscribers ──

  async listSubscribers(params?: {
    status?: string;
    emailAddress?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    sortField?: string;
    sortOrder?: string;
    perPage?: number;
    after?: string;
  }): Promise<{ subscribers: Subscriber[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.emailAddress) query.email_address = params.emailAddress;
    if (params?.createdAfter) query.created_after = params.createdAfter;
    if (params?.createdBefore) query.created_before = params.createdBefore;
    if (params?.updatedAfter) query.updated_after = params.updatedAfter;
    if (params?.updatedBefore) query.updated_before = params.updatedBefore;
    if (params?.sortField) query.sort_field = params.sortField;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/subscribers', { params: query });
    let data = response.data as { subscribers: Subscriber[]; pagination: PaginationInfo };
    return data;
  }

  async getSubscriber(subscriberId: number): Promise<Subscriber> {
    let response = await this.http.get(`/subscribers/${subscriberId}`);
    let data = response.data as { subscriber: Subscriber };
    return data.subscriber;
  }

  async createSubscriber(params: {
    emailAddress: string;
    firstName?: string;
    state?: string;
    fields?: Record<string, string>;
  }): Promise<Subscriber> {
    let body: Record<string, any> = {
      email_address: params.emailAddress
    };
    if (params.firstName) body.first_name = params.firstName;
    if (params.state) body.state = params.state;
    if (params.fields) body.fields = params.fields;

    let response = await this.http.post('/subscribers', body);
    let data = response.data as { subscriber: Subscriber };
    return data.subscriber;
  }

  async updateSubscriber(
    subscriberId: number,
    params: {
      emailAddress?: string;
      firstName?: string;
      fields?: Record<string, string>;
    }
  ): Promise<Subscriber> {
    let body: Record<string, any> = {};
    if (params.emailAddress) body.email_address = params.emailAddress;
    if (params.firstName !== undefined) body.first_name = params.firstName;
    if (params.fields) body.fields = params.fields;

    let response = await this.http.put(`/subscribers/${subscriberId}`, body);
    let data = response.data as { subscriber: Subscriber };
    return data.subscriber;
  }

  async unsubscribeSubscriber(subscriberId: number): Promise<void> {
    await this.http.post(`/subscribers/${subscriberId}/unsubscribe`, {});
  }

  async getSubscriberTags(
    subscriberId: number
  ): Promise<{ tags: Tag[]; pagination: PaginationInfo }> {
    let response = await this.http.get(`/subscribers/${subscriberId}/tags`);
    return response.data as { tags: Tag[]; pagination: PaginationInfo };
  }

  // ── Tags ──

  async listTags(params?: {
    perPage?: number;
    after?: string;
  }): Promise<{ tags: Tag[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/tags', { params: query });
    return response.data as { tags: Tag[]; pagination: PaginationInfo };
  }

  async createTag(name: string): Promise<Tag> {
    let response = await this.http.post('/tags', { name });
    let data = response.data as { tag: Tag };
    return data.tag;
  }

  async updateTag(tagId: number, name: string): Promise<Tag> {
    let response = await this.http.put(`/tags/${tagId}`, { name });
    let data = response.data as { tag: Tag };
    return data.tag;
  }

  async tagSubscriberById(tagId: number, subscriberId: number): Promise<void> {
    await this.http.post(`/tags/${tagId}/subscribers/${subscriberId}`, {});
  }

  async tagSubscriberByEmail(tagId: number, emailAddress: string): Promise<void> {
    await this.http.post(`/tags/${tagId}/subscribers`, { email_address: emailAddress });
  }

  async untagSubscriberById(tagId: number, subscriberId: number): Promise<void> {
    await this.http.delete(`/tags/${tagId}/subscribers/${subscriberId}`);
  }

  async listSubscribersForTag(
    tagId: number,
    params?: {
      status?: string;
      perPage?: number;
      after?: string;
    }
  ): Promise<{ subscribers: Subscriber[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get(`/tags/${tagId}/subscribers`, { params: query });
    return response.data as { subscribers: Subscriber[]; pagination: PaginationInfo };
  }

  // ── Forms ──

  async listForms(params?: {
    status?: string;
    type?: string;
    perPage?: number;
    after?: string;
  }): Promise<{ forms: Form[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.type) query.type = params.type;
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/forms', { params: query });
    return response.data as { forms: Form[]; pagination: PaginationInfo };
  }

  async addSubscriberToFormById(formId: number, subscriberId: number): Promise<void> {
    await this.http.post(`/forms/${formId}/subscribers/${subscriberId}`, {});
  }

  async addSubscriberToFormByEmail(formId: number, emailAddress: string): Promise<void> {
    await this.http.post(`/forms/${formId}/subscribers`, { email_address: emailAddress });
  }

  async listSubscribersForForm(
    formId: number,
    params?: {
      status?: string;
      perPage?: number;
      after?: string;
    }
  ): Promise<{ subscribers: Subscriber[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get(`/forms/${formId}/subscribers`, { params: query });
    return response.data as { subscribers: Subscriber[]; pagination: PaginationInfo };
  }

  // ── Sequences ──

  async listSequences(params?: {
    perPage?: number;
    after?: string;
  }): Promise<{ sequences: Sequence[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/sequences', { params: query });
    return response.data as { sequences: Sequence[]; pagination: PaginationInfo };
  }

  async addSubscriberToSequenceById(sequenceId: number, subscriberId: number): Promise<void> {
    await this.http.post(`/sequences/${sequenceId}/subscribers/${subscriberId}`, {});
  }

  async addSubscriberToSequenceByEmail(
    sequenceId: number,
    emailAddress: string
  ): Promise<void> {
    await this.http.post(`/sequences/${sequenceId}/subscribers`, {
      email_address: emailAddress
    });
  }

  async listSubscribersForSequence(
    sequenceId: number,
    params?: {
      status?: string;
      perPage?: number;
      after?: string;
    }
  ): Promise<{ subscribers: Subscriber[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get(`/sequences/${sequenceId}/subscribers`, {
      params: query
    });
    return response.data as { subscribers: Subscriber[]; pagination: PaginationInfo };
  }

  // ── Broadcasts ──

  async listBroadcasts(params?: {
    perPage?: number;
    after?: string;
  }): Promise<{ broadcasts: Broadcast[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/broadcasts', { params: query });
    return response.data as { broadcasts: Broadcast[]; pagination: PaginationInfo };
  }

  async getBroadcast(broadcastId: number): Promise<Broadcast> {
    let response = await this.http.get(`/broadcasts/${broadcastId}`);
    let data = response.data as { broadcast: Broadcast };
    return data.broadcast;
  }

  async createBroadcast(params: {
    subject?: string;
    content?: string;
    previewText?: string;
    description?: string;
    isPublic?: boolean;
    publishedAt?: string;
    sendAt?: string;
    emailTemplateId?: number;
    emailAddress?: string;
    thumbnailUrl?: string;
    thumbnailAlt?: string;
    subscriberFilter?: any[];
  }): Promise<Broadcast> {
    let body: Record<string, any> = {};
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.content !== undefined) body.content = params.content;
    if (params.previewText !== undefined) body.preview_text = params.previewText;
    if (params.description !== undefined) body.description = params.description;
    if (params.isPublic !== undefined) body.public = params.isPublic;
    if (params.publishedAt !== undefined) body.published_at = params.publishedAt;
    if (params.sendAt !== undefined) body.send_at = params.sendAt;
    if (params.emailTemplateId !== undefined) body.email_template_id = params.emailTemplateId;
    if (params.emailAddress !== undefined) body.email_address = params.emailAddress;
    if (params.thumbnailUrl !== undefined) body.thumbnail_url = params.thumbnailUrl;
    if (params.thumbnailAlt !== undefined) body.thumbnail_alt = params.thumbnailAlt;
    if (params.subscriberFilter !== undefined)
      body.subscriber_filter = params.subscriberFilter;

    let response = await this.http.post('/broadcasts', body);
    let data = response.data as { broadcast: Broadcast };
    return data.broadcast;
  }

  async updateBroadcast(
    broadcastId: number,
    params: {
      subject?: string;
      content?: string;
      previewText?: string;
      description?: string;
      isPublic?: boolean;
      publishedAt?: string;
      sendAt?: string;
      emailTemplateId?: number;
      emailAddress?: string;
      thumbnailUrl?: string;
      thumbnailAlt?: string;
      subscriberFilter?: any[];
    }
  ): Promise<Broadcast> {
    let body: Record<string, any> = {};
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.content !== undefined) body.content = params.content;
    if (params.previewText !== undefined) body.preview_text = params.previewText;
    if (params.description !== undefined) body.description = params.description;
    if (params.isPublic !== undefined) body.public = params.isPublic;
    if (params.publishedAt !== undefined) body.published_at = params.publishedAt;
    if (params.sendAt !== undefined) body.send_at = params.sendAt;
    if (params.emailTemplateId !== undefined) body.email_template_id = params.emailTemplateId;
    if (params.emailAddress !== undefined) body.email_address = params.emailAddress;
    if (params.thumbnailUrl !== undefined) body.thumbnail_url = params.thumbnailUrl;
    if (params.thumbnailAlt !== undefined) body.thumbnail_alt = params.thumbnailAlt;
    if (params.subscriberFilter !== undefined)
      body.subscriber_filter = params.subscriberFilter;

    let response = await this.http.put(`/broadcasts/${broadcastId}`, body);
    let data = response.data as { broadcast: Broadcast };
    return data.broadcast;
  }

  async deleteBroadcast(broadcastId: number): Promise<void> {
    await this.http.delete(`/broadcasts/${broadcastId}`);
  }

  // ── Custom Fields ──

  async listCustomFields(params?: {
    perPage?: number;
    after?: string;
  }): Promise<{ customFields: CustomField[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/custom_fields', { params: query });
    let data = response.data as { custom_fields: CustomField[]; pagination: PaginationInfo };
    return { customFields: data.custom_fields, pagination: data.pagination };
  }

  async createCustomField(label: string): Promise<CustomField> {
    let response = await this.http.post('/custom_fields', { label });
    let data = response.data as { custom_field: CustomField };
    return data.custom_field;
  }

  async updateCustomField(fieldId: number, label: string): Promise<CustomField> {
    let response = await this.http.put(`/custom_fields/${fieldId}`, { label });
    let data = response.data as { custom_field: CustomField };
    return data.custom_field;
  }

  async deleteCustomField(fieldId: number): Promise<void> {
    await this.http.delete(`/custom_fields/${fieldId}`);
  }

  // ── Purchases ──

  async listPurchases(params?: {
    perPage?: number;
    after?: string;
  }): Promise<{ purchases: Purchase[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/purchases', { params: query });
    return response.data as { purchases: Purchase[]; pagination: PaginationInfo };
  }

  async getPurchase(purchaseId: number): Promise<Purchase> {
    let response = await this.http.get(`/purchases/${purchaseId}`);
    let data = response.data as { purchase: Purchase };
    return data.purchase;
  }

  async createPurchase(params: {
    emailAddress: string;
    transactionId: string;
    status?: string;
    subtotal?: number;
    tax?: number;
    shipping?: number;
    discount?: number;
    total?: number;
    currency?: string;
    transactionTime?: string;
    products: {
      name: string;
      pid?: string;
      lid?: string;
      quantity: number;
      unitPrice: number;
      sku?: string;
    }[];
  }): Promise<Purchase> {
    let body = {
      purchase: {
        email_address: params.emailAddress,
        transaction_id: params.transactionId,
        status: params.status || 'paid',
        subtotal: params.subtotal,
        tax: params.tax,
        shipping: params.shipping,
        discount: params.discount,
        total: params.total,
        currency: params.currency || 'USD',
        transaction_time: params.transactionTime || new Date().toISOString(),
        products: params.products.map(p => ({
          name: p.name,
          pid: p.pid,
          lid: p.lid,
          quantity: p.quantity,
          unit_price: p.unitPrice,
          sku: p.sku
        }))
      }
    };

    let response = await this.http.post('/purchases', body);
    let data = response.data as { purchase: Purchase };
    return data.purchase;
  }

  // ── Segments ──

  async listSegments(params?: {
    perPage?: number;
    after?: string;
  }): Promise<{ segments: Segment[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/segments', { params: query });
    return response.data as { segments: Segment[]; pagination: PaginationInfo };
  }

  // ── Email Templates ──

  async listEmailTemplates(params?: {
    perPage?: number;
    after?: string;
  }): Promise<{ emailTemplates: EmailTemplate[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/email_templates', { params: query });
    let data = response.data as {
      email_templates: EmailTemplate[];
      pagination: PaginationInfo;
    };
    return { emailTemplates: data.email_templates, pagination: data.pagination };
  }

  // ── Webhooks ──

  async listWebhooks(): Promise<{ webhooks: Webhook[]; pagination: PaginationInfo }> {
    let response = await this.http.get('/webhooks');
    return response.data as { webhooks: Webhook[]; pagination: PaginationInfo };
  }

  async createWebhook(
    targetUrl: string,
    event: {
      name: string;
      tagId?: number;
      formId?: number;
      sequenceId?: number;
      productId?: number;
      initiatorValue?: string;
    }
  ): Promise<Webhook> {
    let eventBody: Record<string, any> = { name: event.name };
    if (event.tagId !== undefined) eventBody.tag_id = event.tagId;
    if (event.formId !== undefined) eventBody.form_id = event.formId;
    if (event.sequenceId !== undefined) eventBody.sequence_id = event.sequenceId;
    if (event.productId !== undefined) eventBody.product_id = event.productId;
    if (event.initiatorValue !== undefined) eventBody.initiator_value = event.initiatorValue;

    let response = await this.http.post('/webhooks', {
      target_url: targetUrl,
      event: eventBody
    });
    let data = response.data as { webhook: Webhook };
    return data.webhook;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }
}
