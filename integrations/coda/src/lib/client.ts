import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://coda.io/apis/v1'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Docs ──

  async listDocs(params?: {
    isOwner?: boolean;
    query?: string;
    sourceDoc?: string;
    isStarred?: boolean;
    inGallery?: boolean;
    workspaceId?: string;
    folderId?: string;
    limit?: number;
    pageToken?: string;
  }) {
    let response = await http.get('/docs', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getDoc(docId: string) {
    let response = await http.get(`/docs/${docId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createDoc(body: {
    title?: string;
    sourceDoc?: string;
    timezone?: string;
    folderId?: string;
  }) {
    let response = await http.post('/docs', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateDoc(
    docId: string,
    body: {
      title?: string;
      iconName?: string;
    }
  ) {
    let response = await http.patch(`/docs/${docId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteDoc(docId: string) {
    let response = await http.delete(`/docs/${docId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Folders ──

  async listFolders(params?: {
    workspaceId?: string;
    isStarred?: boolean;
    limit?: number;
    pageToken?: string;
  }) {
    let response = await http.get('/folders', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getFolder(folderId: string) {
    let response = await http.get(`/folders/${folderId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createFolder(body: { name: string; parentFolderId?: string }) {
    let response = await http.post('/folders', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateFolder(
    folderId: string,
    body: {
      name?: string;
    }
  ) {
    let response = await http.patch(`/folders/${folderId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteFolder(folderId: string) {
    let response = await http.delete(`/folders/${folderId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Pages ──

  async listPages(
    docId: string,
    params?: {
      limit?: number;
      pageToken?: string;
    }
  ) {
    let response = await http.get(`/docs/${docId}/pages`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getPage(docId: string, pageIdOrName: string) {
    let response = await http.get(`/docs/${docId}/pages/${encodeURIComponent(pageIdOrName)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createPage(
    docId: string,
    body: {
      name: string;
      subtitle?: string;
      iconName?: string;
      imageUrl?: string;
      parentPageId?: string;
      pageContent?: { type: string; body: string };
    }
  ) {
    let response = await http.post(`/docs/${docId}/pages`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async updatePage(
    docId: string,
    pageIdOrName: string,
    body: {
      name?: string;
      subtitle?: string;
      iconName?: string;
      imageUrl?: string;
      contentUpdate?: {
        insertionIndex?: number;
        canvasContent?: { type: string; body: string };
      };
    }
  ) {
    let response = await http.put(
      `/docs/${docId}/pages/${encodeURIComponent(pageIdOrName)}`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deletePage(docId: string, pageIdOrName: string) {
    let response = await http.delete(
      `/docs/${docId}/pages/${encodeURIComponent(pageIdOrName)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getPageContent(
    docId: string,
    pageIdOrName: string,
    params?: {
      outputFormat?: 'html' | 'markdown';
    }
  ) {
    let response = await http.get(
      `/docs/${docId}/pages/${encodeURIComponent(pageIdOrName)}/content`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async beginPageExport(
    docId: string,
    pageIdOrName: string,
    body: {
      outputFormat: 'html' | 'markdown';
    }
  ) {
    let response = await http.post(
      `/docs/${docId}/pages/${encodeURIComponent(pageIdOrName)}/export`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getPageExportStatus(docId: string, pageIdOrName: string, requestId: string) {
    let response = await http.get(
      `/docs/${docId}/pages/${encodeURIComponent(pageIdOrName)}/export/${requestId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Tables ──

  async listTables(
    docId: string,
    params?: {
      limit?: number;
      pageToken?: string;
      sortBy?: string;
      tableTypes?: string;
    }
  ) {
    let response = await http.get(`/docs/${docId}/tables`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTable(docId: string, tableIdOrName: string) {
    let response = await http.get(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Columns ──

  async listColumns(
    docId: string,
    tableIdOrName: string,
    params?: {
      limit?: number;
      pageToken?: string;
      visibleOnly?: boolean;
    }
  ) {
    let response = await http.get(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/columns`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async getColumn(docId: string, tableIdOrName: string, columnIdOrName: string) {
    let response = await http.get(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/columns/${encodeURIComponent(columnIdOrName)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Rows ──

  async listRows(
    docId: string,
    tableIdOrName: string,
    params?: {
      query?: string;
      sortBy?: string;
      useColumnNames?: boolean;
      valueFormat?: 'simple' | 'simpleWithArrays' | 'rich';
      limit?: number;
      pageToken?: string;
      syncToken?: string;
      visibleOnly?: boolean;
    }
  ) {
    let response = await http.get(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/rows`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async getRow(
    docId: string,
    tableIdOrName: string,
    rowIdOrName: string,
    params?: {
      useColumnNames?: boolean;
      valueFormat?: 'simple' | 'simpleWithArrays' | 'rich';
    }
  ) {
    let response = await http.get(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async upsertRows(
    docId: string,
    tableIdOrName: string,
    body: {
      rows: Array<{ cells: Array<{ column: string; value: any }> }>;
      keyColumns?: string[];
    }
  ) {
    let response = await http.post(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/rows`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateRow(
    docId: string,
    tableIdOrName: string,
    rowIdOrName: string,
    body: {
      row: { cells: Array<{ column: string; value: any }> };
    }
  ) {
    let response = await http.put(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteRow(docId: string, tableIdOrName: string, rowIdOrName: string) {
    let response = await http.delete(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteRows(
    docId: string,
    tableIdOrName: string,
    body: {
      rowIds: string[];
    }
  ) {
    let response = await http.delete(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/rows`,
      {
        headers: this.headers,
        data: body
      }
    );
    return response.data;
  }

  // ── Buttons ──

  async pushButton(
    docId: string,
    tableIdOrName: string,
    rowIdOrName: string,
    columnIdOrName: string
  ) {
    let response = await http.post(
      `/docs/${docId}/tables/${encodeURIComponent(tableIdOrName)}/rows/${encodeURIComponent(rowIdOrName)}/buttons/${encodeURIComponent(columnIdOrName)}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Formulas ──

  async listFormulas(
    docId: string,
    params?: {
      limit?: number;
      pageToken?: string;
    }
  ) {
    let response = await http.get(`/docs/${docId}/formulas`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getFormula(docId: string, formulaIdOrName: string) {
    let response = await http.get(
      `/docs/${docId}/formulas/${encodeURIComponent(formulaIdOrName)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Controls ──

  async listControls(
    docId: string,
    params?: {
      limit?: number;
      pageToken?: string;
    }
  ) {
    let response = await http.get(`/docs/${docId}/controls`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getControl(docId: string, controlIdOrName: string) {
    let response = await http.get(
      `/docs/${docId}/controls/${encodeURIComponent(controlIdOrName)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Permissions ──

  async getAclMetadata(docId: string) {
    let response = await http.get(`/docs/${docId}/acl/metadata`, {
      headers: this.headers
    });
    return response.data;
  }

  async listPermissions(
    docId: string,
    params?: {
      limit?: number;
      pageToken?: string;
    }
  ) {
    let response = await http.get(`/docs/${docId}/acl/permissions`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async addPermission(
    docId: string,
    body: {
      access: 'readonly' | 'write' | 'comment';
      principal: { type: 'email' | 'domain' | 'anyone'; email?: string; domain?: string };
      suppressNotification?: boolean;
    }
  ) {
    let response = await http.post(`/docs/${docId}/acl/permissions`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePermission(docId: string, permissionId: string) {
    let response = await http.delete(`/docs/${docId}/acl/permissions/${permissionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async searchPrincipals(
    docId: string,
    params?: {
      query?: string;
      limit?: number;
      pageToken?: string;
    }
  ) {
    let response = await http.get(`/docs/${docId}/acl/principals/search`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getAclSettings(docId: string) {
    let response = await http.get(`/docs/${docId}/acl/settings`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateAclSettings(
    docId: string,
    body: {
      allowEditorsToChangePermissions?: boolean;
      allowViewersToCopyDoc?: boolean;
      allowViewersToRequestEditing?: boolean;
    }
  ) {
    let response = await http.patch(`/docs/${docId}/acl/settings`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Publishing ──

  async publishDoc(
    docId: string,
    body: {
      slug?: string;
      discoverable?: boolean;
      earnCredit?: boolean;
      categoryNames?: string[];
      mode?: 'view' | 'play' | 'edit';
    }
  ) {
    let response = await http.put(`/docs/${docId}/publish`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async unpublishDoc(docId: string) {
    let response = await http.delete(`/docs/${docId}/publish`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Automation Triggering ──

  async triggerAutomation(docId: string, ruleId: string, body: Record<string, any>) {
    let response = await http.post(`/docs/${docId}/hooks/automation/${ruleId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks(docId: string) {
    let response = await http.get(`/docs/${docId}/webhooks`, {
      headers: this.headers
    });
    return response.data;
  }

  async createWebhook(
    docId: string,
    body: {
      url: string;
      eventTypes: string[];
    }
  ) {
    let response = await http.post(`/docs/${docId}/webhooks`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(docId: string, webhookId: string) {
    let response = await http.delete(`/docs/${docId}/webhooks/${webhookId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── URL Resolution ──

  async resolveUrl(url: string) {
    let response = await http.get('/resolveBrowserLink', {
      headers: this.headers,
      params: { url }
    });
    return response.data;
  }

  // ── Mutation Status ──

  async getMutationStatus(requestId: string) {
    let response = await http.get(`/mutationStatus/${requestId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Analytics ──

  async listDocAnalytics(params?: {
    docIds?: string;
    workspaceId?: string;
    sinceDate?: string;
    untilDate?: string;
    limit?: number;
    pageToken?: string;
    isPublished?: boolean;
  }) {
    let response = await http.get('/analytics/docs', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async listPageAnalytics(
    docId: string,
    params?: {
      sinceDate?: string;
      untilDate?: string;
      limit?: number;
      pageToken?: string;
    }
  ) {
    let response = await http.get(`/analytics/docs/${docId}/pages`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ── Categories ──

  async listCategories() {
    let response = await http.get('/categories', {
      headers: this.headers
    });
    return response.data;
  }

  // ── User Info ──

  async whoami() {
    let response = await http.get('/whoami', {
      headers: this.headers
    });
    return response.data;
  }
}
