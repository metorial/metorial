import { createAxios } from 'slates';

export class DocsClient {
  private http: ReturnType<typeof createAxios>;

  constructor(apiKey: string) {
    let encoded = btoa(`${apiKey}:X`);
    this.http = createAxios({
      baseURL: 'https://docsapi.helpscout.net/v1',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Sites ──────────────────────────────────────────────────

  async listSites(params: { page?: number } = {}) {
    let response = await this.http.get('/sites', { params });
    return response.data;
  }

  async getSite(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}`);
    return response.data;
  }

  // ─── Collections ────────────────────────────────────────────

  async listCollections(siteId: string, params: { page?: number } = {}) {
    let response = await this.http.get(`/collections`, {
      params: { ...params, siteId }
    });
    return response.data;
  }

  async getCollection(collectionId: string) {
    let response = await this.http.get(`/collections/${collectionId}`);
    return response.data;
  }

  async createCollection(data: {
    siteId: string;
    name: string;
    visibility?: string;
    description?: string;
  }) {
    let response = await this.http.post('/collections', data);
    return response.data;
  }

  async updateCollection(
    collectionId: string,
    data: {
      name?: string;
      visibility?: string;
      description?: string;
    }
  ) {
    let response = await this.http.put(`/collections/${collectionId}`, data);
    return response.data;
  }

  async deleteCollection(collectionId: string) {
    await this.http.delete(`/collections/${collectionId}`);
  }

  // ─── Categories ─────────────────────────────────────────────

  async listCategories(collectionId: string, params: { page?: number } = {}) {
    let response = await this.http.get(`/collections/${collectionId}/categories`, { params });
    return response.data;
  }

  async getCategory(categoryId: string) {
    let response = await this.http.get(`/categories/${categoryId}`);
    return response.data;
  }

  async createCategory(
    collectionId: string,
    data: {
      name: string;
      description?: string;
      order?: number;
    }
  ) {
    let response = await this.http.post(`/collections/${collectionId}/categories`, data);
    return response.data;
  }

  async updateCategory(
    categoryId: string,
    data: {
      name?: string;
      description?: string;
      order?: number;
    }
  ) {
    let response = await this.http.put(`/categories/${categoryId}`, data);
    return response.data;
  }

  async deleteCategory(categoryId: string) {
    await this.http.delete(`/categories/${categoryId}`);
  }

  // ─── Articles ───────────────────────────────────────────────

  async listArticles(
    collectionId: string,
    params: {
      page?: number;
      status?: string;
      categoryId?: string;
    } = {}
  ) {
    let response = await this.http.get(`/collections/${collectionId}/articles`, { params });
    return response.data;
  }

  async getArticle(articleId: string) {
    let response = await this.http.get(`/articles/${articleId}`);
    return response.data;
  }

  async createArticle(
    collectionId: string,
    data: {
      name: string;
      text: string;
      categoryIds?: string[];
      status?: string;
      slug?: string;
    }
  ) {
    let response = await this.http.post(`/collections/${collectionId}/articles`, data);
    return response.data;
  }

  async updateArticle(
    articleId: string,
    data: {
      name?: string;
      text?: string;
      categoryIds?: string[];
      status?: string;
      slug?: string;
    }
  ) {
    let response = await this.http.put(`/articles/${articleId}`, data);
    return response.data;
  }

  async deleteArticle(articleId: string) {
    await this.http.delete(`/articles/${articleId}`);
  }

  async searchArticles(
    query: string,
    params: {
      collectionId?: string;
      page?: number;
      status?: string;
    } = {}
  ) {
    let response = await this.http.get('/search/articles', {
      params: { query, ...params }
    });
    return response.data;
  }
}
