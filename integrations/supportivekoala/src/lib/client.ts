import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.supportivekoala.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Templates ──────────────────────────────────────────────

  async createTemplate(data: {
    name: string;
    width?: number;
    height?: number;
    params?: Record<string, unknown>[];
  }) {
    let response = await this.axios.post('/templates', data);
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      width?: number;
      height?: number;
      params?: Record<string, unknown>[];
    }
  ) {
    let response = await this.axios.post(`/templates/${templateId}`, data);
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data;
  }

  async listTemplates() {
    let response = await this.axios.get('/templates');
    return response.data;
  }

  // ── Images ─────────────────────────────────────────────────

  async createImage(data: {
    template: string;
    params?: Record<string, unknown>;
    format?: 'png' | 'jpeg' | 'webp';
  }) {
    let response = await this.axios.post('/images', data);
    return response.data;
  }

  async getImage(imageId: string) {
    let response = await this.axios.get(`/images/${imageId}`);
    return response.data;
  }

  async listImages() {
    let response = await this.axios.get('/images');
    return response.data;
  }
}
