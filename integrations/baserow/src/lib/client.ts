import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  authType: 'database_token' | 'jwt';
  baseUrl: string;
}

export interface ListRowsParams {
  tableId: number;
  page?: number;
  size?: number;
  search?: string;
  orderBy?: string;
  filterType?: 'AND' | 'OR';
  filters?: Record<string, string>;
  viewId?: number;
  userFieldNames?: boolean;
  include?: string;
  exclude?: string;
}

export interface CreateRowParams {
  tableId: number;
  rows: Record<string, any>[];
  userFieldNames?: boolean;
}

export interface UpdateRowParams {
  tableId: number;
  rowId: number;
  data: Record<string, any>;
  userFieldNames?: boolean;
}

export interface BatchUpdateRowsParams {
  tableId: number;
  rows: { id: number; [key: string]: any }[];
  userFieldNames?: boolean;
}

export interface WebhookConfig {
  name: string;
  url: string;
  includeAllEvents?: boolean;
  events?: string[];
  requestMethod?: string;
  headers?: Record<string, string>;
  useUserFieldNames?: boolean;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let authHeader =
      config.authType === 'jwt' ? `JWT ${config.token}` : `Token ${config.token}`;

    this.http = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Row Operations ──

  async listRows(params: ListRowsParams): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.page) queryParams.page = params.page;
    if (params.size) queryParams.size = params.size;
    if (params.search) queryParams.search = params.search;
    if (params.orderBy) queryParams.order_by = params.orderBy;
    if (params.filterType) queryParams.filter_type = params.filterType;
    if (params.viewId) queryParams.view_id = params.viewId;
    if (params.userFieldNames !== undefined)
      queryParams.user_field_names = params.userFieldNames;
    if (params.include) queryParams.include = params.include;
    if (params.exclude) queryParams.exclude = params.exclude;

    if (params.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[key] = value;
      }
    }

    let response = await this.http.get(`/api/database/rows/table/${params.tableId}/`, {
      params: queryParams
    });
    return response.data;
  }

  async getRow(tableId: number, rowId: number, userFieldNames?: boolean): Promise<any> {
    let response = await this.http.get(`/api/database/rows/table/${tableId}/${rowId}/`, {
      params: userFieldNames !== undefined ? { user_field_names: userFieldNames } : {}
    });
    return response.data;
  }

  async createRows(params: CreateRowParams): Promise<any> {
    if (params.rows.length === 1) {
      let response = await this.http.post(
        `/api/database/rows/table/${params.tableId}/`,
        params.rows[0],
        {
          params:
            params.userFieldNames !== undefined
              ? { user_field_names: params.userFieldNames }
              : {}
        }
      );
      return [response.data];
    }

    let response = await this.http.post(
      `/api/database/rows/table/${params.tableId}/batch/`,
      {
        items: params.rows
      },
      {
        params:
          params.userFieldNames !== undefined
            ? { user_field_names: params.userFieldNames }
            : {}
      }
    );
    return response.data.items;
  }

  async updateRow(params: UpdateRowParams): Promise<any> {
    let response = await this.http.patch(
      `/api/database/rows/table/${params.tableId}/${params.rowId}/`,
      params.data,
      {
        params:
          params.userFieldNames !== undefined
            ? { user_field_names: params.userFieldNames }
            : {}
      }
    );
    return response.data;
  }

  async batchUpdateRows(params: BatchUpdateRowsParams): Promise<any> {
    let response = await this.http.patch(
      `/api/database/rows/table/${params.tableId}/batch/`,
      {
        items: params.rows
      },
      {
        params:
          params.userFieldNames !== undefined
            ? { user_field_names: params.userFieldNames }
            : {}
      }
    );
    return response.data.items;
  }

  async deleteRows(tableId: number, rowIds: number[]): Promise<void> {
    if (rowIds.length === 1) {
      await this.http.delete(`/api/database/rows/table/${tableId}/${rowIds[0]}/`);
      return;
    }

    await this.http.post(`/api/database/rows/table/${tableId}/batch-delete/`, {
      items: rowIds
    });
  }

  async moveRow(tableId: number, rowId: number, beforeId?: number): Promise<any> {
    let response = await this.http.patch(
      `/api/database/rows/table/${tableId}/${rowId}/move/`,
      null,
      {
        params: beforeId ? { before_id: beforeId } : {}
      }
    );
    return response.data;
  }

  // ── Table Operations ──

  async listTables(databaseId: number): Promise<any[]> {
    let response = await this.http.get(`/api/database/tables/database/${databaseId}/`);
    return response.data;
  }

  async getTable(tableId: number): Promise<any> {
    let response = await this.http.get(`/api/database/tables/${tableId}/`);
    return response.data;
  }

  async createTable(
    databaseId: number,
    name: string,
    data?: any[][],
    firstRowHeader?: boolean
  ): Promise<any> {
    let body: Record<string, any> = { name };
    if (data) body.data = data;
    if (firstRowHeader !== undefined) body.first_row_header = firstRowHeader;

    let response = await this.http.post(`/api/database/tables/database/${databaseId}/`, body);
    return response.data;
  }

  async updateTable(tableId: number, name: string): Promise<any> {
    let response = await this.http.patch(`/api/database/tables/${tableId}/`, { name });
    return response.data;
  }

  async deleteTable(tableId: number): Promise<void> {
    await this.http.delete(`/api/database/tables/${tableId}/`);
  }

  // ── Field Operations ──

  async listFields(tableId: number): Promise<any[]> {
    let response = await this.http.get(`/api/database/fields/table/${tableId}/`);
    return response.data;
  }

  async getField(fieldId: number): Promise<any> {
    let response = await this.http.get(`/api/database/fields/${fieldId}/`);
    return response.data;
  }

  async createField(tableId: number, field: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/api/database/fields/table/${tableId}/`, field);
    return response.data;
  }

  async updateField(fieldId: number, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/api/database/fields/${fieldId}/`, data);
    return response.data;
  }

  async deleteField(fieldId: number): Promise<void> {
    await this.http.delete(`/api/database/fields/${fieldId}/`);
  }

  // ── View Operations ──

  async listViews(tableId: number): Promise<any[]> {
    let response = await this.http.get(`/api/database/views/table/${tableId}/`);
    return response.data;
  }

  async getView(viewId: number): Promise<any> {
    let response = await this.http.get(`/api/database/views/${viewId}/`);
    return response.data;
  }

  async createView(tableId: number, view: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/api/database/views/table/${tableId}/`, view);
    return response.data;
  }

  async updateView(viewId: number, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/api/database/views/${viewId}/`, data);
    return response.data;
  }

  async deleteView(viewId: number): Promise<void> {
    await this.http.delete(`/api/database/views/${viewId}/`);
  }

  // ── Workspace Operations ──

  async listWorkspaces(): Promise<any[]> {
    let response = await this.http.get('/api/workspaces/');
    return response.data;
  }

  // ── Database / Application Operations ──

  async listApplications(workspaceId: number): Promise<any[]> {
    let response = await this.http.get(`/api/applications/workspace/${workspaceId}/`);
    return response.data;
  }

  // ── Webhook Operations ──

  async listWebhooks(tableId: number): Promise<any[]> {
    let response = await this.http.get(`/api/database/webhooks/table/${tableId}/`);
    return response.data;
  }

  async getWebhook(webhookId: number): Promise<any> {
    let response = await this.http.get(`/api/database/webhooks/${webhookId}/`);
    return response.data;
  }

  async createWebhook(tableId: number, webhook: WebhookConfig): Promise<any> {
    let body: Record<string, any> = {
      name: webhook.name,
      url: webhook.url,
      include_all_events: webhook.includeAllEvents ?? false,
      request_method: webhook.requestMethod || 'POST',
      use_user_field_names: webhook.useUserFieldNames ?? true
    };

    if (webhook.events && webhook.events.length > 0) {
      body.events = webhook.events;
      body.include_all_events = false;
    }

    if (webhook.headers) {
      body.headers = webhook.headers;
    }

    let response = await this.http.post(`/api/database/webhooks/table/${tableId}/`, body);
    return response.data;
  }

  async updateWebhook(webhookId: number, data: Partial<WebhookConfig>): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.url !== undefined) body.url = data.url;
    if (data.includeAllEvents !== undefined) body.include_all_events = data.includeAllEvents;
    if (data.requestMethod !== undefined) body.request_method = data.requestMethod;
    if (data.useUserFieldNames !== undefined)
      body.use_user_field_names = data.useUserFieldNames;
    if (data.events !== undefined) body.events = data.events;
    if (data.headers !== undefined) body.headers = data.headers;

    let response = await this.http.patch(`/api/database/webhooks/${webhookId}/`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.http.delete(`/api/database/webhooks/${webhookId}/`);
  }

  // ── File Upload Operations ──

  async uploadFileViaUrl(url: string): Promise<any> {
    let response = await this.http.post('/api/user-files/upload-via-url/', { url });
    return response.data;
  }

  async uploadFile(file: Uint8Array, filename: string): Promise<any> {
    let formData = new FormData();
    let blob = new Blob([file]);
    formData.append('file', blob, filename);

    let response = await this.http.post('/api/user-files/upload-file/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}
