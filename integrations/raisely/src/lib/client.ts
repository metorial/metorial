import { createAxios } from 'slates';

let BASE_URL = 'https://api.raisely.com/v3';

export class RaiselyClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Campaigns ──────────────────────────────────────────────

  async listCampaigns(params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    order?: string;
    private?: boolean;
  }) {
    let response = await this.axios.get('/campaigns', { params });
    return response.data;
  }

  async getCampaign(campaignUuid: string, params?: { private?: boolean }) {
    let response = await this.axios.get(`/campaigns/${campaignUuid}`, { params });
    return response.data;
  }

  async updateCampaign(campaignUuid: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/campaigns/${campaignUuid}`, { data });
    return response.data;
  }

  // ── Profiles ───────────────────────────────────────────────

  async listProfiles(
    campaignUuid: string,
    params?: {
      offset?: number;
      limit?: number;
      sort?: string;
      order?: string;
      type?: string;
      private?: boolean;
      q?: string;
      user?: string;
      parent?: string;
      team?: string;
    }
  ) {
    let response = await this.axios.get(`/campaigns/${campaignUuid}/profiles`, { params });
    return response.data;
  }

  async getProfile(profileUuid: string, params?: { private?: boolean }) {
    let response = await this.axios.get(`/profiles/${profileUuid}`, { params });
    return response.data;
  }

  async createProfile(campaignUuid: string, data: Record<string, any>) {
    let response = await this.axios.post(`/campaigns/${campaignUuid}/profiles`, { data });
    return response.data;
  }

  async updateProfile(profileUuid: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/profiles/${profileUuid}`, { data });
    return response.data;
  }

  async deleteProfile(profileUuid: string) {
    let response = await this.axios.delete(`/profiles/${profileUuid}`);
    return response.data;
  }

  async addProfileMember(profileUuid: string, userUuid: string) {
    let response = await this.axios.post(`/profiles/${profileUuid}/members`, {
      data: { userUuid }
    });
    return response.data;
  }

  async removeProfileMember(profileUuid: string, userUuid: string) {
    let response = await this.axios.delete(`/profiles/${profileUuid}/members/${userUuid}`);
    return response.data;
  }

  // ── Donations ──────────────────────────────────────────────

  async listDonations(
    campaignUuid: string,
    params?: {
      offset?: number;
      limit?: number;
      sort?: string;
      order?: string;
      private?: boolean;
      profile?: string;
      user?: string;
      status?: string;
    }
  ) {
    let response = await this.axios.get(`/campaigns/${campaignUuid}/donations`, { params });
    return response.data;
  }

  async getDonation(donationUuid: string, params?: { private?: boolean }) {
    let response = await this.axios.get(`/donations/${donationUuid}`, { params });
    return response.data;
  }

  async createDonation(campaignUuid: string, data: Record<string, any>) {
    let response = await this.axios.post(`/campaigns/${campaignUuid}/donations`, { data });
    return response.data;
  }

  async updateDonation(donationUuid: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/donations/${donationUuid}`, { data });
    return response.data;
  }

  // ── Subscriptions ──────────────────────────────────────────

  async listSubscriptions(
    campaignUuid: string,
    params?: {
      offset?: number;
      limit?: number;
      sort?: string;
      order?: string;
      private?: boolean;
      profile?: string;
      user?: string;
      status?: string;
    }
  ) {
    let response = await this.axios.get(`/campaigns/${campaignUuid}/subscriptions`, {
      params
    });
    return response.data;
  }

  async getSubscription(subscriptionUuid: string, params?: { private?: boolean }) {
    let response = await this.axios.get(`/subscriptions/${subscriptionUuid}`, { params });
    return response.data;
  }

  async createSubscription(campaignUuid: string, data: Record<string, any>) {
    let response = await this.axios.post(`/campaigns/${campaignUuid}/subscriptions`, { data });
    return response.data;
  }

  async updateSubscription(subscriptionUuid: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/subscriptions/${subscriptionUuid}`, { data });
    return response.data;
  }

  // ── Users ──────────────────────────────────────────────────

  async listUsers(params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    order?: string;
    private?: boolean;
    campaign?: string;
    q?: string;
  }) {
    let response = await this.axios.get('/users', { params });
    return response.data;
  }

  async getUser(userUuid: string, params?: { private?: boolean }) {
    let response = await this.axios.get(`/users/${userUuid}`, { params });
    return response.data;
  }

  async createUser(data: Record<string, any>) {
    let response = await this.axios.post('/users', { data });
    return response.data;
  }

  async updateUser(userUuid: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/users/${userUuid}`, { data });
    return response.data;
  }

  async upsertUser(data: Record<string, any>) {
    let response = await this.axios.post('/users/upsert', { data });
    return response.data;
  }

  // ── Products ───────────────────────────────────────────────

  async listProducts(
    campaignUuid: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ) {
    let response = await this.axios.get(`/campaigns/${campaignUuid}/products`, { params });
    return response.data;
  }

  async getProduct(productUuid: string) {
    let response = await this.axios.get(`/products/${productUuid}`);
    return response.data;
  }

  // ── Orders ─────────────────────────────────────────────────

  async listOrders(
    campaignUuid: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ) {
    let response = await this.axios.get(`/campaigns/${campaignUuid}/orders`, { params });
    return response.data;
  }

  async getOrder(orderUuid: string) {
    let response = await this.axios.get(`/orders/${orderUuid}`);
    return response.data;
  }

  // ── Posts ──────────────────────────────────────────────────

  async listPosts(
    profileUuid: string,
    params?: {
      offset?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }
  ) {
    let response = await this.axios.get(`/profiles/${profileUuid}/posts`, { params });
    return response.data;
  }

  async createPost(campaignUuid: string, profileUuid: string, data: Record<string, any>) {
    let response = await this.axios.post(
      `/campaigns/${campaignUuid}/profiles/${profileUuid}/posts`,
      { data }
    );
    return response.data;
  }

  async updatePost(postUuid: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/posts/${postUuid}`, { data });
    return response.data;
  }

  async deletePost(postUuid: string) {
    let response = await this.axios.delete(`/posts/${postUuid}`);
    return response.data;
  }

  // ── Messages ───────────────────────────────────────────────

  async createMessage(campaignUuid: string, data: Record<string, any>) {
    let response = await this.axios.post(`/campaigns/${campaignUuid}/messages`, { data });
    return response.data;
  }

  // ── Webhooks ───────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: { url: string; campaignUuid?: string; sharedSecret?: string }) {
    let response = await this.axios.post('/webhooks', { data });
    return response.data;
  }

  async deleteWebhook(webhookUuid: string) {
    let response = await this.axios.delete(`/webhooks/${webhookUuid}`);
    return response.data;
  }
}
