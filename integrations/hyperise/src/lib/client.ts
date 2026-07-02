import { createAxios } from 'slates';

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get axios() {
    return createAxios({
      baseURL: 'https://app.hyperise.io/api/v1/regular'
    });
  }

  private authParams(extra?: Record<string, string | undefined>) {
    let params: Record<string, string> = { api_token: this.token };
    if (extra) {
      for (let [key, value] of Object.entries(extra)) {
        if (value !== undefined) {
          params[key] = value;
        }
      }
    }
    return params;
  }

  // ── User ──────────────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.axios.get('/users/current', {
      params: this.authParams()
    });
    return response.data;
  }

  // ── Image Templates ───────────────────────────────────────────

  async listTemplates() {
    let response = await this.axios.get('/image-templates', {
      params: this.authParams()
    });
    return response.data;
  }

  // ── Prospect / Business Data ──────────────────────────────────

  async listProspects() {
    let response = await this.axios.get('/businesses', {
      params: this.authParams()
    });
    return response.data;
  }

  async getProspect(prospectId: string) {
    let response = await this.axios.get(`/businesses/${prospectId}`, {
      params: this.authParams()
    });
    return response.data;
  }

  async createProspect(data: Record<string, unknown>) {
    let response = await this.axios.post('/businesses', data, {
      params: this.authParams()
    });
    return response.data;
  }

  async updateProspect(prospectId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/businesses/${prospectId}`, data, {
      params: this.authParams()
    });
    return response.data;
  }

  async deleteProspect(prospectId: string) {
    let response = await this.axios.delete(`/businesses/${prospectId}`, {
      params: this.authParams()
    });
    return response.data;
  }

  // ── Personalised Short Links ──────────────────────────────────

  async createShortLink(data: {
    image_hash: string;
    url: string;
    title: string;
    desc: string;
    query_params?: Record<string, string>;
  }) {
    let response = await this.axios.post('/short-links', data, {
      params: this.authParams()
    });
    return response.data;
  }

  // ── Data Enrichment ───────────────────────────────────────────

  async enrichData(email: string, imageHash?: string) {
    let params: Record<string, string | undefined> = {
      email,
      image_hash: imageHash
    };
    let response = await this.axios.get('/data-enrichment', {
      params: this.authParams(params)
    });
    return response.data;
  }

  // ── Image Impressions ─────────────────────────────────────────

  async listImageImpressions(imageHash: string, dateFrom?: string) {
    let params: Record<string, string | undefined> = {
      image_hash: imageHash,
      date_from: dateFrom
    };
    let response = await this.axios.get('/image-impressions', {
      params: this.authParams(params)
    });
    return response.data;
  }

  // ── Client Accounts (Agency) ──────────────────────────────────

  async createClientAccount(data: { business_id: string; name: string; email: string }) {
    let response = await this.axios.post('/clients', data, {
      params: this.authParams()
    });
    return response.data;
  }
}
