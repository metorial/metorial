import { createAxios } from 'slates';

export class CmsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.cms.optimizely.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Content Items
  async listContent(params?: {
    page?: number;
    pageSize?: number;
    contentType?: string;
    parentKey?: string;
  }) {
    let response = await this.axios.get('/api/content', { params });
    return response.data;
  }

  async getContent(contentKey: string, params?: { locale?: string; version?: string }) {
    let response = await this.axios.get(`/api/content/${contentKey}`, { params });
    return response.data;
  }

  async createContent(data: {
    name: string;
    contentType: string;
    parentKey?: string;
    locale?: string;
    properties?: Record<string, any>;
    status?: string;
  }) {
    let response = await this.axios.post('/api/content', data);
    return response.data;
  }

  async updateContent(
    contentKey: string,
    data: {
      name?: string;
      properties?: Record<string, any>;
      status?: string;
    }
  ) {
    let response = await this.axios.patch(`/api/content/${contentKey}`, data);
    return response.data;
  }

  async deleteContent(contentKey: string) {
    let response = await this.axios.delete(`/api/content/${contentKey}`);
    return response.data;
  }

  async publishContent(contentKey: string) {
    let response = await this.axios.put(`/api/content/${contentKey}/publish`);
    return response.data;
  }

  // Content Types
  async listContentTypes(params?: { page?: number; pageSize?: number }) {
    let response = await this.axios.get('/api/contenttypes', { params });
    return response.data;
  }

  async getContentType(contentTypeKey: string) {
    let response = await this.axios.get(`/api/contenttypes/${contentTypeKey}`);
    return response.data;
  }

  // Sites
  async listSites() {
    let response = await this.axios.get('/api/sites');
    return response.data;
  }

  async getSite(siteId: string) {
    let response = await this.axios.get(`/api/sites/${siteId}`);
    return response.data;
  }
}
