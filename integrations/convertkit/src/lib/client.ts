import { createAxios } from 'slates';
import { kitApiError, kitServiceError } from './errors';
import type {
  Account,
  Broadcast,
  BroadcastClick,
  BroadcastStats,
  CreatorProfile,
  CustomField,
  EmailStats,
  EmailTemplate,
  Form,
  GrowthStats,
  PaginationInfo,
  Post,
  Purchase,
  Segment,
  Sequence,
  SequenceEmail,
  Snippet,
  Subscriber,
  SubscriberStats,
  Tag,
  Webhook
} from './types';

interface ClientConfig {
  token: string;
  authMethod?: 'oauth' | 'api_key';
}

export type ClientAuth = {
  token: string;
  refreshToken?: string;
  authMethod?: 'oauth' | 'api_key';
};

export let createClient = (auth: ClientAuth) =>
  new Client({
    token: auth.token,
    authMethod: auth.authMethod ?? (auth.refreshToken ? 'oauth' : 'api_key')
  });

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    if (!config.token?.trim()) {
      throw kitServiceError('Kit access token or API key is required.');
    }

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
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

    this.http.interceptors.response.use(
      response => response,
      error => {
        throw kitApiError(error);
      }
    );
  }

  // ── Account ──

  async getAccount(): Promise<Account> {
    let response = await this.http.get('/account');
    return response.data as Account;
  }

  async getCreatorProfile(): Promise<CreatorProfile> {
    let response = await this.http.get('/account/creator_profile');
    let data = response.data as { profile: CreatorProfile };
    return data.profile;
  }

  async getEmailStats(): Promise<EmailStats> {
    let response = await this.http.get('/account/email_stats');
    let data = response.data as { stats: EmailStats };
    return data.stats;
  }

  async getGrowthStats(params?: { starting?: string; ending?: string }): Promise<GrowthStats> {
    let response = await this.http.get('/account/growth_stats', {
      params: {
        ...(params?.starting ? { starting: params.starting } : {}),
        ...(params?.ending ? { ending: params.ending } : {})
      }
    });
    let data = response.data as { stats: GrowthStats };
    return data.stats;
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

  async getSubscriberStats(
    subscriberId: number,
    params?: {
      emailSentAfter?: string;
      emailSentBefore?: string;
    }
  ): Promise<SubscriberStats> {
    let response = await this.http.get(`/subscribers/${subscriberId}/stats`, {
      params: {
        ...(params?.emailSentAfter ? { email_sent_after: params.emailSentAfter } : {}),
        ...(params?.emailSentBefore ? { email_sent_before: params.emailSentBefore } : {})
      }
    });
    let data = response.data as { subscriber: { id: number; stats: SubscriberStats } };
    return data.subscriber.stats;
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

  async createSequence(params: {
    name: string;
    emailAddress?: string;
    emailTemplateId?: number;
    sendDays?: string[];
    sendHour?: number;
    timeZone?: string;
    active?: boolean;
    repeat?: boolean;
    hold?: boolean;
    excludeSubscriberSources?: { type: string; ids: number[] }[];
  }): Promise<Sequence> {
    let body: Record<string, any> = { name: params.name };
    if (params.emailAddress !== undefined) body.email_address = params.emailAddress;
    if (params.emailTemplateId !== undefined) body.email_template_id = params.emailTemplateId;
    if (params.sendDays !== undefined) body.send_days = params.sendDays;
    if (params.sendHour !== undefined) body.send_hour = params.sendHour;
    if (params.timeZone !== undefined) body.time_zone = params.timeZone;
    if (params.active !== undefined) body.active = params.active;
    if (params.repeat !== undefined) body.repeat = params.repeat;
    if (params.hold !== undefined) body.hold = params.hold;
    if (params.excludeSubscriberSources !== undefined) {
      body.exclude_subscriber_sources = params.excludeSubscriberSources;
    }

    let response = await this.http.post('/sequences', body);
    let data = response.data as { sequence: Sequence };
    return data.sequence;
  }

  async getSequence(sequenceId: number): Promise<Sequence> {
    let response = await this.http.get(`/sequences/${sequenceId}`);
    let data = response.data as { sequence: Sequence };
    return data.sequence;
  }

  async updateSequence(
    sequenceId: number,
    params: {
      name?: string;
      emailAddress?: string;
      emailTemplateId?: number;
      sendDays?: string[];
      sendHour?: number;
      timeZone?: string;
      active?: boolean;
      repeat?: boolean;
      hold?: boolean;
      excludeSubscriberSources?: { type: string; ids: number[] }[];
    }
  ): Promise<Sequence> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.emailAddress !== undefined) body.email_address = params.emailAddress;
    if (params.emailTemplateId !== undefined) body.email_template_id = params.emailTemplateId;
    if (params.sendDays !== undefined) body.send_days = params.sendDays;
    if (params.sendHour !== undefined) body.send_hour = params.sendHour;
    if (params.timeZone !== undefined) body.time_zone = params.timeZone;
    if (params.active !== undefined) body.active = params.active;
    if (params.repeat !== undefined) body.repeat = params.repeat;
    if (params.hold !== undefined) body.hold = params.hold;
    if (params.excludeSubscriberSources !== undefined) {
      body.exclude_subscriber_sources = params.excludeSubscriberSources;
    }

    let response = await this.http.put(`/sequences/${sequenceId}`, body);
    let data = response.data as { sequence: Sequence };
    return data.sequence;
  }

  async deleteSequence(sequenceId: number): Promise<void> {
    await this.http.delete(`/sequences/${sequenceId}`);
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

  async listSequenceEmails(
    sequenceId: number,
    params?: {
      includeContent?: boolean;
      perPage?: number;
      after?: string;
    }
  ): Promise<{ emails: SequenceEmail[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.includeContent !== undefined)
      query.include_content = String(params.includeContent);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get(`/sequences/${sequenceId}/emails`, {
      params: query
    });
    return response.data as { emails: SequenceEmail[]; pagination: PaginationInfo };
  }

  async createSequenceEmail(
    sequenceId: number,
    params: {
      subject: string;
      previewText?: string | null;
      content?: string | null;
      delayValue: number;
      delayUnit: string;
      emailTemplateId?: number | null;
      published?: boolean;
      sendDays?: string[] | null;
      position?: number | null;
    }
  ): Promise<SequenceEmail> {
    let body: Record<string, any> = {
      subject: params.subject,
      delay_value: params.delayValue,
      delay_unit: params.delayUnit
    };
    if (params.previewText !== undefined) body.preview_text = params.previewText;
    if (params.content !== undefined) body.content = params.content;
    if (params.emailTemplateId !== undefined) body.email_template_id = params.emailTemplateId;
    if (params.published !== undefined) body.published = params.published;
    if (params.sendDays !== undefined) body.send_days = params.sendDays;
    if (params.position !== undefined) body.position = params.position;

    let response = await this.http.post(`/sequences/${sequenceId}/emails`, body);
    let data = response.data as { email: SequenceEmail };
    return data.email;
  }

  async getSequenceEmail(sequenceId: number, emailId: number): Promise<SequenceEmail> {
    let response = await this.http.get(`/sequences/${sequenceId}/emails/${emailId}`);
    let data = response.data as { email: SequenceEmail };
    return data.email;
  }

  async updateSequenceEmail(
    sequenceId: number,
    emailId: number,
    params: {
      subject?: string;
      previewText?: string | null;
      content?: string | null;
      delayValue?: number;
      delayUnit?: string;
      emailTemplateId?: number | null;
      published?: boolean;
      sendDays?: string[] | null;
      position?: number | null;
    }
  ): Promise<SequenceEmail> {
    let body: Record<string, any> = {};
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.previewText !== undefined) body.preview_text = params.previewText;
    if (params.content !== undefined) body.content = params.content;
    if (params.delayValue !== undefined) body.delay_value = params.delayValue;
    if (params.delayUnit !== undefined) body.delay_unit = params.delayUnit;
    if (params.emailTemplateId !== undefined) body.email_template_id = params.emailTemplateId;
    if (params.published !== undefined) body.published = params.published;
    if (params.sendDays !== undefined) body.send_days = params.sendDays;
    if (params.position !== undefined) body.position = params.position;

    let response = await this.http.put(`/sequences/${sequenceId}/emails/${emailId}`, body);
    let data = response.data as { email: SequenceEmail };
    return data.email;
  }

  async deleteSequenceEmail(sequenceId: number, emailId: number): Promise<void> {
    await this.http.delete(`/sequences/${sequenceId}/emails/${emailId}`);
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

  async getBroadcastStats(broadcastId: number): Promise<BroadcastStats> {
    let response = await this.http.get(`/broadcasts/${broadcastId}/stats`);
    let data = response.data as { broadcast: { id: number; stats: BroadcastStats } };
    return data.broadcast.stats;
  }

  async getBroadcastClicks(
    broadcastId: number,
    params?: {
      perPage?: number;
      after?: string;
    }
  ): Promise<{ clicks: BroadcastClick[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get(`/broadcasts/${broadcastId}/clicks`, {
      params: query
    });
    let data = response.data as {
      broadcast: { id: number; clicks: BroadcastClick[] };
      pagination: PaginationInfo;
    };
    return { clicks: data.broadcast.clicks, pagination: data.pagination };
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

  // ── Posts ──

  async listPosts(params?: {
    includeContent?: boolean;
    perPage?: number;
    after?: string;
  }): Promise<{ posts: Post[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.includeContent !== undefined)
      query.include_content = String(params.includeContent);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/posts', { params: query });
    return response.data as { posts: Post[]; pagination: PaginationInfo };
  }

  async getPost(postId: number): Promise<Post> {
    let response = await this.http.get(`/posts/${postId}`);
    let data = response.data as { post: Post };
    return data.post;
  }

  // ── Snippets ──

  async listSnippets(params?: {
    snippetType?: string;
    archived?: boolean;
    includeContent?: boolean;
    perPage?: number;
    after?: string;
  }): Promise<{ snippets: Snippet[]; pagination: PaginationInfo }> {
    let query: Record<string, string> = {};
    if (params?.snippetType) query.snippet_type = params.snippetType;
    if (params?.archived !== undefined) query.archived = String(params.archived);
    if (params?.includeContent !== undefined)
      query.include_content = String(params.includeContent);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.after) query.after = params.after;

    let response = await this.http.get('/snippets', { params: query });
    return response.data as { snippets: Snippet[]; pagination: PaginationInfo };
  }

  async createSnippet(params: {
    name: string;
    snippetType: string;
    content?: string;
    blockHtml?: string;
  }): Promise<Snippet> {
    let body: Record<string, any> = {
      name: params.name,
      snippet_type: params.snippetType
    };
    if (params.content !== undefined) body.content = params.content;
    if (params.blockHtml !== undefined)
      body.document_attributes = { value_html: params.blockHtml };

    let response = await this.http.post('/snippets', body);
    let data = response.data as { snippet: Snippet };
    return data.snippet;
  }

  async getSnippet(snippetId: number): Promise<Snippet> {
    let response = await this.http.get(`/snippets/${snippetId}`);
    let data = response.data as { snippet: Snippet };
    return data.snippet;
  }

  async updateSnippet(
    snippetId: number,
    params: {
      name?: string;
      snippetType?: string;
      archived?: boolean;
      content?: string;
      blockHtml?: string;
    }
  ): Promise<Snippet> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.snippetType !== undefined) body.snippet_type = params.snippetType;
    if (params.archived !== undefined) body.archived = params.archived;
    if (params.content !== undefined) body.content = params.content;
    if (params.blockHtml !== undefined)
      body.document_attributes = { value_html: params.blockHtml };

    let response = await this.http.put(`/snippets/${snippetId}`, body);
    let data = response.data as { snippet: Snippet };
    return data.snippet;
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
