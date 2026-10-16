import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let gristError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Grist',
    reason: 'grist_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
  });

export let getGristItems = (response: unknown, key: string): Record<string, any>[] => {
  if (!isApiErrorRecord(response) || !Array.isArray(response[key])) {
    throw createApiServiceError(
      `Grist returned a response without the expected ${key} array.`
    );
  }
  return response[key];
};

export let normalizeServerUrl = (serverUrl: string) => {
  let url: URL;
  try {
    url = new URL(serverUrl);
  } catch {
    throw createApiServiceError('Enter an absolute HTTP or HTTPS URL for your Grist server.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Use a Grist server URL without credentials, query parameters, or a fragment.'
    );
  }
  return serverUrl.replace(/\/+$/, '');
};

export class GristClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; serverUrl: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: `${normalizeServerUrl(config.serverUrl)}/api`,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: gristError
    });
    this.axios.interceptors.response.use(response => {
      let body: unknown = response.data;
      if (
        isApiErrorRecord(body) &&
        (typeof body.error === 'string' || body.success === false)
      ) {
        throw gristError({ response: { status: response.status, data: body } });
      }
      return response;
    });
  }

  async getCurrentUser(): Promise<Record<string, any>> {
    let response = await this.axios.get('/profile/user');
    return response.data;
  }

  // ---- Organizations ----

  async listOrgs(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/orgs');
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Grist returned an invalid organizations list.');
    }
    return response.data;
  }

  async getOrg(orgId: number | string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/orgs/${encodeURIComponent(String(orgId))}`);
    return response.data;
  }

  async updateOrg(orgId: number | string, params: { name?: string }): Promise<void> {
    await this.axios.patch(`/orgs/${encodeURIComponent(String(orgId))}`, params);
  }

  async getOrgAccess(orgId: number | string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/orgs/${encodeURIComponent(String(orgId))}/access`);
    return response.data;
  }

  async updateOrgAccess(orgId: number | string, delta: Record<string, any>): Promise<void> {
    await this.axios.patch(`/orgs/${encodeURIComponent(String(orgId))}/access`, { delta });
  }

  async getOrgUsage(orgId: number | string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/orgs/${encodeURIComponent(String(orgId))}/usage`);
    return response.data;
  }

  // ---- Workspaces ----

  async listWorkspaces(orgId: number | string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(
      `/orgs/${encodeURIComponent(String(orgId))}/workspaces`
    );
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Grist returned an invalid workspaces list.');
    }
    return response.data;
  }

  async createWorkspace(orgId: number | string, name: string): Promise<number> {
    let response = await this.axios.post(
      `/orgs/${encodeURIComponent(String(orgId))}/workspaces`,
      { name }
    );
    return response.data;
  }

  async getWorkspace(workspaceId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/workspaces/${encodeURIComponent(String(workspaceId))}`
    );
    return response.data;
  }

  async updateWorkspace(workspaceId: number, name: string): Promise<void> {
    await this.axios.patch(`/workspaces/${encodeURIComponent(String(workspaceId))}`, { name });
  }

  async deleteWorkspace(workspaceId: number, permanent?: boolean): Promise<void> {
    if (permanent) {
      await this.axios.post(
        `/workspaces/${encodeURIComponent(String(workspaceId))}/remove`,
        null,
        {
          params: { permanent: true }
        }
      );
    } else {
      await this.axios.post(`/workspaces/${encodeURIComponent(String(workspaceId))}/remove`);
    }
  }

  async restoreWorkspace(workspaceId: number): Promise<void> {
    await this.axios.post(`/workspaces/${encodeURIComponent(String(workspaceId))}/unremove`);
  }

  async getWorkspaceAccess(workspaceId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/workspaces/${encodeURIComponent(String(workspaceId))}/access`
    );
    return response.data;
  }

  async updateWorkspaceAccess(workspaceId: number, delta: Record<string, any>): Promise<void> {
    await this.axios.patch(`/workspaces/${encodeURIComponent(String(workspaceId))}/access`, {
      delta
    });
  }

  // ---- Documents ----

  async getDocument(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${encodeURIComponent(String(docId))}`);
    return response.data;
  }

  async createDocument(
    workspaceId: number,
    params: {
      name?: string;
      isPinned?: boolean;
    }
  ): Promise<string> {
    let response = await this.axios.post(
      `/workspaces/${encodeURIComponent(String(workspaceId))}/docs`,
      params
    );
    return response.data;
  }

  async updateDocument(docId: string, params: Record<string, any>): Promise<void> {
    await this.axios.patch(`/docs/${encodeURIComponent(String(docId))}`, params);
  }

  async deleteDocument(docId: string, permanent?: boolean): Promise<void> {
    if (permanent) {
      await this.axios.post(`/docs/${encodeURIComponent(String(docId))}/remove`, null, {
        params: { permanent: true }
      });
    } else {
      await this.axios.post(`/docs/${encodeURIComponent(String(docId))}/remove`);
    }
  }

  async restoreDocument(docId: string): Promise<void> {
    await this.axios.post(`/docs/${encodeURIComponent(String(docId))}/unremove`);
  }

  async moveDocument(docId: string, workspaceId: number): Promise<void> {
    await this.axios.patch(`/docs/${encodeURIComponent(String(docId))}/move`, {
      workspace: workspaceId
    });
  }

  async pinDocument(docId: string): Promise<void> {
    await this.axios.patch(`/docs/${encodeURIComponent(String(docId))}/pin`);
  }

  async unpinDocument(docId: string): Promise<void> {
    await this.axios.patch(`/docs/${encodeURIComponent(String(docId))}/unpin`);
  }

  async getDocumentAccess(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${encodeURIComponent(String(docId))}/access`);
    return response.data;
  }

  async updateDocumentAccess(docId: string, delta: Record<string, any>): Promise<void> {
    await this.axios.patch(`/docs/${encodeURIComponent(String(docId))}/access`, { delta });
  }

  // ---- Tables ----

  async listTables(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${encodeURIComponent(String(docId))}/tables`);
    return response.data;
  }

  async createTables(
    docId: string,
    tables: Array<{
      id?: string;
      columns: Record<string, any>[];
    }>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/docs/${encodeURIComponent(String(docId))}/tables`, {
      tables
    });
    return response.data;
  }

  async updateTables(
    docId: string,
    tables: Array<{
      id: string;
      fields: Record<string, any>;
    }>
  ): Promise<void> {
    await this.axios.patch(`/docs/${encodeURIComponent(String(docId))}/tables`, { tables });
  }

  // ---- Columns ----

  async listColumns(
    docId: string,
    tableId: string,
    hidden?: boolean
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/columns`,
      {
        params: hidden !== undefined ? { hidden } : undefined
      }
    );
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
    let response = await this.axios.post(
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/columns`,
      {
        columns
      }
    );
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
    await this.axios.patch(
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/columns`,
      { columns }
    );
  }

  async deleteColumn(docId: string, tableId: string, colId: string): Promise<void> {
    await this.axios.delete(
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/columns/${encodeURIComponent(String(colId))}`
    );
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
    let response = await this.axios.get(
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/records`,
      {
        params: queryParams
      }
    );
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
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/records`,
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
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/records`,
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
    if (options?.noparse !== undefined) params.noparse = options.noparse;
    if (options?.onmany) params.onmany = options.onmany;
    if (options?.noadd !== undefined) params.noadd = options.noadd;
    if (options?.noupdate !== undefined) params.noupdate = options.noupdate;
    if (options?.allowEmptyRequire !== undefined)
      params.allow_empty_require = options.allowEmptyRequire;
    await this.axios.put(
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/records`,
      { records },
      { params }
    );
  }

  async deleteRecords(docId: string, tableId: string, rowIds: number[]): Promise<void> {
    await this.axios.post(
      `/docs/${encodeURIComponent(String(docId))}/tables/${encodeURIComponent(String(tableId))}/records/delete`,
      rowIds
    );
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
    let response = await this.axios.get(
      `/docs/${encodeURIComponent(String(docId))}/attachments`,
      { params: queryParams }
    );
    return response.data;
  }

  async getAttachmentMetadata(
    docId: string,
    attachmentId: number
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/docs/${encodeURIComponent(String(docId))}/attachments/${encodeURIComponent(String(attachmentId))}`
    );
    return response.data;
  }

  async removeUnusedAttachments(docId: string, expiredOnly?: boolean): Promise<void> {
    await this.axios.post(
      `/docs/${encodeURIComponent(String(docId))}/attachments/removeUnused`,
      null,
      {
        params: expiredOnly ? { expiredOnly: true } : undefined
      }
    );
  }

  // ---- SQL ----

  async runSql(
    docId: string,
    sql: string,
    args?: Array<string | number>,
    timeout?: number
  ): Promise<Record<string, any>> {
    if (args !== undefined || timeout !== undefined) {
      let body: Record<string, any> = { sql };
      if (args) body.args = args;
      if (timeout !== undefined) body.timeout = timeout;
      let response = await this.axios.post(
        `/docs/${encodeURIComponent(String(docId))}/sql`,
        body
      );
      return response.data;
    }
    let response = await this.axios.get(`/docs/${encodeURIComponent(String(docId))}/sql`, {
      params: { q: sql }
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(docId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/docs/${encodeURIComponent(String(docId))}/webhooks`);
    return response.data;
  }

  async createWebhooks(
    docId: string,
    webhooks: Array<{
      fields: Record<string, any>;
    }>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/docs/${encodeURIComponent(String(docId))}/webhooks`,
      { webhooks }
    );
    return response.data;
  }

  async updateWebhook(
    docId: string,
    webhookId: string,
    fields: Record<string, any>
  ): Promise<void> {
    await this.axios.patch(
      `/docs/${encodeURIComponent(String(docId))}/webhooks/${encodeURIComponent(String(webhookId))}`,
      fields
    );
  }

  async deleteWebhook(docId: string, webhookId: string): Promise<void> {
    await this.axios.delete(
      `/docs/${encodeURIComponent(String(docId))}/webhooks/${encodeURIComponent(String(webhookId))}`
    );
  }

  async clearWebhookQueue(docId: string, webhookId?: string): Promise<void> {
    if (webhookId) {
      await this.axios.delete(
        `/docs/${encodeURIComponent(String(docId))}/webhooks/queue/${encodeURIComponent(String(webhookId))}`
      );
    } else {
      await this.axios.delete(`/docs/${encodeURIComponent(String(docId))}/webhooks/queue`);
    }
  }

  // ---- User Actions (Batch) ----

  async applyUserActions(
    docId: string,
    actions: any[][],
    noparse?: boolean
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/docs/${encodeURIComponent(String(docId))}/apply`,
      actions,
      {
        params: noparse ? { noparse: true } : undefined
      }
    );
    return response.data;
  }
}
