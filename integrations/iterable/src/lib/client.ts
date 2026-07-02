import { createAxios } from 'slates';

export class IterableClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; dataCenter: string }) {
    let baseURL =
      config.dataCenter === 'eu'
        ? 'https://api.eu.iterable.com/api'
        : 'https://api.iterable.com/api';

    this.axios = createAxios({
      baseURL,
      headers: {
        'Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Users ──────────────────────────────────────────────────────

  async updateUser(params: {
    email?: string;
    userId?: string;
    dataFields?: Record<string, any>;
    preferUserId?: boolean;
    mergeNestedObjects?: boolean;
    createNewFields?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/users/update', params);
    return response.data;
  }

  async bulkUpdateUsers(
    users: {
      email?: string;
      userId?: string;
      dataFields?: Record<string, any>;
      preferUserId?: boolean;
      mergeNestedObjects?: boolean;
    }[]
  ): Promise<any> {
    let response = await this.axios.post('/users/bulkUpdate', { users });
    return response.data;
  }

  async getUser(params: { email?: string; userId?: string }): Promise<any> {
    if (params.userId) {
      let response = await this.axios.get('/users/byUserId', {
        params: { userId: params.userId }
      });
      return response.data;
    }
    let response = await this.axios.get(`/users/${encodeURIComponent(params.email!)}`, {});
    return response.data;
  }

  async deleteUser(params: { email?: string; userId?: string }): Promise<any> {
    if (params.userId) {
      let response = await this.axios.delete('/users/byUserId', {
        params: { userId: params.userId }
      });
      return response.data;
    }
    let response = await this.axios.delete(`/users/${encodeURIComponent(params.email!)}`, {});
    return response.data;
  }

  async getUserFields(): Promise<any> {
    let response = await this.axios.get('/users/fields');
    return response.data;
  }

  async mergeUsers(params: {
    sourceEmail?: string;
    sourceUserId?: string;
    destinationEmail?: string;
    destinationUserId?: string;
  }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.sourceEmail) body.sourceEmail = params.sourceEmail;
    if (params.sourceUserId) body.sourceUserId = params.sourceUserId;
    if (params.destinationEmail) body.destinationEmail = params.destinationEmail;
    if (params.destinationUserId) body.destinationUserId = params.destinationUserId;
    let response = await this.axios.post('/users/merge', body);
    return response.data;
  }

  // ─── Events ─────────────────────────────────────────────────────

  async trackEvent(params: {
    email?: string;
    userId?: string;
    eventName: string;
    createdAt?: number;
    dataFields?: Record<string, any>;
    campaignId?: number;
    templateId?: number;
    createNewFields?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/events/track', params);
    return response.data;
  }

  async trackBulkEvents(
    events: {
      email?: string;
      userId?: string;
      eventName: string;
      createdAt?: number;
      dataFields?: Record<string, any>;
      campaignId?: number;
      templateId?: number;
    }[]
  ): Promise<any> {
    let response = await this.axios.post('/events/bulkTrack', { events });
    return response.data;
  }

  async getUserEvents(email: string, limit?: number): Promise<any> {
    let response = await this.axios.get('/events', {
      params: { email, limit: limit || 30 }
    });
    return response.data;
  }

  // ─── Commerce ───────────────────────────────────────────────────

  async trackPurchase(params: {
    email?: string;
    userId?: string;
    items: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      sku?: string;
      description?: string;
      categories?: string[];
      imageUrl?: string;
      url?: string;
      dataFields?: Record<string, any>;
    }[];
    total: number;
    campaignId?: number;
    templateId?: number;
    dataFields?: Record<string, any>;
    createdAt?: number;
    createNewFields?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/commerce/trackPurchase', params);
    return response.data;
  }

  async updateCart(params: {
    email?: string;
    userId?: string;
    items: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      sku?: string;
      description?: string;
      categories?: string[];
      imageUrl?: string;
      url?: string;
      dataFields?: Record<string, any>;
    }[];
    createNewFields?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/commerce/updateCart', params);
    return response.data;
  }

  // ─── Lists ──────────────────────────────────────────────────────

  async getLists(): Promise<any> {
    let response = await this.axios.get('/lists');
    return response.data;
  }

  async createList(name: string): Promise<any> {
    let response = await this.axios.post('/lists', { name });
    return response.data;
  }

  async deleteList(listId: number): Promise<any> {
    let response = await this.axios.delete(`/lists/${listId}`);
    return response.data;
  }

  async getListUsers(listId: number): Promise<any> {
    let response = await this.axios.get(`/lists/getUsers`, {
      params: { listId }
    });
    return response.data;
  }

  async subscribeToList(
    listId: number,
    subscribers: { email?: string; userId?: string; dataFields?: Record<string, any> }[]
  ): Promise<any> {
    let response = await this.axios.post('/lists/subscribe', {
      listId,
      subscribers
    });
    return response.data;
  }

  async unsubscribeFromList(
    listId: number,
    subscribers: { email?: string; userId?: string }[]
  ): Promise<any> {
    let response = await this.axios.post('/lists/unsubscribe', {
      listId,
      subscribers
    });
    return response.data;
  }

  // ─── Campaigns ──────────────────────────────────────────────────

  async getCampaigns(): Promise<any> {
    let response = await this.axios.get('/campaigns');
    return response.data;
  }

  async createCampaign(params: {
    name: string;
    listIds: number[];
    templateId: number;
    suppressionListIds?: number[];
    sendAt?: string;
    sendMode?: string;
    startTimeZone?: string;
    defaultTimeZone?: string;
    dataFields?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/campaigns/create', params);
    return response.data;
  }

  async getCampaignMetrics(
    campaignId: number,
    startDateTime?: string,
    endDateTime?: string
  ): Promise<any> {
    let params: Record<string, any> = { campaignId };
    if (startDateTime) params.startDateTime = startDateTime;
    if (endDateTime) params.endDateTime = endDateTime;
    let response = await this.axios.get('/campaigns/metrics', { params });
    return response.data;
  }

  // ─── Templates ──────────────────────────────────────────────────

  async getTemplates(params?: {
    templateType?: string;
    messageMedium?: string;
    startDateTime?: string;
    endDateTime?: string;
  }): Promise<any> {
    let response = await this.axios.get('/templates', { params });
    return response.data;
  }

  async getEmailTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/email/get`, {
      params: { templateId }
    });
    return response.data;
  }

  async updateEmailTemplate(params: {
    templateId: number;
    name?: string;
    fromName?: string;
    fromEmail?: string;
    replyToEmail?: string;
    subject?: string;
    preheaderText?: string;
    html?: string;
    plainText?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/templates/email/update', params);
    return response.data;
  }

  async getPushTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get('/templates/push/get', {
      params: { templateId }
    });
    return response.data;
  }

  async getSmsTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get('/templates/sms/get', {
      params: { templateId }
    });
    return response.data;
  }

  async getInAppTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get('/templates/inapp/get', {
      params: { templateId }
    });
    return response.data;
  }

  // ─── Email ──────────────────────────────────────────────────────

  async sendEmail(params: {
    campaignId: number;
    recipientEmail?: string;
    recipientUserId?: string;
    dataFields?: Record<string, any>;
    sendAt?: string;
    allowRepeatMarketingSends?: boolean;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/email/target', params);
    return response.data;
  }

  // ─── Push ───────────────────────────────────────────────────────

  async sendPush(params: {
    campaignId: number;
    recipientEmail?: string;
    recipientUserId?: string;
    dataFields?: Record<string, any>;
    sendAt?: string;
    allowRepeatMarketingSends?: boolean;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/push/target', params);
    return response.data;
  }

  // ─── SMS ────────────────────────────────────────────────────────

  async sendSms(params: {
    campaignId: number;
    recipientEmail?: string;
    recipientUserId?: string;
    dataFields?: Record<string, any>;
    sendAt?: string;
    allowRepeatMarketingSends?: boolean;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/sms/target', params);
    return response.data;
  }

  // ─── In-App ─────────────────────────────────────────────────────

  async sendInApp(params: {
    campaignId: number;
    recipientEmail?: string;
    recipientUserId?: string;
    dataFields?: Record<string, any>;
    sendAt?: string;
    allowRepeatMarketingSends?: boolean;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/inApp/target', params);
    return response.data;
  }

  // ─── Web Push ───────────────────────────────────────────────────

  async sendWebPush(params: {
    campaignId: number;
    recipientEmail?: string;
    recipientUserId?: string;
    dataFields?: Record<string, any>;
    sendAt?: string;
    allowRepeatMarketingSends?: boolean;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/webPush/target', params);
    return response.data;
  }

  // ─── Channels & Message Types ───────────────────────────────────

  async getChannels(): Promise<any> {
    let response = await this.axios.get('/channels');
    return response.data;
  }

  async getMessageTypes(): Promise<any> {
    let response = await this.axios.get('/messageTypes');
    return response.data;
  }

  // ─── Catalogs ───────────────────────────────────────────────────

  async getCatalogs(): Promise<any> {
    let response = await this.axios.get('/catalogs');
    return response.data;
  }

  async createCatalog(catalogName: string): Promise<any> {
    let response = await this.axios.post('/catalogs', { catalogName });
    return response.data;
  }

  async deleteCatalog(catalogName: string): Promise<any> {
    let response = await this.axios.delete(`/catalogs/${encodeURIComponent(catalogName)}`);
    return response.data;
  }

  async getCatalogItems(
    catalogName: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<any> {
    let response = await this.axios.get(`/catalogs/${encodeURIComponent(catalogName)}/items`, {
      params
    });
    return response.data;
  }

  async bulkUploadCatalogItems(
    catalogName: string,
    items: Record<string, any>,
    replaceUploadedFieldsOnly?: boolean
  ): Promise<any> {
    let body: Record<string, any> = { documents: items };
    if (replaceUploadedFieldsOnly !== undefined)
      body.replaceUploadedFieldsOnly = replaceUploadedFieldsOnly;
    let response = await this.axios.post(
      `/catalogs/${encodeURIComponent(catalogName)}/items`,
      body
    );
    return response.data;
  }

  async deleteCatalogItems(catalogName: string, itemIds: string[]): Promise<any> {
    let response = await this.axios.delete(
      `/catalogs/${encodeURIComponent(catalogName)}/items`,
      {
        data: { itemIds }
      }
    );
    return response.data;
  }

  // ─── Snippets ───────────────────────────────────────────────────

  async getSnippets(): Promise<any> {
    let response = await this.axios.get('/snippets');
    return response.data;
  }

  async createSnippet(params: { name: string; content: string }): Promise<any> {
    let response = await this.axios.post('/snippets', params);
    return response.data;
  }

  async updateSnippet(params: { name: string; content: string }): Promise<any> {
    let response = await this.axios.post('/snippets/update', params);
    return response.data;
  }

  async deleteSnippet(name: string): Promise<any> {
    let response = await this.axios.post('/snippets/delete', { name });
    return response.data;
  }

  // ─── Export ─────────────────────────────────────────────────────

  async exportData(params: {
    dataTypeName: string;
    range?: string;
    startDateTime?: string;
    endDateTime?: string;
    delimiter?: string;
    campaignId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/export/data', params);
    return response.data;
  }

  async exportUserEvents(params: {
    email?: string;
    userId?: string;
    includeCustomEvents?: boolean;
  }): Promise<any> {
    let response = await this.axios.get('/export/userEvents', { params });
    return response.data;
  }

  // ─── Subscriptions ──────────────────────────────────────────────

  async updateSubscriptions(params: {
    email?: string;
    userId?: string;
    emailListIds?: number[];
    unsubscribedChannelIds?: number[];
    unsubscribedMessageTypeIds?: number[];
    campaignId?: number;
    templateId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/users/updateSubscriptions', params);
    return response.data;
  }

  // ─── Webhooks ───────────────────────────────────────────────────

  async getWebhooks(): Promise<any> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }
}
