import { createAxios } from 'slates';

let BASE_URL = 'https://api.getdrip.com';

export class Client {
  private accountId: string;
  private token: string;
  private tokenType: 'bearer' | 'basic';

  constructor(config: { token: string; accountId: string; tokenType: 'bearer' | 'basic' }) {
    this.token = config.token;
    this.accountId = config.accountId;
    this.tokenType = config.tokenType;
  }

  private getAxios() {
    let authHeader: string;
    if (this.tokenType === 'basic') {
      let encoded = btoa(`${this.token}:`);
      authHeader = `Basic ${encoded}`;
    } else {
      authHeader = `Bearer ${this.token}`;
    }

    return createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      }
    });
  }

  private v2(path: string) {
    return `/v2/${this.accountId}${path}`;
  }

  private v3(path: string) {
    return `/v3/${this.accountId}${path}`;
  }

  // ---- Subscribers ----

  async listSubscribers(params?: {
    status?: string;
    tags?: string;
    subscribedBefore?: string;
    subscribedAfter?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDirection?: string;
  }) {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.tags) query.tags = params.tags;
    if (params?.subscribedBefore) query.subscribed_before = params.subscribedBefore;
    if (params?.subscribedAfter) query.subscribed_after = params.subscribedAfter;
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortDirection) query.sort_direction = params.sortDirection;
    let response = await ax.get(this.v2('/subscribers'), { params: query });
    return response.data;
  }

  async fetchSubscriber(idOrEmail: string) {
    let ax = this.getAxios();
    let response = await ax.get(this.v2(`/subscribers/${encodeURIComponent(idOrEmail)}`));
    return response.data;
  }

  async createOrUpdateSubscriber(subscriber: Record<string, any>) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2('/subscribers'), {
      subscribers: [subscriber]
    });
    return response.data;
  }

  async deleteSubscriber(idOrEmail: string) {
    let ax = this.getAxios();
    await ax.delete(this.v2(`/subscribers/${encodeURIComponent(idOrEmail)}`));
  }

  async unsubscribeFromAllMailings(idOrEmail: string) {
    let ax = this.getAxios();
    let response = await ax.post(
      this.v2(`/subscribers/${encodeURIComponent(idOrEmail)}/unsubscribe_all`)
    );
    return response.data;
  }

  async removeFromCampaign(idOrEmail: string, campaignId: string) {
    let ax = this.getAxios();
    let response = await ax.post(
      this.v2(`/subscribers/${encodeURIComponent(idOrEmail)}/remove`),
      {
        campaign_id: campaignId
      }
    );
    return response.data;
  }

  async getSubscriberCampaignSubscriptions(subscriberId: string) {
    let ax = this.getAxios();
    let response = await ax.get(
      this.v2(`/subscribers/${encodeURIComponent(subscriberId)}/campaign_subscriptions`)
    );
    return response.data;
  }

  // ---- Tags ----

  async listTags() {
    let ax = this.getAxios();
    let response = await ax.get(this.v2('/tags'));
    return response.data;
  }

  async applyTagToSubscriber(email: string, tag: string) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2('/tags'), {
      tags: [{ email, tag }]
    });
    return response.data;
  }

  async removeTagFromSubscriber(email: string, tag: string) {
    let ax = this.getAxios();
    await ax.delete(
      this.v2(`/subscribers/${encodeURIComponent(email)}/tags/${encodeURIComponent(tag)}`)
    );
  }

  // ---- Campaigns (Email Series) ----

  async listCampaigns(params?: {
    status?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDirection?: string;
  }) {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortDirection) query.sort_direction = params.sortDirection;
    let response = await ax.get(this.v2('/campaigns'), { params: query });
    return response.data;
  }

  async fetchCampaign(campaignId: string) {
    let ax = this.getAxios();
    let response = await ax.get(this.v2(`/campaigns/${campaignId}`));
    return response.data;
  }

  async activateCampaign(campaignId: string) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2(`/campaigns/${campaignId}/activate`));
    return response.data;
  }

  async pauseCampaign(campaignId: string) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2(`/campaigns/${campaignId}/pause`));
    return response.data;
  }

  async listCampaignSubscribers(
    campaignId: string,
    params?: { page?: number; perPage?: number; sortBy?: string; sortDirection?: string }
  ) {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortDirection) query.sort_direction = params.sortDirection;
    let response = await ax.get(this.v2(`/campaigns/${campaignId}/subscribers`), {
      params: query
    });
    return response.data;
  }

  async subscribeToCampaign(campaignId: string, subscriber: Record<string, any>) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2(`/campaigns/${campaignId}/subscribers`), {
      subscribers: [subscriber]
    });
    return response.data;
  }

  // ---- Broadcasts ----

  async listBroadcasts(params?: {
    status?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDirection?: string;
  }) {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortDirection) query.sort_direction = params.sortDirection;
    let response = await ax.get(this.v2('/broadcasts'), { params: query });
    return response.data;
  }

  async fetchBroadcast(broadcastId: string) {
    let ax = this.getAxios();
    let response = await ax.get(this.v2(`/broadcasts/${broadcastId}`));
    return response.data;
  }

  // ---- Workflows ----

  async listWorkflows(params?: {
    status?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDirection?: string;
  }) {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortDirection) query.sort_direction = params.sortDirection;
    let response = await ax.get(this.v2('/workflows'), { params: query });
    return response.data;
  }

  async fetchWorkflow(workflowId: string) {
    let ax = this.getAxios();
    let response = await ax.get(this.v2(`/workflows/${workflowId}`));
    return response.data;
  }

  async activateWorkflow(workflowId: string) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2(`/workflows/${workflowId}/activate`));
    return response.data;
  }

  async pauseWorkflow(workflowId: string) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2(`/workflows/${workflowId}/pause`));
    return response.data;
  }

  async startOnWorkflow(workflowId: string, subscriber: Record<string, any>) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2(`/workflows/${workflowId}/subscribers`), {
      subscribers: [subscriber]
    });
    return response.data;
  }

  async removeFromWorkflow(workflowId: string, subscriberId: string) {
    let ax = this.getAxios();
    await ax.delete(
      this.v2(`/workflows/${workflowId}/subscribers/${encodeURIComponent(subscriberId)}`)
    );
  }

  // ---- Events ----

  async recordEvent(event: Record<string, any>) {
    let ax = this.getAxios();
    let response = await ax.post(this.v2('/events'), {
      events: [event]
    });
    return response.data;
  }

  async listEventActions(params?: { page?: number; perPage?: number }) {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    let response = await ax.get(this.v2('/event_actions'), { params: query });
    return response.data;
  }

  // ---- Shopper Activity: Orders ----

  async createOrUpdateOrder(order: Record<string, any>) {
    let ax = this.getAxios();
    let response = await ax.post(this.v3('/shopper_activity/order/batch'), {
      orders: [order]
    });
    return response.data;
  }

  // ---- Shopper Activity: Carts ----

  async createOrUpdateCart(cart: Record<string, any>) {
    let ax = this.getAxios();
    let response = await ax.post(this.v3('/shopper_activity/cart/batch'), {
      carts: [cart]
    });
    return response.data;
  }

  // ---- Shopper Activity: Products ----

  async createOrUpdateProduct(product: Record<string, any>) {
    let ax = this.getAxios();
    let response = await ax.post(this.v3('/shopper_activity/product/batch'), {
      products: [product]
    });
    return response.data;
  }

  // ---- Conversions ----

  async listConversions(params?: { page?: number; perPage?: number }) {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.perPage) query.per_page = String(params.perPage);
    let response = await ax.get(this.v2('/goals'), { params: query });
    return response.data;
  }

  async fetchConversion(conversionId: string) {
    let ax = this.getAxios();
    let response = await ax.get(this.v2(`/goals/${conversionId}`));
    return response.data;
  }

  // ---- Custom Fields ----

  async listCustomFields() {
    let ax = this.getAxios();
    let response = await ax.get(this.v2('/custom_field_identifiers'));
    return response.data;
  }

  // ---- Forms ----

  async listForms() {
    let ax = this.getAxios();
    let response = await ax.get(this.v2('/forms'));
    return response.data;
  }

  async fetchForm(formId: string) {
    let ax = this.getAxios();
    let response = await ax.get(this.v2(`/forms/${formId}`));
    return response.data;
  }

  // ---- Accounts ----

  async listAccounts() {
    let ax = this.getAxios();
    let response = await ax.get('/v2/accounts');
    return response.data;
  }

  async fetchAccount(accountId: string) {
    let ax = this.getAxios();
    let response = await ax.get(`/v2/accounts/${accountId}`);
    return response.data;
  }

  // ---- Users ----

  async fetchUser() {
    let ax = this.getAxios();
    let response = await ax.get('/v2/user');
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks() {
    let ax = this.getAxios();
    let response = await ax.get(this.v2('/webhooks'));
    return response.data;
  }

  async fetchWebhook(webhookId: string) {
    let ax = this.getAxios();
    let response = await ax.get(this.v2(`/webhooks/${webhookId}`));
    return response.data;
  }

  async createWebhook(postUrl: string, events?: string[], includeReceivedEmail?: boolean) {
    let ax = this.getAxios();
    let webhook: Record<string, any> = { post_url: postUrl };
    if (events) webhook.events = events;
    if (includeReceivedEmail !== undefined)
      webhook.include_received_email = includeReceivedEmail;
    let response = await ax.post(this.v2('/webhooks'), {
      webhooks: [webhook]
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let ax = this.getAxios();
    await ax.delete(this.v2(`/webhooks/${webhookId}`));
  }
}
