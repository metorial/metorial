import { createAxios } from 'slates';

export class ParmaClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://app.parma.ai/api/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ─── Users ──────────────────────────────────────────────────────

  async getMe() {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  // ─── Relationships ──────────────────────────────────────────────

  async listRelationships(
    params: {
      page?: number;
      perPage?: number;
      query?: string;
      sort?: string;
      order?: string;
    } = {}
  ) {
    let queryParams: Record<string, any> = {};
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.perPage !== undefined) queryParams.per_page = params.perPage;
    if (params.query !== undefined) queryParams.q = params.query;
    if (params.sort !== undefined) queryParams.sort = params.sort;
    if (params.order !== undefined) queryParams.order = params.order;

    let response = await this.http.get('/relationships', { params: queryParams });
    return response.data;
  }

  async getRelationship(relationshipId: string) {
    let response = await this.http.get(`/relationships/${relationshipId}`);
    return response.data;
  }

  async createRelationship(data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    notes?: string;
  }) {
    let response = await this.http.post('/relationships', data);
    return response.data;
  }

  async searchRelationships(
    query: string,
    params: {
      page?: number;
      perPage?: number;
    } = {}
  ) {
    let queryParams: Record<string, any> = { q: query };
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.perPage !== undefined) queryParams.per_page = params.perPage;

    let response = await this.http.get('/relationships', { params: queryParams });
    return response.data;
  }

  // ─── Notes ──────────────────────────────────────────────────────

  async createNote(
    relationshipId: string,
    data: {
      content: string;
    }
  ) {
    let response = await this.http.post(`/relationships/${relationshipId}/notes`, data);
    return response.data;
  }

  async listNotes(
    relationshipId: string,
    params: {
      page?: number;
      perPage?: number;
    } = {}
  ) {
    let queryParams: Record<string, any> = {};
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.perPage !== undefined) queryParams.per_page = params.perPage;

    let response = await this.http.get(`/relationships/${relationshipId}/notes`, {
      params: queryParams
    });
    return response.data;
  }
}
