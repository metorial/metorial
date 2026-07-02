import { createAxios } from 'slates';
import { generateAuthParams } from './signing';

let BASE_URL = 'https://api.classmarker.com';

export class ClassMarkerClient {
  private apiKey: string;
  private apiSecret: string;

  constructor(config: { token: string; apiSecret: string }) {
    this.apiKey = config.token;
    this.apiSecret = config.apiSecret;
  }

  private getAxios() {
    return createAxios({ baseURL: BASE_URL });
  }

  private getAuthParams(): { api_key: string; signature: string; timestamp: number } {
    return generateAuthParams(this.apiKey, this.apiSecret);
  }

  // ── Discovery ──

  async getGroupsLinksTests(): Promise<{
    status: string;
    groups: Array<{
      group_id: number;
      group_name: string;
      assigned_tests: Array<{ test_id: number; test_name: string }>;
    }>;
    links: Array<{
      link_id: number;
      link_name: string;
      link_url_id: string;
      access_list_id: number;
      assigned_tests: Array<{ test_id: number; test_name: string }>;
    }>;
  }> {
    let ax = this.getAxios();
    let response = await ax.get('/v1.json', { params: this.getAuthParams() });
    return response.data;
  }

  // ── Results ──

  async getGroupRecentResults(params: {
    finishedAfterTimestamp: number;
    limit?: number;
  }): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/v1/groups/recent_results.json', {
      params: { ...this.getAuthParams(), ...params }
    });
    return response.data;
  }

  async getLinkRecentResults(params: {
    finishedAfterTimestamp: number;
    limit?: number;
  }): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/v1/links/recent_results.json', {
      params: { ...this.getAuthParams(), ...params }
    });
    return response.data;
  }

  async getGroupTestResults(
    groupId: number,
    testId: number,
    params: {
      finishedAfterTimestamp: number;
      limit?: number;
    }
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/v1/groups/${groupId}/tests/${testId}/recent_results.json`, {
      params: { ...this.getAuthParams(), ...params }
    });
    return response.data;
  }

  async getLinkTestResults(
    linkId: number,
    testId: number,
    params: {
      finishedAfterTimestamp: number;
      limit?: number;
    }
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/v1/links/${linkId}/tests/${testId}/recent_results.json`, {
      params: { ...this.getAuthParams(), ...params }
    });
    return response.data;
  }

  // ── Categories ──

  async getCategories(): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/v1/categories.json', {
      params: this.getAuthParams()
    });
    return response.data;
  }

  async createParentCategory(name: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(
      '/v1/categories/parent_category.json',
      {
        parent_category_name: name
      },
      {
        params: this.getAuthParams()
      }
    );
    return response.data;
  }

  async updateParentCategory(parentCategoryId: number, name: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(
      `/v1/categories/parent_category/${parentCategoryId}.json`,
      {
        parent_category_name: name
      },
      {
        params: this.getAuthParams()
      }
    );
    return response.data;
  }

  async createSubcategory(name: string, parentCategoryId: number): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(
      '/v1/categories/category.json',
      {
        category_name: name,
        parent_category_id: parentCategoryId
      },
      {
        params: this.getAuthParams()
      }
    );
    return response.data;
  }

  async updateSubcategory(
    categoryId: number,
    data: {
      categoryName?: string;
      parentCategoryId?: number;
    }
  ): Promise<any> {
    let ax = this.getAxios();
    let body: Record<string, any> = {};
    if (data.categoryName !== undefined) body.category_name = data.categoryName;
    if (data.parentCategoryId !== undefined) body.parent_category_id = data.parentCategoryId;

    let response = await ax.put(`/v1/category/${categoryId}.json`, body, {
      params: this.getAuthParams()
    });
    return response.data;
  }

  // ── Questions ──

  async getQuestions(page?: number): Promise<any> {
    let ax = this.getAxios();
    let params: Record<string, any> = { ...this.getAuthParams() };
    if (page !== undefined) params.page = page;

    let response = await ax.get('/v1/questions.json', { params });
    return response.data;
  }

  async getQuestion(questionId: number): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/v1/questions/${questionId}.json`, {
      params: this.getAuthParams()
    });
    return response.data;
  }

  async createQuestion(data: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/v1/questions.json', data, {
      params: this.getAuthParams()
    });
    return response.data;
  }

  async updateQuestion(questionId: number, data: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/v1/questions/${questionId}.json`, data, {
      params: this.getAuthParams()
    });
    return response.data;
  }

  // ── Access Lists ──

  async addAccessCodes(accessListId: number, codes: string[]): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/v1/accesslists/${accessListId}.json`, codes, {
      params: this.getAuthParams()
    });
    return response.data;
  }

  async removeAccessCodes(accessListId: number, codes: string[]): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.delete(`/v1/accesslists/${accessListId}.json`, {
      params: this.getAuthParams(),
      data: codes
    });
    return response.data;
  }
}
