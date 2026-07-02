import { createAxios } from 'slates';

export class GristClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; serverUrl: string }) {
    this.axios = createAxios({
      baseURL: `${config.serverUrl}/api`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Organizations ----

  async listOrgs(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/orgs');
    return response.data;
  }

  async getOrg(orgId: number | string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/orgs/${orgId}`);
    return response.data;
  }

  async updateOrg(orgId: number | string, params: { name?: string }): Promise<void> {
    await this.axios.patch(`/orgs/${orgId}`, params);
  }

  async getOrgAccess(orgId: number | string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/orgs/${orgId}/access`);
    return response.data;
  }

  async updateOrgAccess(orgId: number | string, delta: Record<string, any>): Promise<void> {
    await this.axios.patch(`/orgs/${orgId}/access`, { delta });
  }

  async getOrgUsage(orgId: number | string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/orgs/${orgId}/usage`);
    return response.data;
  }

  // ---- Workspaces ----

  async listWorkspaces(orgId: number | string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/orgs/${orgId}/workspaces`);
    return response.data;
  }

  async createWorkspace(orgId: number | string, name: string): Promise<number> {
    let response = await this.axios.post(`/orgs/${orgId}/workspaces`, { name });
    return response.data;
  }

  async getWorkspace(workspaceId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async updateWorkspace(workspaceId: number, name: string): Promise<void> {
    await this.axios.patch(`/workspaces/${workspaceId}`, { name });
  }

  async deleteWorkspace(workspaceId: number, permanent?: boolean): Promise<void> {
    if (permanent) {
      await this.axios.post(`/workspaces/${workspaceId}/remove`, null, {
        params: { permanent: true }
      });
    } else {
      await this.axios.post(`/workspaces/${workspaceId}/remove`);
    }
  }

  async restoreWorkspace(workspaceId: number): Promise<void> {
    await this.axios.post(`/workspaces/${workspaceId}/unremove`);
  }

  async getWorkspaceAccess(workspaceId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(`/workspaces/${workspaceId}/access`);
    return response.data;
  }

  async updateWorkspaceAccess(workspaceId: number, delta: Record<string, any>): Promise<void> {
    await this.axios.patch(`/workspaces/${workspaceId}/access`, { delta });
  }

  // ---- Documents ----

  async getDocument(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${docId}`);
    return response.data;
  }

  async createDocument(
    workspaceId: number,
    params: {
      name?: string;
      isPinned?: boolean;
    }
  ): Promise<string> {
    let response = await this.axios.post(`/workspaces/${workspaceId}/docs`, params);
    return response.data;
  }

  async updateDocument(docId: string, params: Record<string, any>): Promise<void> {
    await this.axios.patch(`/docs/${docId}`, params);
  }

  async deleteDocument(docId: string, permanent?: boolean): Promise<void> {
    if (permanent) {
      await this.axios.post(`/docs/${docId}/remove`, null, {
        params: { permanent: true }
      });
    } else {
      await this.axios.post(`/docs/${docId}/remove`);
    }
  }

  async restoreDocument(docId: string): Promise<void> {
    await this.axios.post(`/docs/${docId}/unremove`);
  }

  async moveDocument(docId: string, workspaceId: number): Promise<void> {
    await this.axios.patch(`/docs/${docId}/move`, { workspace: workspaceId });
  }

  async pinDocument(docId: string): Promise<void> {
    await this.axios.patch(`/docs/${docId}/pin`);
  }

  async unpinDocument(docId: string): Promise<void> {
    await this.axios.patch(`/docs/${docId}/unpin`);
  }

  async getDocumentAccess(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${docId}/access`);
    return response.data;
  }

  async updateDocumentAccess(docId: string, delta: Record<string, any>): Promise<void> {
    await this.axios.patch(`/docs/${docId}/access`, { delta });
  }

  // ---- Tables ----

  async listTables(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${docId}/tables`);
    return response.data;
  }

  async createTables(
    docId: string,
    tables: Array<{
      id?: string;
      columns: Record<string, any>[];
    }>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/docs/${docId}/tables`, { tables });
    return response.data;
  }

  async updateTables(
    docId: string,
    tables: Array<{
      id: string;
      fields: Record<string, any>;
    }>
  ): Promise<void> {
    await this.axios.patch(`/docs/${docId}/tables`, { tables });
  }

  // ---- Columns ----

  async listColumns(
    docId: string,
    tableId: string,
    hidden?: boolean
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${docId}/tables/${tableId}/columns`, {
      params: hidden !== undefined ? { hidden } : undefined
    });
    return response.data;
  }

  async createColumns(
    docId: string,
    tableId: string,
    columns: Array<{
      id?: string;
      fields?: Record<string, any>;
    }>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/docs/${docId}/tables/${tableId}/columns`, {
      columns
    });
    return response.data;
  }

  async updateColumns(
    docId: string,
    tableId: string,
    columns: Array<{
      id: string;
      fields: Record<string, any>;
    }>
  ): Promise<void> {
    await this.axios.patch(`/docs/${docId}/tables/${tableId}/columns`, { columns });
  }

  async deleteColumn(docId: string, tableId: string, colId: string): Promise<void> {
    await this.axios.delete(`/docs/${docId}/tables/${tableId}/columns/${colId}`);
  }

  // ---- Records ----

  async listRecords(
    docId: string,
    tableId: string,
    params?: {
      filter?: Record<string, any>;
      sort?: string;
      limit?: number;
      hidden?: boolean;
    }
  ): Promise<Record<string, any>> {
    let queryParams: Record<string, any> = {};
    if (params?.filter) queryParams.filter = JSON.stringify(params.filter);
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.hidden !== undefined) queryParams.hidden = params.hidden;
    let response = await this.axios.get(`/docs/${docId}/tables/${tableId}/records`, {
      params: queryParams
    });
    return response.data;
  }

  async addRecords(
    docId: string,
    tableId: string,
    records: Array<{
      fields: Record<string, any>;
    }>,
    noparse?: boolean
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/docs/${docId}/tables/${tableId}/records`,
      { records },
      {
        params: noparse ? { noparse: true } : undefined
      }
    );
    return response.data;
  }

  async updateRecords(
    docId: string,
    tableId: string,
    records: Array<{
      id: number;
      fields: Record<string, any>;
    }>,
    noparse?: boolean
  ): Promise<void> {
    await this.axios.patch(
      `/docs/${docId}/tables/${tableId}/records`,
      { records },
      {
        params: noparse ? { noparse: true } : undefined
      }
    );
  }

  async addOrUpdateRecords(
    docId: string,
    tableId: string,
    records: Array<{
      require: Record<string, any>;
      fields?: Record<string, any>;
    }>,
    options?: {
      noparse?: boolean;
      onmany?: 'first' | 'none' | 'all';
      noadd?: boolean;
      noupdate?: boolean;
      allowEmptyRequire?: boolean;
    }
  ): Promise<void> {
    let params: Record<string, any> = {};
    if (options?.noparse) params.noparse = true;
    if (options?.onmany) params.onmany = options.onmany;
    if (options?.noadd) params.noadd = true;
    if (options?.noupdate) params.noupdate = true;
    if (options?.allowEmptyRequire) params.allow_empty_require = true;
    await this.axios.put(`/docs/${docId}/tables/${tableId}/records`, { records }, { params });
  }

  async deleteRecords(docId: string, tableId: string, rowIds: number[]): Promise<void> {
    await this.axios.post(`/docs/${docId}/tables/${tableId}/records/delete`, rowIds);
  }

  // ---- Attachments ----

  async listAttachments(
    docId: string,
    params?: {
      filter?: Record<string, any>;
      sort?: string;
      limit?: number;
    }
  ): Promise<Record<string, any>> {
    let queryParams: Record<string, any> = {};
    if (params?.filter) queryParams.filter = JSON.stringify(params.filter);
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    let response = await this.axios.get(`/docs/${docId}/attachments`, { params: queryParams });
    return response.data;
  }

  async getAttachmentMetadata(
    docId: string,
    attachmentId: number
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${docId}/attachments/${attachmentId}`);
    return response.data;
  }

  async removeUnusedAttachments(docId: string, expiredOnly?: boolean): Promise<void> {
    await this.axios.post(`/docs/${docId}/attachments/removeUnused`, null, {
      params: expiredOnly ? { expiredOnly: true } : undefined
    });
  }

  // ---- SQL ----

  async runSql(
    docId: string,
    sql: string,
    args?: Array<string | number>,
    timeout?: number
  ): Promise<Record<string, any>> {
    if (args || timeout) {
      let body: Record<string, any> = { sql };
      if (args) body.args = args;
      if (timeout !== undefined) body.timeout = timeout;
      let response = await this.axios.post(`/docs/${docId}/sql`, body);
      return response.data;
    }
    let response = await this.axios.get(`/docs/${docId}/sql`, {
      params: { q: sql }
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${docId}/webhooks`);
    return response.data;
  }

  async createWebhooks(
    docId: string,
    webhooks: Array<{
      fields: Record<string, any>;
    }>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/docs/${docId}/webhooks`, { webhooks });
    return response.data;
  }

  async updateWebhook(
    docId: string,
    webhookId: string,
    fields: Record<string, any>
  ): Promise<void> {
    await this.axios.patch(`/docs/${docId}/webhooks/${webhookId}`, fields);
  }

  async deleteWebhook(docId: string, webhookId: string): Promise<void> {
    await this.axios.delete(`/docs/${docId}/webhooks/${webhookId}`);
  }

  async clearWebhookQueue(docId: string, webhookId?: string): Promise<void> {
    if (webhookId) {
      await this.axios.delete(`/docs/${docId}/webhooks/queue/${webhookId}`);
    } else {
      await this.axios.delete(`/docs/${docId}/webhooks/queue`);
    }
  }

  // ---- User Actions (Batch) ----

  async applyUserActions(
    docId: string,
    actions: any[][],
    noparse?: boolean
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/docs/${docId}/apply`, actions, {
      params: noparse ? { noparse: true } : undefined
    });
    return response.data;
  }
}
