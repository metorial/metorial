import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord
} from 'slates';
import { readBidsketchList, readBidsketchRecord } from './response';

let BASE_URL = 'https://bidsketch.com/api/v1';

export class BidsketchClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError('A Bidsketch API token is required.', {
        reason: 'missing_api_token'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30000,
      authHeader: { value: `Token token="${token}"` },
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Bidsketch',
          reason: 'bidsketch_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
    this.axios.interceptors.request.use(request => {
      for (let field of ['page', 'per_page']) {
        let value = request.params?.[field];
        if (
          value !== undefined &&
          (!Number.isSafeInteger(value) || value < 1 || (field === 'per_page' && value > 100))
        ) {
          throw createApiServiceError(
            `Bidsketch ${field} must be a positive whole number${field === 'per_page' ? ' up to 100' : ''}.`,
            { reason: 'invalid_pagination' }
          );
        }
      }
      return request;
    });
    this.axios.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.errors !== undefined) {
        throw createApiServiceError(
          `Bidsketch rejected the request: ${extractApiErrorMessage(response.data)}`,
          { reason: 'bidsketch_api_error', upstreamStatus: response.status }
        );
      }
      return response;
    });
  }

  private id(value: number) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw createApiServiceError('Bidsketch resource IDs must be positive whole numbers.', {
        reason: 'invalid_resource_id'
      });
    }
    return value;
  }

  private validateNewFee(data: Record<string, unknown>) {
    if (data.feetype === 'custom' && (typeof data.unit !== 'string' || !data.unit.trim())) {
      throw createApiServiceError(
        'Provide a unit label when creating a custom Bidsketch fee.',
        {
          reason: 'missing_custom_fee_unit'
        }
      );
    }
    if (data.unit !== undefined && data.feetype !== 'custom') {
      throw createApiServiceError('A Bidsketch unit label can only be set for custom fees.', {
        reason: 'invalid_fee_unit'
      });
    }
  }

  // ── Clients ──

  async listClients(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/clients.json', { params });
    return readBidsketchList(response.data);
  }

  async getClient(clientId: number) {
    let response = await this.axios.get(`/clients/${this.id(clientId)}.json`);
    return readBidsketchRecord(response.data);
  }

  async createClient(data: Record<string, unknown>) {
    let response = await this.axios.post('/clients.json', data);
    return readBidsketchRecord(response.data);
  }

  async updateClient(clientId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/clients/${this.id(clientId)}.json`, data);
    return readBidsketchRecord(response.data);
  }

  async deleteClient(clientId: number) {
    await this.axios.delete(`/clients/${this.id(clientId)}.json`);
  }

  async getClientProposals(clientId: number, page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get(`/clients/${this.id(clientId)}/proposals.json`, {
      params
    });
    return readBidsketchList(response.data);
  }

  // ── Proposals ──

  async listProposals(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/proposals.json', { params });
    return readBidsketchList(response.data);
  }

  async getProposal(proposalId: number) {
    let response = await this.axios.get(`/proposals/${this.id(proposalId)}.json`);
    return readBidsketchRecord(response.data);
  }

  async getProposalContent(proposalId: number) {
    let response = await this.axios.get(`/proposals/${this.id(proposalId)}/content.json`);
    return readBidsketchRecord(response.data);
  }

  async getProposalStats() {
    let response = await this.axios.get('/proposals/stats.json');
    return readBidsketchRecord(response.data);
  }

  async createProposal(data: Record<string, unknown>) {
    let response = await this.axios.post('/proposals.json', data);
    return readBidsketchRecord(response.data);
  }

  async createProposalFromTemplate(templateId: number, data: Record<string, unknown>) {
    let response = await this.axios.post(
      `/templates/${this.id(templateId)}/proposals.json`,
      data
    );
    return readBidsketchRecord(response.data);
  }

  async updateProposal(proposalId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/proposals/${this.id(proposalId)}.json`, data);
    return readBidsketchRecord(response.data);
  }

  async deleteProposal(proposalId: number) {
    await this.axios.delete(`/proposals/${this.id(proposalId)}.json`);
  }

  // ── Proposal Sections ──

  async listProposalSections(proposalId: number, sectionType?: 'opening' | 'closing') {
    let path = sectionType
      ? `/proposals/${this.id(proposalId)}/sections/${sectionType}.json`
      : `/proposals/${this.id(proposalId)}/sections.json`;
    let response = await this.axios.get(path);
    return readBidsketchList(response.data);
  }

  async getProposalSection(proposalId: number, sectionId: number) {
    let response = await this.axios.get(
      `/proposals/${this.id(proposalId)}/sections/${this.id(sectionId)}.json`
    );
    return readBidsketchRecord(response.data);
  }

  async createProposalSection(proposalId: number, data: Record<string, unknown>) {
    let response = await this.axios.post(
      `/proposals/${this.id(proposalId)}/sections.json`,
      data
    );
    return readBidsketchRecord(response.data);
  }

  async updateProposalSection(
    proposalId: number,
    sectionId: number,
    data: Record<string, unknown>
  ) {
    let response = await this.axios.put(
      `/proposals/${this.id(proposalId)}/sections/${this.id(sectionId)}.json`,
      data
    );
    return readBidsketchRecord(response.data);
  }

  async deleteProposalSection(proposalId: number, sectionId: number) {
    await this.axios.delete(
      `/proposals/${this.id(proposalId)}/sections/${this.id(sectionId)}.json`
    );
  }

  // ── Proposal Fees ──

  async listProposalFees(proposalId: number) {
    let response = await this.axios.get(`/proposals/${this.id(proposalId)}/fees.json`);
    return readBidsketchList(response.data);
  }

  async getProposalFee(proposalId: number, feeId: number) {
    let response = await this.axios.get(
      `/proposals/${this.id(proposalId)}/fees/${this.id(feeId)}.json`
    );
    return readBidsketchRecord(response.data);
  }

  async createProposalFee(proposalId: number, data: Record<string, unknown>) {
    this.validateNewFee(data);
    let response = await this.axios.post(`/proposals/${this.id(proposalId)}/fees.json`, data);
    return readBidsketchRecord(response.data);
  }

  async updateProposalFee(proposalId: number, feeId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(
      `/proposals/${this.id(proposalId)}/fees/${this.id(feeId)}.json`,
      data
    );
    return readBidsketchRecord(response.data);
  }

  async deleteProposalFee(proposalId: number, feeId: number) {
    await this.axios.delete(`/proposals/${this.id(proposalId)}/fees/${this.id(feeId)}.json`);
  }

  // ── Reusable Fees ──

  async listFees(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/fees.json', { params });
    return readBidsketchList(response.data);
  }

  async getFee(feeId: number) {
    let response = await this.axios.get(`/fees/${this.id(feeId)}.json`);
    return readBidsketchRecord(response.data);
  }

  async createFee(data: Record<string, unknown>) {
    this.validateNewFee(data);
    let response = await this.axios.post('/fees.json', data);
    return readBidsketchRecord(response.data);
  }

  async updateFee(feeId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/fees/${this.id(feeId)}.json`, data);
    return readBidsketchRecord(response.data);
  }

  async deleteFee(feeId: number) {
    await this.axios.delete(`/fees/${this.id(feeId)}.json`);
  }

  // ── Reusable Sections ──

  async listSections(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/sections.json', { params });
    return readBidsketchList(response.data);
  }

  async getSection(sectionId: number) {
    let response = await this.axios.get(`/sections/${this.id(sectionId)}.json`);
    return readBidsketchRecord(response.data);
  }

  async createSection(data: Record<string, unknown>) {
    let response = await this.axios.post('/sections.json', data);
    return readBidsketchRecord(response.data);
  }

  async updateSection(sectionId: number, data: Record<string, unknown>) {
    let response = await this.axios.put(`/sections/${this.id(sectionId)}.json`, data);
    return readBidsketchRecord(response.data);
  }

  async deleteSection(sectionId: number) {
    await this.axios.delete(`/sections/${this.id(sectionId)}.json`);
  }

  // ── Templates ──

  async listTemplates(page?: number, perPage?: number) {
    let params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/templates.json', { params });
    return readBidsketchList(response.data);
  }

  async getTemplate(templateId: number) {
    let response = await this.axios.get(`/templates/${this.id(templateId)}.json`);
    return readBidsketchRecord(response.data);
  }

  // ── Webhooks ──

  async createWebhook(event: string, endpoint: string) {
    let response = await this.axios.post('/webhooks.json', { event, endpoint });
    return readBidsketchRecord(response.data);
  }

  async deleteWebhook(webhookId: number) {
    await this.axios.delete(`/webhooks/${this.id(webhookId)}.json`);
  }
}
