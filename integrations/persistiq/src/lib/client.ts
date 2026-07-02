import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.persistiq.com/v1',
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Leads ──────────────────────────────────────────────────

  async listLeads(options?: { page?: number }) {
    let params: Record<string, string> = {};
    if (options?.page !== undefined) {
      params.page = String(options.page);
    }
    let response = await this.axios.get('/leads', { params });
    return response.data;
  }

  async getLead(leadId: string) {
    let response = await this.axios.get(`/leads/${leadId}`);
    return response.data;
  }

  async createLeads(leads: Record<string, unknown>[], creatorId?: string) {
    let body: Record<string, unknown> = { leads };
    if (creatorId) {
      body.creator_id = creatorId;
    }
    let response = await this.axios.post('/leads', body);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/leads/${leadId}`, { data });
    return response.data;
  }

  // ── Lead Statuses ──────────────────────────────────────────

  async listLeadStatuses() {
    let response = await this.axios.get('/lead_statuses');
    return response.data;
  }

  // ── Lead Fields ────────────────────────────────────────────

  async listLeadFields() {
    let response = await this.axios.get('/lead_fields');
    return response.data;
  }

  // ── Campaigns ──────────────────────────────────────────────

  async listCampaigns(options?: { page?: number }) {
    let params: Record<string, string> = {};
    if (options?.page !== undefined) {
      params.page = String(options.page);
    }
    let response = await this.axios.get('/campaigns', { params });
    return response.data;
  }

  async createCampaign(name: string) {
    let response = await this.axios.post('/campaigns', { name });
    return response.data;
  }

  async deleteCampaign(campaignId: string) {
    let response = await this.axios.delete(`/campaigns/${campaignId}`);
    return response.data;
  }

  async addLeadToCampaign(campaignId: string, leadId: string, mailboxId: string) {
    let response = await this.axios.post(`/campaigns/${campaignId}`, {
      leads: [{ id: leadId }],
      mailbox_id: mailboxId
    });
    return response.data;
  }

  async removeLeadFromCampaign(campaignId: string, leadId: string) {
    let response = await this.axios.delete(`/campaigns/${campaignId}`, {
      data: {
        leads: [{ id: leadId }]
      }
    });
    return response.data;
  }

  // ── Users ──────────────────────────────────────────────────

  async listUsers() {
    let response = await this.axios.get('/users');
    return response.data;
  }

  // ── DNC Domains ────────────────────────────────────────────

  async addDncDomain(domain: string) {
    let response = await this.axios.post('/dnc_domains', { domain });
    return response.data;
  }

  async listDncDomains() {
    let response = await this.axios.get('/dnc_domains');
    return response.data;
  }

  // ── Prospect Status ────────────────────────────────────────

  async updateProspectStatus(leadId: string, status: string) {
    let response = await this.axios.put(`/leads/${leadId}`, { status });
    return response.data;
  }
}
