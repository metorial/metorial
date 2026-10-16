import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { baseUrl: string; token: string }) {
    let normalizedBase = config.baseUrl.replace(/\/+$/, '');
    let parsed: URL;
    try {
      parsed = new URL(normalizedBase);
    } catch {
      throw createApiServiceError(
        'baseUrl must be an absolute HTTP or HTTPS NocoDB instance URL.'
      );
    }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw createApiServiceError(
        'baseUrl must use HTTP or HTTPS without credentials, query parameters, or a fragment.'
      );
    }
    if (!config.token.trim()) throw createApiServiceError('A NocoDB API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: normalizedBase,
      authHeader: { name: 'xc-token', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'NocoDB',
          reason: 'api_request_failed',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['message', 'msg', 'error', 'code', 'detail'],
          nestedKeys: ['errors', 'message'],
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.error === 'string'
              ? response.data.error
              : undefined
        })
    });
  }

  // ── Bases ──

  async listBases(workspaceId?: string): Promise<any> {
    let path =
      workspaceId !== undefined
        ? `/api/v2/meta/workspaces/${encodeURIComponent(workspaceId)}/bases`
        : '/api/v2/meta/bases/';
    let res = await this.axios.get(path);
    return res.data;
  }

  async getBase(baseId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/bases/${encodeURIComponent(baseId)}`);
    return res.data;
  }

  async createBase(
    data: {
      title: string;
      description?: string;
      color?: string;
      meta?: any;
    },
    workspaceId?: string
  ): Promise<any> {
    let path =
      workspaceId !== undefined
        ? `/api/v2/meta/workspaces/${encodeURIComponent(workspaceId)}/bases`
        : '/api/v2/meta/bases/';
    let res = await this.axios.post(path, data);
    return res.data;
  }

  async updateBase(
    baseId: string,
    data: { title?: string; description?: string; color?: string; meta?: any }
  ): Promise<any> {
    let res = await this.axios.patch(`/api/v2/meta/bases/${encodeURIComponent(baseId)}`, data);
    return res.data;
  }

  async deleteBase(baseId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/bases/${encodeURIComponent(baseId)}`);
    return res.data;
  }

  // ── Tables ──

  async listTables(baseId: string, sourceId?: string): Promise<any> {
    let path = `/api/v2/meta/bases/${encodeURIComponent(baseId)}${sourceId !== undefined ? `/${encodeURIComponent(sourceId)}` : ''}/tables`;
    let res = await this.axios.get(path);
    return res.data;
  }

  async getTable(tableId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/tables/${encodeURIComponent(tableId)}`);
    return res.data;
  }

  async createTable(
    baseId: string,
    data: { table_name: string; title?: string; columns?: any[]; description?: string },
    sourceId?: string
  ): Promise<any> {
    let path = `/api/v2/meta/bases/${encodeURIComponent(baseId)}${sourceId !== undefined ? `/${encodeURIComponent(sourceId)}` : ''}/tables`;
    let res = await this.axios.post(path, data);
    return res.data;
  }

  async updateTable(tableId: string, data: { title?: string; meta?: any }): Promise<any> {
    let res = await this.axios.patch(
      `/api/v2/meta/tables/${encodeURIComponent(tableId)}`,
      data
    );
    return res.data;
  }

  async deleteTable(tableId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/tables/${encodeURIComponent(tableId)}`);
    return res.data;
  }

  // ── Fields (Columns) ──

  async getField(fieldId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/columns/${encodeURIComponent(fieldId)}`);
    return res.data;
  }

  async createField(tableId: string, data: any): Promise<any> {
    let res = await this.axios.post(
      `/api/v2/meta/tables/${encodeURIComponent(tableId)}/columns`,
      data
    );
    return res.data;
  }

  async updateField(fieldId: string, data: any): Promise<any> {
    let res = await this.axios.patch(
      `/api/v2/meta/columns/${encodeURIComponent(fieldId)}`,
      data
    );
    return res.data;
  }

  async deleteField(fieldId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/columns/${encodeURIComponent(fieldId)}`);
    return res.data;
  }

  async countRecords(
    tableId: string,
    params?: { where?: string; viewId?: string }
  ): Promise<any> {
    let res = await this.axios.get(
      `/api/v2/tables/${encodeURIComponent(tableId)}/records/count`,
      { params }
    );
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
    let res = await this.axios.get(`/api/v2/tables/${encodeURIComponent(tableId)}/records`, {
      params
    });
    return res.data;
  }

  async getRecord(
    tableId: string,
    recordId: string,
    params?: { fields?: string }
  ): Promise<any> {
    let res = await this.axios.get(
      `/api/v2/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
      {
        params
      }
    );
    return res.data;
  }

  async createRecords(tableId: string, records: Record<string, any>[]): Promise<any> {
    let res = await this.axios.post(
      `/api/v2/tables/${encodeURIComponent(tableId)}/records`,
      records
    );
    return res.data;
  }

  async updateRecords(tableId: string, records: Record<string, any>[]): Promise<any> {
    let res = await this.axios.patch(
      `/api/v2/tables/${encodeURIComponent(tableId)}/records`,
      records
    );
    return res.data;
  }

  async deleteRecords(tableId: string, records: { Id: number }[]): Promise<any> {
    let res = await this.axios.delete(
      `/api/v2/tables/${encodeURIComponent(tableId)}/records`,
      { data: records }
    );
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
      `/api/v2/tables/${encodeURIComponent(tableId)}/links/${encodeURIComponent(linkFieldId)}/records/${encodeURIComponent(recordId)}`,
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
      `/api/v2/tables/${encodeURIComponent(tableId)}/links/${encodeURIComponent(linkFieldId)}/records/${encodeURIComponent(recordId)}`,
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
      `/api/v2/tables/${encodeURIComponent(tableId)}/links/${encodeURIComponent(linkFieldId)}/records/${encodeURIComponent(recordId)}`,
      { data: linkedRecordIds }
    );
    return res.data;
  }

  // ── Views ──

  async listViews(tableId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/tables/${encodeURIComponent(tableId)}/views`);
    return res.data;
  }

  // ── Webhooks (Hooks) ──

  async listWebhooks(tableId: string): Promise<any> {
    let res = await this.axios.get(`/api/v2/meta/tables/${encodeURIComponent(tableId)}/hooks`);
    return res.data;
  }

  async createWebhook(tableId: string, data: any): Promise<any> {
    let res = await this.axios.post(
      `/api/v2/meta/tables/${encodeURIComponent(tableId)}/hooks`,
      data
    );
    return res.data;
  }

  async updateWebhook(hookId: string, data: any): Promise<any> {
    let res = await this.axios.patch(`/api/v2/meta/hooks/${encodeURIComponent(hookId)}`, data);
    return res.data;
  }

  async deleteWebhook(hookId: string): Promise<any> {
    let res = await this.axios.delete(`/api/v2/meta/hooks/${encodeURIComponent(hookId)}`);
    return res.data;
  }
}
