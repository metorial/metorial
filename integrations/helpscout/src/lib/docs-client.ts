import { createAxios } from 'slates';
import { withHelpScoutErrorHandling } from './errors';

export class DocsClient {
  private http: ReturnType<typeof createAxios>;

  constructor(apiKey: string) {
    let encoded = btoa(`${apiKey}:X`);
    this.http = withHelpScoutErrorHandling(
      createAxios({
        baseURL: 'https://docsapi.helpscout.net/v1',
        headers: {
          Authorization: `Basic ${encoded}`,
          'Content-Type': 'application/json'
        }
      }),
      'Docs API request'
    );
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

  // https://developer.helpscout.com/docs-api/collections/list/
  async listCollections(params: { siteId?: string; page?: number } = {}) {
    let response = await this.http.get('/collections', { params });
    return response.data;
  }

  async getCollection(collectionId: string) {
    let response = await this.http.get(`/collections/${collectionId}`);
    return response.data;
  }

  // https://developer.helpscout.com/docs-api/collections/create/
  async createCollection(data: {
    siteId: string;
    name: string;
    visibility?: string;
    description?: string;
    order?: number;
  }) {
    let response = await this.http.post('/collections', data, { params: { reload: true } });
    return response.data;
  }

  // https://developer.helpscout.com/docs-api/collections/update/
  async updateCollection(
    collectionId: string,
    data: {
      name: string;
      visibility?: string;
      description?: string;
      order?: number;
    }
  ) {
    let response = await this.http.put(`/collections/${collectionId}`, data, {
      params: { reload: true }
    });
    return response.data;
  }

  async deleteCollection(collectionId: string) {
    await this.http.delete(`/collections/${collectionId}`);
  }

  // ─── Categories ─────────────────────────────────────────────

  // https://developer.helpscout.com/docs-api/categories/list/
  async listCategories(collectionId: string, params: { page?: number } = {}) {
    let response = await this.http.get(`/collections/${collectionId}/categories`, { params });
    return response.data;
  }

  async getCategory(categoryId: string) {
    let response = await this.http.get(`/categories/${categoryId}`);
    return response.data;
  }

  // https://developer.helpscout.com/docs-api/categories/create/
  async createCategory(data: {
    collectionId: string;
    name: string;
    slug?: string;
    visibility?: string;
    order?: number;
  }) {
    let response = await this.http.post('/categories', data, { params: { reload: true } });
    return response.data;
  }

  // https://developer.helpscout.com/docs-api/categories/update/
  async updateCategory(
    categoryId: string,
    data: {
      name: string;
      slug?: string;
      visibility?: string;
      order?: number;
      defaultSort?: string;
    }
  ) {
    let response = await this.http.put(`/categories/${categoryId}`, data, {
      params: { reload: true }
    });
    return response.data;
  }

  async deleteCategory(categoryId: string) {
    await this.http.delete(`/categories/${categoryId}`);
  }

  // ─── Articles ───────────────────────────────────────────────

  // Articles can be listed per collection or per category.
  // https://developer.helpscout.com/docs-api/articles/list/
  async listArticles(
    parent: { collectionId?: string; categoryId?: string },
    params: {
      page?: number;
      status?: string;
    } = {}
  ) {
    let path = parent.categoryId
      ? `/categories/${parent.categoryId}/articles`
      : `/collections/${parent.collectionId}/articles`;
    let response = await this.http.get(path, { params });
    return response.data;
  }

  async getArticle(articleId: string) {
    let response = await this.http.get(`/articles/${articleId}`);
    return response.data;
  }

  // https://developer.helpscout.com/docs-api/articles/create/
  async createArticle(data: {
    collectionId: string;
    name: string;
    text: string;
    categories?: string[];
    status?: string;
    slug?: string;
  }) {
    let response = await this.http.post('/articles', data, { params: { reload: true } });
    return response.data;
  }

  // https://developer.helpscout.com/docs-api/articles/update/
  async updateArticle(
    articleId: string,
    data: {
      name?: string;
      text?: string;
      categories?: string[];
      status?: string;
      slug?: string;
    }
  ) {
    let response = await this.http.put(`/articles/${articleId}`, data, {
      params: { reload: true }
    });
    return response.data;
  }

  async deleteArticle(articleId: string) {
    await this.http.delete(`/articles/${articleId}`);
  }

  // https://developer.helpscout.com/docs-api/articles/search/
  async searchArticles(
    query: string,
    params: {
      collectionId?: string;
      siteId?: string;
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
