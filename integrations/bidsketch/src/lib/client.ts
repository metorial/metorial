import { createAxios } from 'slates';

let BASE_URL = 'https://bidsketch.com/api/v1';

export class BidsketchClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Token token="${token}"`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ── Clients ──

  async listClients(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;
    let response = await this.axios.get('/clients.json', { params });
    return response.data;
  }

  async getClient(clientId: number) {
    let response = await this.axios.get(`/clients/${clientId}.json`);
    return response.data;
  }

  async createClient(data: Record<string, unknown>) {
    let response = await this.axios.post('/clients.json', data);
    return response.data;
  }

  async updateClient(clientId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/clients/${clientId}.json`, data);
    return response.data;
  }

  async deleteClient(clientId: number) {
    await this.axios.delete(`/clients/${clientId}.json`);
  }

  async getClientProposals(clientId: number, page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;
    let response = await this.axios.get(`/clients/${clientId}/proposals.json`, { params });
    return response.data;
  }

  // ── Proposals ──

  async listProposals(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;
    let response = await this.axios.get('/proposals.json', { params });
    return response.data;
  }

  async getProposal(proposalId: number) {
    let response = await this.axios.get(`/proposals/${proposalId}.json`);
    return response.data;
  }

  async getProposalContent(proposalId: number) {
    let response = await this.axios.get(`/proposals/${proposalId}/content.json`);
    return response.data;
  }

  async getProposalStats() {
    let response = await this.axios.get('/proposals/stats.json');
    return response.data;
  }

  async createProposal(data: Record<string, unknown>) {
    let response = await this.axios.post('/proposals.json', data);
    return response.data;
  }

  async createProposalFromTemplate(templateId: number, data: Record<string, unknown>) {
    let response = await this.axios.post(`/templates/${templateId}/proposals.json`, data);
    return response.data;
  }

  async updateProposal(proposalId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/proposals/${proposalId}.json`, data);
    return response.data;
  }

  async deleteProposal(proposalId: number) {
    await this.axios.delete(`/proposals/${proposalId}.json`);
  }

  // ── Proposal Sections ──

  async listProposalSections(proposalId: number, sectionType?: 'opening' | 'closing') {
    let path = sectionType
      ? `/proposals/${proposalId}/sections/${sectionType}.json`
      : `/proposals/${proposalId}/sections.json`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async getProposalSection(proposalId: number, sectionId: number) {
    let response = await this.axios.get(`/proposals/${proposalId}/sections/${sectionId}.json`);
    return response.data;
  }

  async createProposalSection(proposalId: number, data: Record<string, unknown>) {
    let response = await this.axios.post(`/proposals/${proposalId}/sections.json`, data);
    return response.data;
  }

  async updateProposalSection(
    proposalId: number,
    sectionId: number,
    data: Record<string, unknown>
  ) {
    let response = await this.axios.put(
      `/proposals/${proposalId}/sections/${sectionId}.json`,
      data
    );
    return response.data;
  }

  async deleteProposalSection(proposalId: number, sectionId: number) {
    await this.axios.delete(`/proposals/${proposalId}/sections/${sectionId}.json`);
  }

  // ── Proposal Fees ──

  async listProposalFees(proposalId: number) {
    let response = await this.axios.get(`/proposals/${proposalId}/fees.json`);
    return response.data;
  }

  async getProposalFee(proposalId: number, feeId: number) {
    let response = await this.axios.get(`/proposals/${proposalId}/fees/${feeId}.json`);
    return response.data;
  }

  async createProposalFee(proposalId: number, data: Record<string, unknown>) {
    let response = await this.axios.post(`/proposals/${proposalId}/fees.json`, data);
    return response.data;
  }

  async updateProposalFee(proposalId: number, feeId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/proposals/${proposalId}/fees/${feeId}.json`, data);
    return response.data;
  }

  async deleteProposalFee(proposalId: number, feeId: number) {
    await this.axios.delete(`/proposals/${proposalId}/fees/${feeId}.json`);
  }

  // ── Reusable Fees ──

  async listFees(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;
    let response = await this.axios.get('/fees.json', { params });
    return response.data;
  }

  async getFee(feeId: number) {
    let response = await this.axios.get(`/fees/${feeId}.json`);
    return response.data;
  }

  async createFee(data: Record<string, unknown>) {
    let response = await this.axios.post('/fees.json', data);
    return response.data;
  }

  async updateFee(feeId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/fees/${feeId}.json`, data);
    return response.data;
  }

  async deleteFee(feeId: number) {
    await this.axios.delete(`/fees/${feeId}.json`);
  }

  // ── Reusable Sections ──

  async listSections(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;
    let response = await this.axios.get('/sections.json', { params });
    return response.data;
  }

  async getSection(sectionId: number) {
    let response = await this.axios.get(`/sections/${sectionId}.json`);
    return response.data;
  }

  async createSection(data: Record<string, unknown>) {
    let response = await this.axios.post('/sections.json', data);
    return response.data;
  }

  async updateSection(sectionId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/sections/${sectionId}.json`, data);
    return response.data;
  }

  async deleteSection(sectionId: number) {
    await this.axios.delete(`/sections/${sectionId}.json`);
  }

  // ── Templates ──

  async listTemplates(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;
    let response = await this.axios.get('/templates.json', { params });
    return response.data;
  }

  async getTemplate(templateId: number) {
    let response = await this.axios.get(`/templates/${templateId}.json`);
    return response.data;
  }

  // ── Webhooks ──

  async createWebhook(event: string, endpoint: string) {
    let response = await this.axios.post('/webhooks.json', { event, endpoint });
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    await this.axios.delete(`/webhooks/${webhookId}.json`);
  }
}
