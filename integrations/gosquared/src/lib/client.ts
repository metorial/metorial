import { createAxios } from 'slates';

export class GoSquaredClient {
  private axios: ReturnType<typeof createAxios>;
  private apiKey: string;
  private siteToken: string;

  constructor(config: { token: string; siteToken: string }) {
    this.apiKey = config.token;
    this.siteToken = config.siteToken;
    this.axios = createAxios({
      baseURL: 'https://api.gosquared.com'
    });
  }

  private get authParams() {
    return {
      api_key: this.apiKey,
      site_token: this.siteToken
    };
  }

  // ── Now API (Real-Time) ──

  async getNowOverview() {
    let res = await this.axios.get('/now/v3/overview', { params: this.authParams });
    return res.data;
  }

  async getNowConcurrents() {
    let res = await this.axios.get('/now/v3/concurrents', { params: this.authParams });
    return res.data;
  }

  async getNowPages(params?: { limit?: string; sort?: string }) {
    let res = await this.axios.get('/now/v3/pages', {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async getNowSources(params?: { limit?: string }) {
    let res = await this.axios.get('/now/v3/sources', {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async getNowCountries(params?: { limit?: string }) {
    let res = await this.axios.get('/now/v3/countries', {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async getNowVisitors(params?: { limit?: string }) {
    let res = await this.axios.get('/now/v3/visitors', {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async getNowEngagement() {
    let res = await this.axios.get('/now/v3/engagement', { params: this.authParams });
    return res.data;
  }

  // ── Trends API (Historical) ──

  async getTrendsAggregate(params?: { from?: string; to?: string; interval?: string }) {
    let res = await this.axios.get('/trends/v2/aggregate', {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async getTrendsByDimension(
    dimension: string,
    params?: { from?: string; to?: string; limit?: string }
  ) {
    let res = await this.axios.get(`/trends/v2/${dimension}`, {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  // ── Tracking API ──

  async identify(personId: string, properties: Record<string, any>) {
    let res = await this.axios.post(
      '/tracking/v1/identify',
      {
        person_id: personId,
        properties
      },
      {
        params: this.authParams,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return res.data;
  }

  async trackEvent(event: {
    name: string;
    data?: Record<string, any>;
    personId?: string;
    visitorId?: string;
    timestamp?: string;
  }) {
    let body: Record<string, any> = {
      event: {
        name: event.name,
        ...(event.data ? { data: event.data } : {}),
        ...(event.timestamp ? { timestamp: event.timestamp } : {})
      }
    };
    if (event.personId) body.person_id = event.personId;
    if (event.visitorId) body.visitor_id = event.visitorId;

    let res = await this.axios.post('/tracking/v1/event', body, {
      params: this.authParams,
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data;
  }

  async trackPageview(pageview: {
    title?: string;
    url?: string;
    personId?: string;
    visitorId?: string;
  }) {
    let body: Record<string, any> = {};
    if (pageview.title || pageview.url) {
      body.page = {};
      if (pageview.title) body.page.title = pageview.title;
      if (pageview.url) body.page.url = pageview.url;
    }
    if (pageview.personId) body.person_id = pageview.personId;
    if (pageview.visitorId) body.visitor_id = pageview.visitorId;

    let res = await this.axios.post('/tracking/v1/pageview', body, {
      params: this.authParams,
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data;
  }

  async trackTransaction(transaction: {
    transactionId?: string;
    personId?: string;
    visitorId?: string;
    revenue?: number;
    quantity?: number;
    items?: Array<{
      name: string;
      price?: number;
      quantity?: number;
      categories?: string[];
    }>;
    timestamp?: string;
  }) {
    let body: Record<string, any> = {
      transaction: {
        ...(transaction.transactionId ? { id: transaction.transactionId } : {}),
        ...(transaction.revenue !== undefined ? { revenue: transaction.revenue } : {}),
        ...(transaction.quantity !== undefined ? { quantity: transaction.quantity } : {}),
        ...(transaction.items ? { items: transaction.items } : {}),
        ...(transaction.timestamp ? { timestamp: transaction.timestamp } : {})
      }
    };
    if (transaction.personId) body.person_id = transaction.personId;
    if (transaction.visitorId) body.visitor_id = transaction.visitorId;

    let res = await this.axios.post('/tracking/v1/transaction', body, {
      params: this.authParams,
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data;
  }

  // ── People API ──

  async searchPeople(params?: {
    query?: string;
    filters?: any[];
    fields?: string;
    sort?: string;
    limit?: string;
  }) {
    let res = await this.axios.get('/people/v1/people', {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async getPerson(personId: string) {
    let res = await this.axios.get(`/people/v1/people/${encodeURIComponent(personId)}`, {
      params: this.authParams
    });
    return res.data;
  }

  async getPersonFeed(
    personId: string,
    params?: { from?: string; to?: string; limit?: string }
  ) {
    let res = await this.axios.get(`/people/v1/people/${encodeURIComponent(personId)}/feed`, {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async deletePerson(personId: string, blacklist?: boolean) {
    let res = await this.axios.delete(`/people/v1/people/${encodeURIComponent(personId)}`, {
      params: { ...this.authParams, ...(blacklist !== undefined ? { blacklist } : {}) }
    });
    return res.data;
  }

  async getPersonDevices(personId: string) {
    let res = await this.axios.get(
      `/people/v1/people/${encodeURIComponent(personId)}/devices`,
      {
        params: this.authParams
      }
    );
    return res.data;
  }

  async getSmartGroups() {
    let res = await this.axios.get('/people/v1/smartgroups', {
      params: this.authParams
    });
    return res.data;
  }

  async getSmartGroup(groupId: string) {
    let res = await this.axios.get(`/people/v1/smartgroups/${encodeURIComponent(groupId)}`, {
      params: this.authParams
    });
    return res.data;
  }

  async createSmartGroup(name: string, filters: any[]) {
    let res = await this.axios.post(
      '/people/v1/smartgroups',
      {
        name,
        filters
      },
      {
        params: this.authParams,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return res.data;
  }

  async getSmartGroupPeople(
    groupId: string,
    params?: {
      query?: string;
      fields?: string;
      sort?: string;
      limit?: string;
    }
  ) {
    let res = await this.axios.get(
      `/people/v1/smartgroups/${encodeURIComponent(groupId)}/people`,
      {
        params: { ...this.authParams, ...params }
      }
    );
    return res.data;
  }

  async getEventTypes() {
    let res = await this.axios.get('/people/v1/eventTypes', {
      params: this.authParams
    });
    return res.data;
  }

  async getPropertyTypes() {
    let res = await this.axios.get('/people/v1/propertyTypes', {
      params: this.authParams
    });
    return res.data;
  }

  // ── Chat API ──

  async getChats(params?: { limit?: string; from?: string; to?: string }) {
    let res = await this.axios.get('/chat/v1/chats', {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async getChat(chatId: string) {
    let res = await this.axios.get(`/chat/v1/chats/${encodeURIComponent(chatId)}`, {
      params: this.authParams
    });
    return res.data;
  }

  async getChatMessages(chatId: string, params?: { limit?: string }) {
    let res = await this.axios.get(`/chat/v1/chats/${encodeURIComponent(chatId)}/messages`, {
      params: { ...this.authParams, ...params }
    });
    return res.data;
  }

  async sendChatMessage(
    chatId: string,
    body: { content: string; from?: string; auth?: string }
  ) {
    let res = await this.axios.post(
      `/chat/v1/chats/${encodeURIComponent(chatId)}/messages`,
      {
        content: body.content,
        ...(body.from ? { from: body.from } : {})
      },
      {
        params: { ...this.authParams, ...(body.auth ? { auth: body.auth } : {}) },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return res.data;
  }

  async addChatNote(chatId: string, content: string) {
    let res = await this.axios.post(
      `/chat/v1/chats/${encodeURIComponent(chatId)}/notes`,
      {
        content
      },
      {
        params: this.authParams,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return res.data;
  }

  async archiveChat(chatId: string) {
    let res = await this.axios.post(
      `/chat/v1/chats/${encodeURIComponent(chatId)}/archive`,
      {},
      {
        params: this.authParams
      }
    );
    return res.data;
  }

  async unarchiveChat(chatId: string) {
    let res = await this.axios.post(
      `/chat/v1/chats/${encodeURIComponent(chatId)}/unarchive`,
      {},
      {
        params: this.authParams
      }
    );
    return res.data;
  }

  // ── Account / Webhooks API ──

  async getWebhooks() {
    let res = await this.axios.get('/account/v1/webhooks', {
      params: this.authParams
    });
    return res.data;
  }

  async createWebhook(
    url: string,
    options?: {
      name?: string;
      trigger?: string;
      value?: string;
      includeUnverified?: boolean;
    }
  ) {
    let body: Record<string, any> = { url };
    if (options?.name) body.name = options.name;
    if (options?.trigger) body.trigger = options.trigger;
    if (options?.value) body.value = options.value;
    if (options?.includeUnverified !== undefined)
      body.include_unverified = options.includeUnverified;

    let res = await this.axios.post('/account/v1/webhooks', body, {
      params: this.authParams,
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(
      `/account/v1/webhooks/${encodeURIComponent(webhookId)}`,
      {
        params: this.authParams
      }
    );
    return res.data;
  }

  async getWebhookTriggers(webhookId: string) {
    let res = await this.axios.get(
      `/account/v1/webhooks/${encodeURIComponent(webhookId)}/triggers`,
      {
        params: this.authParams
      }
    );
    return res.data;
  }

  async addWebhookTrigger(webhookId: string, trigger: string, value?: string) {
    let body: Record<string, any> = { trigger };
    if (value) body.value = value;

    let res = await this.axios.post(
      `/account/v1/webhooks/${encodeURIComponent(webhookId)}/triggers`,
      body,
      {
        params: this.authParams,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return res.data;
  }

  async removeWebhookTrigger(webhookId: string, triggerId: string) {
    let res = await this.axios.delete(
      `/account/v1/webhooks/${encodeURIComponent(webhookId)}/triggers/${encodeURIComponent(triggerId)}`,
      { params: this.authParams }
    );
    return res.data;
  }

  async getTriggerTypes() {
    let res = await this.axios.get('/account/v1/triggerTypes', {
      params: this.authParams
    });
    return res.data;
  }
}
