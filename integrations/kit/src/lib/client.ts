import { createAxios, pickDefined } from 'slates';
import { kitApiError, kitServiceError } from './errors';
import type {
  KitAccount,
  KitAccountEmailStats,
  KitAccountGrowthStats,
  KitBroadcast,
  KitBroadcastClick,
  KitBroadcastStatsSummary,
  KitCustomField,
  KitEmailTemplate,
  KitForm,
  KitPaginatedResponse,
  KitPagination,
  KitPost,
  KitPurchase,
  KitSegment,
  KitSequence,
  KitSequenceEmail,
  KitSnippet,
  KitSubscriber,
  KitSubscriberStats,
  KitTag,
  KitWebhook
} from './types';

type PaginationParams = {
  after?: string;
  before?: string;
  perPage?: number;
  includeTotalCount?: boolean;
};

let defaultPagination: KitPagination = {
  has_previous_page: false,
  has_next_page: false,
  start_cursor: null,
  end_cursor: null,
  per_page: 0
};

let paginated = <T>(body: Record<string, any>, key: string): KitPaginatedResponse<T> => ({
  data: Array.isArray(body[key]) ? body[key] : Array.isArray(body.data) ? body.data : [],
  pagination: body.pagination ?? defaultPagination
});

let applyPagination = (query: Record<string, any>, params?: PaginationParams) => {
  if (params?.after) query.after = params.after;
  if (params?.before) query.before = params.before;
  if (params?.perPage) query.per_page = params.perPage;
  if (params?.includeTotalCount !== undefined) {
    query.include_total_count = params.includeTotalCount;
  }
};

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(private config: { token: string }) {
    if (!config.token) {
      throw kitServiceError('Kit authentication token is required.');
    }

    this.http = createAxios({
      baseURL: 'https://api.kit.com/v4',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.http.interceptors.request.use(reqConfig => {
      let headers = (reqConfig.headers ?? {}) as Record<string, string>;
      headers.Authorization = `Bearer ${this.config.token}`;
      headers['X-Kit-Api-Key'] = this.config.token;
      reqConfig.headers = headers as any;
      return reqConfig;
    });

    this.http.interceptors.response.use(
      response => response,
      error => {
        throw kitApiError(error);
      }
    );
  }

  async getAccount(): Promise<KitAccount> {
    let response = await this.http.get('/account');
    return response.data;
  }

  async getEmailStats(): Promise<{ stats: KitAccountEmailStats }> {
    let response = await this.http.get('/account/email_stats');
    return response.data;
  }

  async getGrowthStats(params?: {
    starting?: string;
    ending?: string;
  }): Promise<{ stats: KitAccountGrowthStats }> {
    let response = await this.http.get('/account/growth_stats', {
      params: pickDefined({
        starting: params?.starting,
        ending: params?.ending
      })
    });
    return response.data;
  }

  async listSubscribers(
    params?: PaginationParams & {
      status?: string;
      sortField?: string;
      sortOrder?: string;
      createdAfter?: string;
      createdBefore?: string;
      updatedAfter?: string;
      updatedBefore?: string;
      emailAddress?: string;
      include?: string[];
      slim?: boolean;
    }
  ): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.status) query.status = params.status;
    if (params?.sortField) query.sort_field = params.sortField;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.createdAfter) query.created_after = params.createdAfter;
    if (params?.createdBefore) query.created_before = params.createdBefore;
    if (params?.updatedAfter) query.updated_after = params.updatedAfter;
    if (params?.updatedBefore) query.updated_before = params.updatedBefore;
    if (params?.emailAddress) query.email_address = params.emailAddress;
    if (params?.include?.length) query.include = params.include.join(',');
    if (params?.slim !== undefined) query.slim = params.slim;

    let response = await this.http.get('/subscribers', { params: query });
    return paginated<KitSubscriber>(response.data, 'subscribers');
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
    let response = await this.http.post(
      '/subscribers',
      pickDefined({
        email_address: data.emailAddress,
        first_name: data.firstName,
        state: data.state,
        fields: data.fields
      })
    );
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
    let response = await this.http.put(
      `/subscribers/${subscriberId}`,
      pickDefined({
        email_address: data.emailAddress,
        first_name: data.firstName,
        fields: data.fields
      })
    );
    return response.data;
  }

  async unsubscribeSubscriber(subscriberId: number): Promise<{ subscriber: KitSubscriber }> {
    let response = await this.http.post(`/subscribers/${subscriberId}/unsubscribe`);
    return response.data;
  }

  async getSubscriberStats(
    subscriberId: number,
    params?: {
      emailSentAfter?: string;
      emailSentBefore?: string;
    }
  ): Promise<{ subscriber: { id: number; stats: KitSubscriberStats } }> {
    let response = await this.http.get(`/subscribers/${subscriberId}/stats`, {
      params: pickDefined({
        email_sent_after: params?.emailSentAfter,
        email_sent_before: params?.emailSentBefore
      })
    });
    return response.data;
  }

  async listTagsForSubscriber(
    subscriberId: number,
    params?: PaginationParams
  ): Promise<KitPaginatedResponse<KitTag>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get(`/subscribers/${subscriberId}/tags`, {
      params: query
    });
    return paginated<KitTag>(response.data, 'tags');
  }

  async listTags(params?: PaginationParams): Promise<KitPaginatedResponse<KitTag>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get('/tags', { params: query });
    return paginated<KitTag>(response.data, 'tags');
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
    await this.http.delete(`/tags/${tagId}/subscribers`, {
      data: { email_address: emailAddress }
    });
  }

  async listSubscribersForTag(
    tagId: number,
    params?: PaginationParams & {
      status?: string;
    }
  ): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.status) query.status = params.status;

    let response = await this.http.get(`/tags/${tagId}/subscribers`, { params: query });
    return paginated<KitSubscriber>(response.data, 'subscribers');
  }

  async listCustomFields(): Promise<KitPaginatedResponse<KitCustomField>> {
    let response = await this.http.get('/custom_fields');
    return paginated<KitCustomField>(response.data, 'custom_fields');
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

  async listForms(
    params?: PaginationParams & {
      type?: string;
      status?: string;
    }
  ): Promise<KitPaginatedResponse<KitForm>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.type) query.type = params.type;
    if (params?.status) query.status = params.status;

    let response = await this.http.get('/forms', { params: query });
    return paginated<KitForm>(response.data, 'forms');
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
    params?: PaginationParams & {
      status?: string;
    }
  ): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.status) query.status = params.status;

    let response = await this.http.get(`/forms/${formId}/subscribers`, { params: query });
    return paginated<KitSubscriber>(response.data, 'subscribers');
  }

  async listBroadcasts(
    params?: PaginationParams
  ): Promise<KitPaginatedResponse<KitBroadcast>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get('/broadcasts', { params: query });
    return paginated<KitBroadcast>(response.data, 'broadcasts');
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
    sendAt?: string | null;
    thumbnailAlt?: string;
    thumbnailUrl?: string;
    previewText?: string;
    subscriberFilter?: Record<string, unknown>[];
  }): Promise<{ broadcast: KitBroadcast }> {
    let response = await this.http.post(
      '/broadcasts',
      pickDefined({
        subject: data.subject,
        content: data.content,
        description: data.description,
        email_address: data.emailAddress,
        email_template_id: data.emailTemplateId,
        email_layout_template: data.emailLayoutTemplate,
        public: data.public,
        published_at: data.publishedAt,
        send_at: data.sendAt,
        thumbnail_alt: data.thumbnailAlt,
        thumbnail_url: data.thumbnailUrl,
        preview_text: data.previewText,
        subscriber_filter: data.subscriberFilter
      })
    );
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
      sendAt?: string | null;
      thumbnailAlt?: string;
      thumbnailUrl?: string;
      previewText?: string;
      subscriberFilter?: Record<string, unknown>[];
    }
  ): Promise<{ broadcast: KitBroadcast }> {
    let response = await this.http.put(
      `/broadcasts/${broadcastId}`,
      pickDefined({
        subject: data.subject,
        content: data.content,
        description: data.description,
        email_address: data.emailAddress,
        email_template_id: data.emailTemplateId,
        email_layout_template: data.emailLayoutTemplate,
        public: data.public,
        published_at: data.publishedAt,
        send_at: data.sendAt,
        thumbnail_alt: data.thumbnailAlt,
        thumbnail_url: data.thumbnailUrl,
        preview_text: data.previewText,
        subscriber_filter: data.subscriberFilter
      })
    );
    return response.data;
  }

  async deleteBroadcast(broadcastId: number): Promise<void> {
    await this.http.delete(`/broadcasts/${broadcastId}`);
  }

  async getBroadcastStats(
    broadcastId: number
  ): Promise<{ broadcast: { id: number; stats: KitBroadcastStatsSummary['stats'] } }> {
    let response = await this.http.get(`/broadcasts/${broadcastId}/stats`);
    return response.data;
  }

  async listBroadcastStats(
    params?: PaginationParams & {
      sentAfter?: string;
      sentBefore?: string;
    }
  ): Promise<KitPaginatedResponse<KitBroadcastStatsSummary>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.sentAfter) query.sent_after = params.sentAfter;
    if (params?.sentBefore) query.sent_before = params.sentBefore;

    let response = await this.http.get('/broadcasts/stats', { params: query });
    return paginated<KitBroadcastStatsSummary>(response.data, 'broadcasts');
  }

  async getBroadcastLinkClicks(
    broadcastId: number,
    params?: PaginationParams
  ): Promise<{ broadcastId: number; clicks: KitBroadcastClick[]; pagination: KitPagination }> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get(`/broadcasts/${broadcastId}/clicks`, {
      params: query
    });
    return {
      broadcastId: response.data.broadcast?.id ?? broadcastId,
      clicks: response.data.broadcast?.clicks ?? [],
      pagination: response.data.pagination ?? defaultPagination
    };
  }

  async listSequences(params?: PaginationParams): Promise<KitPaginatedResponse<KitSequence>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get('/sequences', { params: query });
    return paginated<KitSequence>(response.data, 'sequences');
  }

  async getSequence(sequenceId: number): Promise<{ sequence: KitSequence }> {
    let response = await this.http.get(`/sequences/${sequenceId}`);
    return response.data;
  }

  async createSequence(data: {
    name: string;
    emailAddress?: string;
    emailTemplateId?: number;
    sendDays?: string[];
    sendHour?: number;
    timeZone?: string;
    active?: boolean;
    repeat?: boolean;
    hold?: boolean;
    excludeSubscriberSources?: Record<string, unknown>[];
  }): Promise<{ sequence: KitSequence }> {
    let response = await this.http.post(
      '/sequences',
      pickDefined({
        name: data.name,
        email_address: data.emailAddress,
        email_template_id: data.emailTemplateId,
        send_days: data.sendDays,
        send_hour: data.sendHour,
        time_zone: data.timeZone,
        active: data.active,
        repeat: data.repeat,
        hold: data.hold,
        exclude_subscriber_sources: data.excludeSubscriberSources
      })
    );
    return response.data;
  }

  async updateSequence(
    sequenceId: number,
    data: {
      name?: string;
      emailAddress?: string;
      emailTemplateId?: number | null;
      sendDays?: string[];
      sendHour?: number;
      timeZone?: string;
      active?: boolean;
      repeat?: boolean;
      hold?: boolean;
      excludeSubscriberSources?: Record<string, unknown>[];
    }
  ): Promise<{ sequence: KitSequence }> {
    let response = await this.http.put(
      `/sequences/${sequenceId}`,
      pickDefined({
        name: data.name,
        email_address: data.emailAddress,
        email_template_id: data.emailTemplateId,
        send_days: data.sendDays,
        send_hour: data.sendHour,
        time_zone: data.timeZone,
        active: data.active,
        repeat: data.repeat,
        hold: data.hold,
        exclude_subscriber_sources: data.excludeSubscriberSources
      })
    );
    return response.data;
  }

  async deleteSequence(sequenceId: number): Promise<void> {
    await this.http.delete(`/sequences/${sequenceId}`);
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
    params?: PaginationParams & {
      status?: string;
    }
  ): Promise<KitPaginatedResponse<KitSubscriber>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.status) query.status = params.status;

    let response = await this.http.get(`/sequences/${sequenceId}/subscribers`, {
      params: query
    });
    return paginated<KitSubscriber>(response.data, 'subscribers');
  }

  async listSequenceEmails(
    sequenceId: number,
    params?: PaginationParams & {
      includeContent?: boolean;
    }
  ): Promise<KitPaginatedResponse<KitSequenceEmail>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.includeContent !== undefined) query.include_content = params.includeContent;

    let response = await this.http.get(`/sequences/${sequenceId}/emails`, {
      params: query
    });
    return paginated<KitSequenceEmail>(response.data, 'emails');
  }

  async getSequenceEmail(
    sequenceId: number,
    emailId: number
  ): Promise<{ email: KitSequenceEmail }> {
    let response = await this.http.get(`/sequences/${sequenceId}/emails/${emailId}`);
    return response.data;
  }

  async createSequenceEmail(
    sequenceId: number,
    data: {
      subject: string;
      delayValue: number;
      delayUnit: string;
      previewText?: string | null;
      content?: string | null;
      emailTemplateId?: number | null;
      published?: boolean;
      sendDays?: string[] | null;
      position?: number | null;
    }
  ): Promise<{ email: KitSequenceEmail }> {
    let response = await this.http.post(
      `/sequences/${sequenceId}/emails`,
      pickDefined({
        subject: data.subject,
        delay_value: data.delayValue,
        delay_unit: data.delayUnit,
        preview_text: data.previewText,
        content: data.content,
        email_template_id: data.emailTemplateId,
        published: data.published,
        send_days: data.sendDays,
        position: data.position
      })
    );
    return response.data;
  }

  async updateSequenceEmail(
    sequenceId: number,
    emailId: number,
    data: {
      subject?: string;
      delayValue?: number;
      delayUnit?: string;
      previewText?: string | null;
      content?: string | null;
      emailTemplateId?: number | null;
      published?: boolean;
      sendDays?: string[] | null;
      position?: number | null;
    }
  ): Promise<{ email: KitSequenceEmail }> {
    let response = await this.http.put(
      `/sequences/${sequenceId}/emails/${emailId}`,
      pickDefined({
        subject: data.subject,
        delay_value: data.delayValue,
        delay_unit: data.delayUnit,
        preview_text: data.previewText,
        content: data.content,
        email_template_id: data.emailTemplateId,
        published: data.published,
        send_days: data.sendDays,
        position: data.position
      })
    );
    return response.data;
  }

  async deleteSequenceEmail(sequenceId: number, emailId: number): Promise<void> {
    await this.http.delete(`/sequences/${sequenceId}/emails/${emailId}`);
  }

  async listSegments(params?: PaginationParams): Promise<KitPaginatedResponse<KitSegment>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get('/segments', { params: query });
    return paginated<KitSegment>(response.data, 'segments');
  }

  async listPurchases(params?: PaginationParams): Promise<KitPaginatedResponse<KitPurchase>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get('/purchases', { params: query });
    return paginated<KitPurchase>(response.data, 'purchases');
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
    let response = await this.http.post(
      '/purchases',
      pickDefined({
        email_address: data.emailAddress,
        transaction_id: data.transactionId,
        currency: data.currency,
        transaction_time: data.transactionTime,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        status: data.status,
        products: data.products.map(p =>
          pickDefined({
            name: p.name,
            sku: p.sku,
            pid: p.pid,
            lid: p.lid,
            unit_price: p.unitPrice,
            quantity: p.quantity
          })
        )
      })
    );
    return response.data;
  }

  async listEmailTemplates(
    params?: PaginationParams
  ): Promise<KitPaginatedResponse<KitEmailTemplate>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);

    let response = await this.http.get('/email_templates', { params: query });
    return paginated<KitEmailTemplate>(response.data, 'email_templates');
  }

  async listPosts(
    params?: PaginationParams & {
      includeContent?: boolean;
    }
  ): Promise<KitPaginatedResponse<KitPost>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.includeContent !== undefined) query.include_content = params.includeContent;

    let response = await this.http.get('/posts', { params: query });
    return paginated<KitPost>(response.data, 'posts');
  }

  async getPost(postId: number): Promise<{ post: KitPost }> {
    let response = await this.http.get(`/posts/${postId}`);
    return response.data;
  }

  async listSnippets(
    params?: PaginationParams & {
      snippetType?: string;
      archived?: boolean;
      includeContent?: boolean;
    }
  ): Promise<KitPaginatedResponse<KitSnippet>> {
    let query: Record<string, any> = {};
    applyPagination(query, params);
    if (params?.snippetType) query.snippet_type = params.snippetType;
    if (params?.archived !== undefined) query.archived = params.archived;
    if (params?.includeContent !== undefined) query.include_content = params.includeContent;

    let response = await this.http.get('/snippets', { params: query });
    return paginated<KitSnippet>(response.data, 'snippets');
  }

  async getSnippet(snippetId: number): Promise<{ snippet: KitSnippet }> {
    let response = await this.http.get(`/snippets/${snippetId}`);
    return response.data;
  }

  async createSnippet(data: {
    name: string;
    snippetType: 'inline' | 'block';
    content?: string;
    documentHtml?: string;
  }): Promise<{ snippet: KitSnippet }> {
    let response = await this.http.post(
      '/snippets',
      pickDefined({
        name: data.name,
        snippet_type: data.snippetType,
        content: data.content,
        document_attributes:
          data.documentHtml !== undefined ? { value_html: data.documentHtml } : undefined
      })
    );
    return response.data;
  }

  async updateSnippet(
    snippetId: number,
    data: {
      name?: string;
      snippetType?: 'inline' | 'block';
      archived?: boolean;
      content?: string;
      documentHtml?: string;
    }
  ): Promise<{ snippet: KitSnippet }> {
    let response = await this.http.put(
      `/snippets/${snippetId}`,
      pickDefined({
        name: data.name,
        snippet_type: data.snippetType,
        archived: data.archived,
        content: data.content,
        document_attributes:
          data.documentHtml !== undefined ? { value_html: data.documentHtml } : undefined
      })
    );
    return response.data;
  }

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
    let response = await this.http.post('/webhooks', {
      target_url: targetUrl,
      event: pickDefined({
        name: event.name,
        form_id: event.formId,
        sequence_id: event.sequenceId,
        tag_id: event.tagId,
        product_id: event.productId,
        initiator_value: event.initiatorValue
      })
    });
    return response.data;
  }

  async listWebhooks(): Promise<KitPaginatedResponse<KitWebhook>> {
    let response = await this.http.get('/webhooks');
    return paginated<KitWebhook>(response.data, 'webhooks');
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }
}
