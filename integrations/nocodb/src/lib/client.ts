import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { baseUrl: string; token: string }) {
    let normalizedBase = config.baseUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: normalizedBase,
      headers: {
        'xc-token': config.token
      }
    });
  }

  // ── Bases ──

  async listBases(): Promise<any> {
    let res = await this.axios.get('/api/v2/meta/bases/');
    return res.data;
  }

  async getBase(baseId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/bases/${baseId}`);
    return res.data;
  }

  async createBase(data: {
    title: string;
    description?: string;
    color?: string;
  }): Promise<any> {
    let res = await this.axios.post('/api/v2/meta/bases/', data);
    return res.data;
  }

  async updateBase(
    baseId: string,
    data: { title?: string; description?: string; color?: string; meta?: any }
  ): Promise<any> {
    let res = await this.axios.patch(`/api/v2/meta/bases/${baseId}`, data);
    return res.data;
  }

  async deleteBase(baseId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/bases/${baseId}`);
    return res.data;
  }

  // ── Tables ──

  async listTables(baseId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/bases/${baseId}/tables`);
    return res.data;
  }

  async getTable(tableId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/tables/${tableId}`);
    return res.data;
  }

  async createTable(
    baseId: string,
    data: { table_name: string; title?: string; columns?: any[] }
  ): Promise<any> {
    let res = await this.axios.post(`/api/v2/meta/bases/${baseId}/tables`, data);
    return res.data;
  }

  async updateTable(tableId: string, data: { title?: string; meta?: any }): Promise<any> {
    let res = await this.axios.patch(`/api/v2/meta/tables/${tableId}`, data);
    return res.data;
  }

  async deleteTable(tableId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/tables/${tableId}`);
    return res.data;
  }

  // ── Fields (Columns) ──

  async listFields(tableId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/tables/${tableId}`);
    return res.data?.columns ?? [];
  }

  async getField(fieldId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/columns/${fieldId}`);
    return res.data;
  }

  async createField(tableId: string, data: any): Promise<any> {
    let res = await this.axios.post(`/api/v2/meta/tables/${tableId}/columns`, data);
    return res.data;
  }

  async updateField(fieldId: string, data: any): Promise<any> {
    let res = await this.axios.patch(`/api/v2/meta/columns/${fieldId}`, data);
    return res.data;
  }

  async deleteField(fieldId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/columns/${fieldId}`);
    return res.data;
  }

  // ── Records ──

  async listRecords(
    tableId: string,
    params?: {
      fields?: string;
      where?: string;
      sort?: string;
      limit?: number;
      offset?: number;
      viewId?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/api/v2/tables/${tableId}/records`, { params });
    return res.data;
  }

  async getRecord(
    tableId: string,
    recordId: string,
    params?: { fields?: string }
  ): Promise<any> {
    let res = await this.axios.get(`/api/v2/tables/${tableId}/records/${recordId}`, {
      params
    });
    return res.data;
  }

  async createRecords(tableId: string, records: Record<string, any>[]): Promise<any> {
    let res = await this.axios.post(`/api/v2/tables/${tableId}/records`, records);
    return res.data;
  }

  async updateRecords(tableId: string, records: Record<string, any>[]): Promise<any> {
    let res = await this.axios.patch(`/api/v2/tables/${tableId}/records`, records);
    return res.data;
  }

  async deleteRecords(tableId: string, records: { Id: number }[]): Promise<any> {
    let res = await this.axios.delete(`/api/v2/tables/${tableId}/records`, { data: records });
    return res.data;
  }

  // ── Linked Records ──

  async listLinkedRecords(
    tableId: string,
    linkFieldId: string,
    recordId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    let res = await this.axios.get(
      `/api/v2/tables/${tableId}/links/${linkFieldId}/records/${recordId}`,
      { params }
    );
    return res.data;
  }

  async linkRecords(
    tableId: string,
    linkFieldId: string,
    recordId: string,
    linkedRecordIds: { Id: number }[]
  ): Promise<any> {
    let res = await this.axios.post(
      `/api/v2/tables/${tableId}/links/${linkFieldId}/records/${recordId}`,
      linkedRecordIds
    );
    return res.data;
  }

  async unlinkRecords(
    tableId: string,
    linkFieldId: string,
    recordId: string,
    linkedRecordIds: { Id: number }[]
  ): Promise<any> {
    let res = await this.axios.delete(
      `/api/v2/tables/${tableId}/links/${linkFieldId}/records/${recordId}`,
      { data: linkedRecordIds }
    );
    return res.data;
  }

  // ── Views ──

  async listViews(tableId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/tables/${tableId}/views`);
    return res.data;
  }

  async getView(viewId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/views/${viewId}`);
    return res.data;
  }

  async createView(
    tableId: string,
    data: { title: string; type?: number; copy_from_id?: string }
  ): Promise<any> {
    let res = await this.axios.post(`/api/v2/meta/tables/${tableId}/views`, data);
    return res.data;
  }

  async updateView(viewId: string, data: any): Promise<any> {
    let res = await this.axios.patch(`/api/v2/meta/views/${viewId}`, data);
    return res.data;
  }

  async deleteView(viewId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/views/${viewId}`);
    return res.data;
  }

  // ── Webhooks (Hooks) ──

  async listWebhooks(tableId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/tables/${tableId}/hooks`);
    return res.data;
  }

  async getWebhook(hookId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/hooks/${hookId}`);
    return res.data;
  }

  async createWebhook(tableId: string, data: any): Promise<any> {
    let res = await this.axios.post(`/api/v2/meta/tables/${tableId}/hooks`, data);
    return res.data;
  }

  async updateWebhook(hookId: string, data: any): Promise<any> {
    let res = await this.axios.patch(`/api/v2/meta/hooks/${hookId}`, data);
    return res.data;
  }

  async deleteWebhook(hookId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/hooks/${hookId}`);
    return res.data;
  }

  async testWebhook(hookId: string): Promise<any> {
    let res = await this.axios.post(`/api/v2/meta/hooks/${hookId}/test`);
    return res.data;
  }

  // ── Storage ──

  async uploadAttachment(formData: any, params?: { path?: string }): Promise<any> {
    let res = await this.axios.post('/api/v2/storage/upload', formData, {
      params,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }

  // ── Workspaces ──

  async listWorkspaces(): Promise<any> {
    let res = await this.axios.get('/api/v2/meta/workspaces');
    return res.data;
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/workspaces/${workspaceId}`);
    return res.data;
  }
}
