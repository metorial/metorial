import { createAxios } from 'slates';
import { iterableApiError } from './errors';

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

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw iterableApiError(error, operation);
    }
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
    return await this.request('update user', () => this.axios.post('/users/update', params));
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
    return await this.request('bulk update users', () =>
      this.axios.post('/users/bulkUpdate', { users })
    );
  }

  async getUser(params: { email?: string; userId?: string }): Promise<any> {
    if (params.userId) {
      return await this.request('get user by userId', () =>
        this.axios.get('/users/byUserId', {
          params: { userId: params.userId }
        })
      );
    }
    return await this.request('get user by email', () =>
      this.axios.get('/users/getByEmail', {
        params: { email: params.email }
      })
    );
  }

  async deleteUser(params: { email?: string; userId?: string }): Promise<any> {
    if (params.userId) {
      return await this.request('delete user by userId', () =>
        this.axios.delete('/users/byUserId', {
          params: { userId: params.userId }
        })
      );
    }
    return await this.request('delete user by email', () =>
      this.axios.delete(`/users/${encodeURIComponent(params.email!)}`, {})
    );
  }

  async getUserFields(): Promise<any> {
    return await this.request('get user fields', () => this.axios.get('/users/getFields'));
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
    return await this.request('merge users', () => this.axios.post('/users/merge', body));
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
    return await this.request('track event', () => this.axios.post('/events/track', params));
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
    return await this.request('bulk track events', () =>
      this.axios.post('/events/bulkTrack', { events })
    );
  }

  async getUserEvents(email: string, limit?: number): Promise<any> {
    return await this.request('get user events', () =>
      this.axios.get(`/events/${encodeURIComponent(email)}`, {
        params: { limit: limit || 30 }
      })
    );
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
    return await this.request('track purchase', () =>
      this.axios.post('/commerce/trackPurchase', params)
    );
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
    return await this.request('update cart', () =>
      this.axios.post('/commerce/updateCart', params)
    );
  }

  // ─── Lists ──────────────────────────────────────────────────────

  async getLists(): Promise<any> {
    return await this.request('list lists', () => this.axios.get('/lists'));
  }

  async createList(name: string): Promise<any> {
    return await this.request('create list', () => this.axios.post('/lists', { name }));
  }

  async deleteList(listId: number): Promise<any> {
    return await this.request('delete list', () => this.axios.delete(`/lists/${listId}`));
  }

  async getListUsers(listId: number): Promise<any> {
    return await this.request('get list users', () =>
      this.axios.get(`/lists/getUsers`, {
        params: { listId },
        responseType: 'text'
      })
    );
  }

  async subscribeToList(
    listId: number,
    subscribers: { email?: string; userId?: string; dataFields?: Record<string, any> }[]
  ): Promise<any> {
    return await this.request('subscribe users to list', () =>
      this.axios.post('/lists/subscribe', {
        listId,
        subscribers
      })
    );
  }

  async unsubscribeFromList(
    listId: number,
    subscribers: { email?: string; userId?: string }[]
  ): Promise<any> {
    return await this.request('unsubscribe users from list', () =>
      this.axios.post('/lists/unsubscribe', {
        listId,
        subscribers
      })
    );
  }

  // ─── Campaigns ──────────────────────────────────────────────────

  async getCampaigns(params?: {
    page?: number;
    pageSize?: number;
    sort?: string;
    campaignState?: string[];
  }): Promise<any> {
    return await this.request('list campaigns', () =>
      this.axios.get('/campaigns', { params })
    );
  }

  async createCampaign(params: {
    name: string;
    listIds?: number[];
    templateId: number;
    suppressionListIds?: number[];
    sendAt?: string;
    scheduleSend?: boolean;
    sendMode?: string;
    startTimeZone?: string;
    defaultTimeZone?: string;
    dataFields?: Record<string, any>;
  }): Promise<any> {
    return await this.request('create campaign', () =>
      this.axios.post('/campaigns/create', params)
    );
  }

  async getCampaign(campaignId: number): Promise<any> {
    return await this.request('get campaign', () =>
      this.axios.get(`/campaigns/${campaignId}`)
    );
  }

  async archiveCampaigns(campaignIds: number[]): Promise<any> {
    return await this.request('archive campaigns', () =>
      this.axios.post('/campaigns/archive', { campaignIds })
    );
  }

  async getCampaignMetrics(
    campaignId: number,
    startDateTime?: string,
    endDateTime?: string
  ): Promise<any> {
    let params: Record<string, any> = { campaignId };
    if (startDateTime) params.startDateTime = startDateTime;
    if (endDateTime) params.endDateTime = endDateTime;
    return await this.request('get campaign metrics', () =>
      this.axios.get('/campaigns/metrics', { params, responseType: 'text' })
    );
  }

  // ─── Templates ──────────────────────────────────────────────────

  async getTemplates(params?: {
    templateType?: string;
    messageMedium?: string;
    startDateTime?: string;
    endDateTime?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
  }): Promise<any> {
    return await this.request('list templates', () =>
      this.axios.get('/templates', { params })
    );
  }

  async getEmailTemplate(templateId: number): Promise<any> {
    return await this.request('get email template', () =>
      this.axios.get(`/templates/email/get`, {
        params: { templateId }
      })
    );
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
    return await this.request('update email template', () =>
      this.axios.post('/templates/email/update', params)
    );
  }

  async getPushTemplate(templateId: number): Promise<any> {
    return await this.request('get push template', () =>
      this.axios.get('/templates/push/get', {
        params: { templateId }
      })
    );
  }

  async getSmsTemplate(templateId: number): Promise<any> {
    return await this.request('get sms template', () =>
      this.axios.get('/templates/sms/get', {
        params: { templateId }
      })
    );
  }

  async getInAppTemplate(templateId: number): Promise<any> {
    return await this.request('get in-app template', () =>
      this.axios.get('/templates/inapp/get', {
        params: { templateId }
      })
    );
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
    return await this.request('send email', () => this.axios.post('/email/target', params));
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
    return await this.request('send push', () => this.axios.post('/push/target', params));
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
    return await this.request('send sms', () => this.axios.post('/sms/target', params));
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
    return await this.request('send in-app', () => this.axios.post('/inApp/target', params));
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
    return await this.request('send web push', () =>
      this.axios.post('/webPush/target', params)
    );
  }

  // ─── Channels & Message Types ───────────────────────────────────

  async getChannels(): Promise<any> {
    return await this.request('get channels', () => this.axios.get('/channels'));
  }

  async getMessageTypes(): Promise<any> {
    return await this.request('get message types', () => this.axios.get('/messageTypes'));
  }

  // ─── Catalogs ───────────────────────────────────────────────────

  async getCatalogs(): Promise<any> {
    return await this.request('list catalogs', () => this.axios.get('/catalogs'));
  }

  async createCatalog(catalogName: string): Promise<any> {
    return await this.request('create catalog', () =>
      this.axios.post(`/catalogs/${encodeURIComponent(catalogName)}`)
    );
  }

  async deleteCatalog(catalogName: string): Promise<any> {
    return await this.request('delete catalog', () =>
      this.axios.delete(`/catalogs/${encodeURIComponent(catalogName)}`)
    );
  }

  async getCatalogItems(
    catalogName: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<any> {
    return await this.request('list catalog items', () =>
      this.axios.get(`/catalogs/${encodeURIComponent(catalogName)}/items`, {
        params
      })
    );
  }

  async getCatalogItem(catalogName: string, itemId: string): Promise<any> {
    return await this.request('get catalog item', () =>
      this.axios.get(
        `/catalogs/${encodeURIComponent(catalogName)}/items/${encodeURIComponent(itemId)}`
      )
    );
  }

  async bulkUploadCatalogItems(
    catalogName: string,
    items: Record<string, any>,
    replaceUploadedFieldsOnly?: boolean
  ): Promise<any> {
    let body: Record<string, any> = { documents: items };
    if (replaceUploadedFieldsOnly !== undefined)
      body.replaceUploadedFieldsOnly = replaceUploadedFieldsOnly;
    return await this.request('bulk upload catalog items', () =>
      this.axios.post(`/catalogs/${encodeURIComponent(catalogName)}/items`, body)
    );
  }

  async deleteCatalogItems(catalogName: string, itemIds: string[]): Promise<any> {
    return await this.request('delete catalog items', () =>
      this.axios.delete(`/catalogs/${encodeURIComponent(catalogName)}/items`, {
        data: { itemIds }
      })
    );
  }

  // ─── Snippets ───────────────────────────────────────────────────

  async getSnippets(): Promise<any> {
    return await this.request('list snippets', () => this.axios.get('/snippets'));
  }

  async createSnippet(params: { name: string; content: string }): Promise<any> {
    return await this.request('create snippet', () => this.axios.post('/snippets', params));
  }

  async getSnippet(name: string): Promise<any> {
    return await this.request('get snippet', () =>
      this.axios.get(`/snippets/${encodeURIComponent(name)}`)
    );
  }

  async updateSnippet(params: { name: string; content: string }): Promise<any> {
    return await this.request('update snippet', () =>
      this.axios.put(`/snippets/${encodeURIComponent(params.name)}`, {
        content: params.content
      })
    );
  }

  async deleteSnippet(name: string): Promise<any> {
    return await this.request('delete snippet', () =>
      this.axios.delete(`/snippets/${encodeURIComponent(name)}`)
    );
  }

  // ─── Export ─────────────────────────────────────────────────────

  async exportData(params: {
    format: 'csv' | 'json';
    dataTypeName: string;
    range?: string;
    startDateTime?: string;
    endDateTime?: string;
    delimiter?: string;
    omitFields?: string;
    onlyFields?: string[];
    campaignId?: number;
  }): Promise<string> {
    let { format, ...query } = params;
    let path = format === 'csv' ? '/export/data.csv' : '/export/data.json';
    return await this.request(`export data ${format}`, () =>
      this.axios.get(path, { params: query, responseType: 'text' })
    );
  }

  async exportUserEvents(params: {
    email?: string;
    userId?: string;
    includeCustomEvents?: boolean;
  }): Promise<string> {
    return await this.request('export user events', () =>
      this.axios.get('/export/userEvents', { params, responseType: 'text' })
    );
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
    return await this.request('update subscriptions', () =>
      this.axios.post('/users/updateSubscriptions', params)
    );
  }

  // ─── Webhooks ───────────────────────────────────────────────────

  async getWebhooks(): Promise<any> {
    return await this.request('get webhooks', () => this.axios.get('/webhooks'));
  }

  // ─── Journeys ───────────────────────────────────────────────────

  async getJourneys(params?: {
    page?: number;
    pageSize?: number;
    sort?: string;
    state?: string[];
  }): Promise<any> {
    return await this.request('list journeys', () => this.axios.get('/journeys', { params }));
  }
}
