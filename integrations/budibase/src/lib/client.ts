import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; baseUrl: string; appId?: string }) {
    let headers: Record<string, string> = {
      'x-budibase-api-key': params.token,
      'Content-Type': 'application/json'
    };
    if (params.appId) {
      headers['x-budibase-app-id'] = params.appId;
    }

    this.axios = createAxios({
      baseURL: params.baseUrl,
      headers
    });
  }

  // ── Applications ──

  async createApplication(data: { name: string; url?: string }): Promise<any> {
    let res = await this.axios.post('/applications', data);
    return res.data.data;
  }

  async getApplication(appId: string): Promise<any> {
    let res = await this.axios.get(`/applications/${appId}`);
    return res.data.data;
  }

  async updateApplication(appId: string, data: { name?: string; url?: string }): Promise<any> {
    let res = await this.axios.put(`/applications/${appId}`, data);
    return res.data.data;
  }

  async deleteApplication(appId: string): Promise<void> {
    await this.axios.delete(`/applications/${appId}`);
  }

  async searchApplications(body: { name?: string } = {}): Promise<any[]> {
    let res = await this.axios.post('/applications/search', body);
    return res.data.data || [];
  }

  async publishApplication(appId: string): Promise<any> {
    let res = await this.axios.post(`/applications/${appId}/publish`);
    return res.data.data;
  }

  async unpublishApplication(appId: string): Promise<void> {
    await this.axios.post(`/applications/${appId}/unpublish`);
  }

  // ── Tables ──

  async createTable(data: {
    name: string;
    primaryDisplay?: string;
    schema?: Record<string, any>;
  }): Promise<any> {
    let res = await this.axios.post('/tables', data);
    return res.data.data;
  }

  async getTable(tableId: string): Promise<any> {
    let res = await this.axios.get(`/tables/${tableId}`);
    return res.data.data;
  }

  async updateTable(
    tableId: string,
    data: { name?: string; primaryDisplay?: string; schema?: Record<string, any> }
  ): Promise<any> {
    let res = await this.axios.put(`/tables/${tableId}`, { _id: tableId, ...data });
    return res.data.data;
  }

  async deleteTable(tableId: string): Promise<void> {
    await this.axios.delete(`/tables/${tableId}`);
  }

  async searchTables(body: { name?: string } = {}): Promise<any[]> {
    let res = await this.axios.post('/tables/search', body);
    return res.data.data || [];
  }

  // ── Rows ──

  async createRow(tableId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.post(`/tables/${tableId}/rows`, data);
    return res.data.data;
  }

  async getRow(tableId: string, rowId: string): Promise<any> {
    let res = await this.axios.get(`/tables/${tableId}/rows/${rowId}`);
    return res.data.data;
  }

  async updateRow(tableId: string, rowId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/tables/${tableId}/rows/${rowId}`, data);
    return res.data.data;
  }

  async deleteRow(tableId: string, rowId: string): Promise<void> {
    await this.axios.delete(`/tables/${tableId}/rows/${rowId}`);
  }

  async searchRows(
    tableId: string,
    body: {
      query?: Record<string, any>;
      paginate?: boolean;
      bookmark?: string | number;
      limit?: number;
      sort?: {
        column?: string;
        order?: 'ascending' | 'descending';
        type?: 'string' | 'number';
      };
    } = {}
  ): Promise<{ rows: any[]; bookmark?: string | number; hasNextPage?: boolean }> {
    let res = await this.axios.post(`/tables/${tableId}/rows/search`, body);
    return {
      rows: res.data.data || [],
      bookmark: res.data.bookmark,
      hasNextPage: res.data.hasNextPage
    };
  }

  // ── Users ──

  async createUser(data: {
    email: string;
    password?: string;
    status?: string;
    firstName?: string;
    lastName?: string;
    forceResetPassword?: boolean;
    builder?: { global?: boolean };
    admin?: { global?: boolean };
    roles?: Record<string, string>;
  }): Promise<any> {
    let res = await this.axios.post('/users', data);
    return res.data.data;
  }

  async getUser(userId: string): Promise<any> {
    let res = await this.axios.get(`/users/${userId}`);
    return res.data.data;
  }

  async updateUser(
    userId: string,
    data: {
      email?: string;
      password?: string;
      status?: string;
      firstName?: string;
      lastName?: string;
      forceResetPassword?: boolean;
      builder?: { global?: boolean };
      admin?: { global?: boolean };
      roles?: Record<string, string>;
    }
  ): Promise<any> {
    let res = await this.axios.put(`/users/${userId}`, data);
    return res.data.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(`/users/${userId}`);
  }

  async searchUsers(body: { name?: string } = {}): Promise<any[]> {
    let res = await this.axios.post('/users/search', body);
    return res.data.data || [];
  }

  // ── Queries ──

  async searchQueries(body: { name?: string } = {}): Promise<any[]> {
    let res = await this.axios.post('/queries/search', body);
    return res.data.data || [];
  }

  async executeQuery(queryId: string, parameters?: Record<string, string>): Promise<any> {
    let res = await this.axios.post(`/queries/${queryId}`, { parameters: parameters || {} });
    return res.data.data;
  }
}
