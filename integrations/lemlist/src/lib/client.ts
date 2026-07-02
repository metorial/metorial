import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    let encoded = Buffer.from(`:${config.token}`).toString('base64');

    this.axios = createAxios({
      baseURL: 'https://api.lemlist.com/api',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Campaigns ──────────────────────────────────────────

  async listCampaigns(params?: {
    offset?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let response = await this.axios.get('/campaigns', {
      params: {
        version: 'v2',
        ...params
      }
    });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(name: string) {
    let response = await this.axios.post('/campaigns', { name });
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/campaigns/${campaignId}`, data);
    return response.data;
  }

  async pauseCampaign(campaignId: string) {
    let response = await this.axios.post(`/campaigns/${campaignId}/pause`);
    return response.data;
  }

  async startCampaign(campaignId: string) {
    let response = await this.axios.post(`/campaigns/${campaignId}/start`);
    return response.data;
  }

  async getCampaignStats(
    campaignId: string,
    params: {
      startDate: string;
      endDate: string;
      sendUser?: string;
      channels?: string[];
    }
  ) {
    let response = await this.axios.get(`/v2/campaigns/${campaignId}/stats`, {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        sendUser: params.sendUser,
        channels: params.channels ? JSON.stringify(params.channels) : undefined
      }
    });
    return response.data;
  }

  // ── Leads ──────────────────────────────────────────────

  async addLeadToCampaign(
    campaignId: string,
    lead: Record<string, unknown>,
    options?: {
      deduplicate?: boolean;
      linkedinEnrichment?: boolean;
      findEmail?: boolean;
      verifyEmail?: boolean;
      findPhone?: boolean;
    }
  ) {
    let response = await this.axios.post(`/campaigns/${campaignId}/leads/`, lead, {
      params: options
    });
    return response.data;
  }

  async getCampaignLeads(
    campaignId: string,
    params?: {
      state?: string;
      offset?: number;
      limit?: number;
    }
  ) {
    let response = await this.axios.get(`/campaigns/${campaignId}/leads`, {
      params
    });
    return response.data;
  }

  async updateLead(campaignId: string, leadId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/campaigns/${campaignId}/leads/${leadId}`, data);
    return response.data;
  }

  async deleteLead(campaignId: string, leadId: string, action?: string) {
    let response = await this.axios.delete(`/campaigns/${campaignId}/leads/${leadId}`, {
      params: action ? { action } : undefined
    });
    return response.data;
  }

  async getLeadByEmail(email: string) {
    let response = await this.axios.get(`/leads/${encodeURIComponent(email)}`, {
      params: { version: 'v2' }
    });
    return response.data;
  }

  async markLeadInterested(leadIdOrEmail: string, campaignId?: string) {
    let path = campaignId
      ? `/campaigns/${campaignId}/leads/${encodeURIComponent(leadIdOrEmail)}/interested`
      : `/leads/interested/${encodeURIComponent(leadIdOrEmail)}`;
    let response = await this.axios.post(path);
    return response.data;
  }

  async markLeadNotInterested(leadIdOrEmail: string, campaignId?: string) {
    let path = campaignId
      ? `/campaigns/${campaignId}/leads/${encodeURIComponent(leadIdOrEmail)}/notinterested`
      : `/leads/notinterested/${encodeURIComponent(leadIdOrEmail)}`;
    let response = await this.axios.post(path);
    return response.data;
  }

  async pauseLead(leadId: string, campaignId?: string) {
    let response = await this.axios.post(`/leads/pause/${leadId}`, undefined, {
      params: campaignId ? { campaignId } : undefined
    });
    return response.data;
  }

  async resumeLead(leadId: string, campaignId?: string) {
    let response = await this.axios.post(`/leads/start/${leadId}`, undefined, {
      params: campaignId ? { campaignId } : undefined
    });
    return response.data;
  }

  // ── Activities ─────────────────────────────────────────

  async getActivities(params?: {
    type?: string;
    campaignId?: string;
    leadId?: string;
    isFirst?: boolean;
    offset?: number;
    limit?: number;
  }) {
    let response = await this.axios.get('/activities', {
      params: {
        version: 'v2',
        ...params
      }
    });
    return response.data;
  }

  // ── Unsubscribes ───────────────────────────────────────

  async listUnsubscribes(params?: { offset?: number; limit?: number }) {
    let response = await this.axios.get('/unsubscribes', {
      params
    });
    return response.data;
  }

  async getUnsubscribeStatus(email: string) {
    let response = await this.axios.get(`/unsubscribes/${encodeURIComponent(email)}`);
    return response.data;
  }

  async addUnsubscribe(email: string) {
    let response = await this.axios.post(`/unsubscribes/${encodeURIComponent(email)}`);
    return response.data;
  }

  async removeUnsubscribe(email: string) {
    let response = await this.axios.delete(`/unsubscribes/${encodeURIComponent(email)}`);
    return response.data;
  }

  // ── Webhooks ───────────────────────────────────────────

  async createWebhook(
    targetUrl: string,
    type?: string,
    options?: {
      campaignId?: string;
      isFirst?: boolean;
    }
  ) {
    let response = await this.axios.post(
      '/hooks',
      { targetUrl, type },
      {
        params: options
      }
    );
    return response.data;
  }

  async listWebhooks() {
    let response = await this.axios.get('/hooks');
    return response.data;
  }

  async deleteWebhook(hookId: string) {
    let response = await this.axios.delete(`/hooks/${hookId}`);
    return response.data;
  }

  // ── Team & Users ───────────────────────────────────────

  async getTeam() {
    let response = await this.axios.get('/team');
    return response.data;
  }

  async getTeamCredits() {
    let response = await this.axios.get('/team/credits');
    return response.data;
  }

  async getTeamSenders(state?: string) {
    let response = await this.axios.get('/team/senders', {
      params: state ? { state } : undefined
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  // ── People Database ────────────────────────────────────

  async searchPeople(params: {
    filters?: Array<{ filterId: string; in?: string[]; out?: string[] }>;
    page?: number;
    size?: number;
    search?: string;
  }) {
    let response = await this.axios.post('/database/people', params);
    return response.data;
  }

  async searchCompanies(params: {
    filters?: Array<{ filterId: string; in?: string[]; out?: string[] }>;
    page?: number;
    size?: number;
    search?: string;
  }) {
    let response = await this.axios.post('/database/companies', params);
    return response.data;
  }

  async getDatabaseFilters() {
    let response = await this.axios.get('/database/filters');
    return response.data;
  }
}
