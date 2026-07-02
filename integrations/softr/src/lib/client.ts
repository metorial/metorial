import { createAxios } from 'slates';

let studioAxios = createAxios({
  baseURL: 'https://studio-api.softr.io/v1/api'
});

let databaseAxios = createAxios({
  baseURL: 'https://tables-api.softr.io/api/v1'
});

export class StudioClient {
  private token: string;
  private domain: string;

  constructor(config: { token: string; domain: string }) {
    this.token = config.token;
    this.domain = config.domain;
  }

  private get headers() {
    return {
      'Softr-Api-Key': this.token,
      'Softr-Domain': this.domain,
      'Content-Type': 'application/json'
    };
  }

  async createUser(params: {
    fullName: string;
    email: string;
    password?: string;
    generateMagicLink?: boolean;
  }) {
    let response = await studioAxios.post(
      '/users',
      {
        full_name: params.fullName,
        email: params.email,
        password: params.password,
        generate_magic_link: params.generateMagicLink ?? false
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteUser(email: string) {
    let response = await studioAxios.delete(`/users/${encodeURIComponent(email)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async generateMagicLink(email: string) {
    let response = await studioAxios.post(
      `/users/magic-link/generate/${encodeURIComponent(email)}`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async syncUsers(emails?: string[]) {
    let body = emails && emails.length > 0 ? emails : undefined;
    let response = await studioAxios.post('/users/sync', body, {
      headers: this.headers
    });
    return response.data;
  }

  async validateToken(jwt: string) {
    let response = await studioAxios.post(
      '/users/validate-token',
      {
        jwt
      },
      {
        headers: {
          ...this.headers
        }
      }
    );
    return response.data;
  }
}

export class DatabaseClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      'Softr-Api-Key': this.token,
      'Content-Type': 'application/json'
    };
  }

  // --- Databases ---

  async listDatabases() {
    let response = await databaseAxios.get('/databases', {
      headers: this.headers
    });
    return response.data;
  }

  async getDatabase(databaseId: string) {
    let response = await databaseAxios.get(`/databases/${databaseId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createDatabase(params: { workspaceId: string; name: string; description?: string }) {
    let response = await databaseAxios.post('/databases', params, {
      headers: this.headers
    });
    return response.data;
  }

  async updateDatabase(databaseId: string, params: { name?: string; description?: string }) {
    let response = await databaseAxios.put(`/databases/${databaseId}`, params, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteDatabase(databaseId: string) {
    let response = await databaseAxios.delete(`/databases/${databaseId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Tables ---

  async listTables(databaseId: string) {
    let response = await databaseAxios.get(`/databases/${databaseId}/tables`, {
      headers: this.headers
    });
    return response.data;
  }

  async getTable(databaseId: string, tableId: string) {
    let response = await databaseAxios.get(`/databases/${databaseId}/tables/${tableId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTable(
    databaseId: string,
    params: {
      name: string;
      description?: string;
      primaryFieldName?: string;
      fields?: Array<{ name: string; type: string; options?: Record<string, unknown> }>;
    }
  ) {
    let response = await databaseAxios.post(`/databases/${databaseId}/tables`, params, {
      headers: this.headers
    });
    return response.data;
  }

  async updateTable(
    databaseId: string,
    tableId: string,
    params: { name?: string; description?: string }
  ) {
    let response = await databaseAxios.put(
      `/databases/${databaseId}/tables/${tableId}`,
      params,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteTable(databaseId: string, tableId: string) {
    let response = await databaseAxios.delete(`/databases/${databaseId}/tables/${tableId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Table Fields ---

  async getTableField(databaseId: string, tableId: string, fieldId: string) {
    let response = await databaseAxios.get(
      `/databases/${databaseId}/tables/${tableId}/fields/${fieldId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async addTableField(
    databaseId: string,
    tableId: string,
    params: {
      name: string;
      type: string;
      options?: Record<string, unknown>;
      description?: string;
      allowMultipleEntries?: boolean;
      required?: boolean;
      defaultValue?: string;
    }
  ) {
    let response = await databaseAxios.post(
      `/databases/${databaseId}/tables/${tableId}/fields`,
      params,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateTableField(
    databaseId: string,
    tableId: string,
    fieldId: string,
    params: {
      name?: string;
      type?: string;
      options?: Record<string, unknown>;
    }
  ) {
    let response = await databaseAxios.put(
      `/databases/${databaseId}/tables/${tableId}/fields/${fieldId}`,
      params,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteTableField(databaseId: string, tableId: string, fieldId: string) {
    let response = await databaseAxios.delete(
      `/databases/${databaseId}/tables/${tableId}/fields/${fieldId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Records ---

  async listRecords(
    databaseId: string,
    tableId: string,
    params?: {
      offset?: number;
      limit?: number;
      fieldNames?: boolean;
      viewId?: string;
    }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.fieldNames !== undefined) queryParams.fieldNames = String(params.fieldNames);
    if (params?.viewId) queryParams.viewId = params.viewId;

    let response = await databaseAxios.get(
      `/databases/${databaseId}/tables/${tableId}/records`,
      {
        headers: this.headers,
        params: queryParams
      }
    );
    return response.data;
  }

  async getRecord(
    databaseId: string,
    tableId: string,
    recordId: string,
    params?: {
      fieldNames?: boolean;
    }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.fieldNames !== undefined) queryParams.fieldNames = String(params.fieldNames);

    let response = await databaseAxios.get(
      `/databases/${databaseId}/tables/${tableId}/records/${recordId}`,
      {
        headers: this.headers,
        params: queryParams
      }
    );
    return response.data;
  }

  async createRecord(
    databaseId: string,
    tableId: string,
    fields: Record<string, unknown>,
    params?: {
      fieldNames?: boolean;
    }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.fieldNames !== undefined) queryParams.fieldNames = String(params.fieldNames);

    let response = await databaseAxios.post(
      `/databases/${databaseId}/tables/${tableId}/records`,
      { fields },
      {
        headers: this.headers,
        params: queryParams
      }
    );
    return response.data;
  }

  async updateRecord(
    databaseId: string,
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
    params?: {
      fieldNames?: boolean;
    }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.fieldNames !== undefined) queryParams.fieldNames = String(params.fieldNames);

    let response = await databaseAxios.patch(
      `/databases/${databaseId}/tables/${tableId}/records/${recordId}`,
      { fields },
      {
        headers: this.headers,
        params: queryParams
      }
    );
    return response.data;
  }

  async deleteRecord(databaseId: string, tableId: string, recordId: string) {
    let response = await databaseAxios.delete(
      `/databases/${databaseId}/tables/${tableId}/records/${recordId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async searchRecords(
    databaseId: string,
    tableId: string,
    params: {
      filter?: Record<string, unknown>;
      sort?: Array<{ sortingField: string; sortType: 'ASC' | 'DESC' }>;
      paging?: { offset?: number; limit?: number };
      fieldNames?: boolean;
    }
  ) {
    let queryParams: Record<string, string> = {};
    if (params.fieldNames !== undefined) queryParams.fieldNames = String(params.fieldNames);

    let body: Record<string, unknown> = {};
    if (params.filter) body.filter = params.filter;
    if (params.sort) body.sort = params.sort;
    if (params.paging) body.paging = params.paging;

    let response = await databaseAxios.post(
      `/databases/${databaseId}/tables/${tableId}/records/search`,
      body,
      {
        headers: this.headers,
        params: queryParams
      }
    );
    return response.data;
  }
}
