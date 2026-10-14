import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Hyperise API token is required. Reconnect your account.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.hyperise.io/api/v1/regular',
      params: { api_token: config.token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Hyperise',
          reason: 'hyperise_api_error'
        })
    });
  }

  async getCurrentUser() {
    let response = await this.axios.get('/users/current');
    return response.data;
  }

  async listTemplates() {
    let response = await this.axios.get('/image-templates');
    return response.data;
  }

  async listProspects() {
    let response = await this.axios.get('/businesses');
    return response.data;
  }

  async getProspect(prospectId: string) {
    let response = await this.axios.get(`/businesses/${encodeURIComponent(prospectId)}`);
    return response.data;
  }

  async createProspect(data: Record<string, unknown>) {
    let response = await this.axios.post('/businesses', data);
    return response.data;
  }

  async updateProspect(prospectId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/businesses/${encodeURIComponent(prospectId)}`, data);
    return response.data;
  }

  async deleteProspect(prospectId: string) {
    let response = await this.axios.delete(`/businesses/${encodeURIComponent(prospectId)}`);
    return response.data;
  }

  async createShortLink(data: {
    image_hash: string;
    url: string;
    title: string;
    desc: string;
    query_params?: Record<string, string>;
  }) {
    let response = await this.axios.post('/short-links', data);
    return response.data;
  }

  async enrichData(email: string, imageHash?: string) {
    let response = await this.axios.get('/data-enrichment', {
      params: pickDefined({ email, image_hash: imageHash })
    });
    return response.data;
  }

  async listImageImpressions(imageHash: string, dateFrom?: string) {
    let response = await this.axios.get('/image-impressions', {
      params: pickDefined({ image_hash: imageHash, date_from: dateFrom })
    });
    return response.data;
  }

  async createClientAccount(data: { business_id: string; name: string; email: string }) {
    let response = await this.axios.post('/clients', data);
    return response.data;
  }

  async createClientOrganization(data: { name: string; email: string; seats: number }) {
    let response = await this.axios.post('/organizations', data);
    return response.data;
  }
}
