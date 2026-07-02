import { createAxios } from 'slates';

export class SmartsheetClient {
  private api;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.smartsheet.com/2.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Sheets ────────────────────────────────────────────────

  async listSheets(params?: { pageSize?: number; page?: number; includeAll?: boolean }) {
    let response = await this.api.get('/sheets', { params });
    return response.data;
  }

  async getSheet(
    sheetId: string,
    params?: {
      include?: string;
      exclude?: string;
      columnIds?: string;
      rowIds?: string;
      rowNumbers?: string;
      filterId?: string;
      level?: number;
      page?: number;
      pageSize?: number;
    }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}`, { params });
    return response.data;
  }

  async createSheet(body: {
    name: string;
    columns: Array<{
      title: string;
      type: string;
      primary?: boolean;
      options?: string[];
      width?: number;
    }>;
  }) {
    let response = await this.api.post('/sheets', body);
    return response.data;
  }

  async createSheetInFolder(
    folderId: string,
    body: {
      name: string;
      columns: Array<{
        title: string;
        type: string;
        primary?: boolean;
        options?: string[];
        width?: number;
      }>;
    }
  ) {
    let response = await this.api.post(`/folders/${folderId}/sheets`, body);
    return response.data;
  }

  async createSheetInWorkspace(
    workspaceId: string,
    body: {
      name: string;
      columns: Array<{
        title: string;
        type: string;
        primary?: boolean;
        options?: string[];
        width?: number;
      }>;
    }
  ) {
    let response = await this.api.post(`/workspaces/${workspaceId}/sheets`, body);
    return response.data;
  }

  async updateSheet(sheetId: string, body: { name?: string }) {
    let response = await this.api.put(`/sheets/${sheetId}`, body);
    return response.data;
  }

  async deleteSheet(sheetId: string) {
    let response = await this.api.delete(`/sheets/${sheetId}`);
    return response.data;
  }

  async copySheet(
    sheetId: string,
    body: {
      destinationType: string;
      destinationId?: string;
      newName: string;
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/copy`, body);
    return response.data;
  }

  async moveSheet(
    sheetId: string,
    body: {
      destinationType: string;
      destinationId?: string;
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/move`, body);
    return response.data;
  }

  // ── Columns ───────────────────────────────────────────────

  async listColumns(
    sheetId: string,
    params?: { page?: number; pageSize?: number; includeAll?: boolean; level?: number }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/columns`, { params });
    return response.data;
  }

  async getColumn(sheetId: string, columnId: string) {
    let response = await this.api.get(`/sheets/${sheetId}/columns/${columnId}`);
    return response.data;
  }

  async addColumns(
    sheetId: string,
    columns: Array<{
      title: string;
      type: string;
      index?: number;
      primary?: boolean;
      options?: string[];
      width?: number;
      formula?: string;
    }>
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/columns`, columns);
    return response.data;
  }

  async updateColumn(
    sheetId: string,
    columnId: string,
    body: {
      title?: string;
      type?: string;
      index?: number;
      options?: string[];
      width?: number;
      formula?: string;
    }
  ) {
    let response = await this.api.put(`/sheets/${sheetId}/columns/${columnId}`, body);
    return response.data;
  }

  async deleteColumn(sheetId: string, columnId: string) {
    let response = await this.api.delete(`/sheets/${sheetId}/columns/${columnId}`);
    return response.data;
  }

  // ── Rows ──────────────────────────────────────────────────

  async getRow(
    sheetId: string,
    rowId: string,
    params?: { include?: string; exclude?: string }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/rows/${rowId}`, { params });
    return response.data;
  }

  async addRows(
    sheetId: string,
    rows: Array<{
      toTop?: boolean;
      toBottom?: boolean;
      parentId?: number;
      siblingId?: number;
      above?: boolean;
      cells: Array<{
        columnId: number;
        value?: any;
        formula?: string;
        hyperlink?: { url?: string; sheetId?: number; reportId?: string };
        strict?: boolean;
      }>;
    }>
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/rows`, rows);
    return response.data;
  }

  async updateRows(
    sheetId: string,
    rows: Array<{
      id: number;
      toTop?: boolean;
      toBottom?: boolean;
      parentId?: number;
      siblingId?: number;
      above?: boolean;
      expanded?: boolean;
      locked?: boolean;
      cells?: Array<{
        columnId: number;
        value?: any;
        formula?: string;
        hyperlink?: { url?: string; sheetId?: number; reportId?: string };
        strict?: boolean;
      }>;
    }>
  ) {
    let response = await this.api.put(`/sheets/${sheetId}/rows`, rows);
    return response.data;
  }

  async deleteRows(
    sheetId: string,
    rowIds: string[],
    params?: { ignoreRowsNotFound?: boolean }
  ) {
    let response = await this.api.delete(`/sheets/${sheetId}/rows`, {
      params: {
        ids: rowIds.join(','),
        ...params
      }
    });
    return response.data;
  }

  // ── Workspaces ────────────────────────────────────────────

  async listWorkspaces(params?: { page?: number; pageSize?: number; includeAll?: boolean }) {
    let response = await this.api.get('/workspaces', { params });
    return response.data;
  }

  async getWorkspace(workspaceId: string, params?: { include?: string; loadAll?: boolean }) {
    let response = await this.api.get(`/workspaces/${workspaceId}`, { params });
    return response.data;
  }

  async createWorkspace(body: { name: string }) {
    let response = await this.api.post('/workspaces', body);
    return response.data;
  }

  async updateWorkspace(workspaceId: string, body: { name?: string }) {
    let response = await this.api.put(`/workspaces/${workspaceId}`, body);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string) {
    let response = await this.api.delete(`/workspaces/${workspaceId}`);
    return response.data;
  }

  // ── Folders ───────────────────────────────────────────────

  async listFolders(params?: { page?: number; pageSize?: number; includeAll?: boolean }) {
    let response = await this.api.get('/home/folders', { params });
    return response.data;
  }

  async listWorkspaceFolders(
    workspaceId: string,
    params?: { page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/workspaces/${workspaceId}/folders`, { params });
    return response.data;
  }

  async getFolder(folderId: string, params?: { include?: string }) {
    let response = await this.api.get(`/folders/${folderId}`, { params });
    return response.data;
  }

  async createFolder(body: { name: string }) {
    let response = await this.api.post('/home/folders', body);
    return response.data;
  }

  async createFolderInWorkspace(workspaceId: string, body: { name: string }) {
    let response = await this.api.post(`/workspaces/${workspaceId}/folders`, body);
    return response.data;
  }

  async createSubfolder(folderId: string, body: { name: string }) {
    let response = await this.api.post(`/folders/${folderId}/folders`, body);
    return response.data;
  }

  async updateFolder(folderId: string, body: { name: string }) {
    let response = await this.api.put(`/folders/${folderId}`, body);
    return response.data;
  }

  async deleteFolder(folderId: string) {
    let response = await this.api.delete(`/folders/${folderId}`);
    return response.data;
  }

  // ── Sharing ───────────────────────────────────────────────

  async listSheetShares(
    sheetId: string,
    params?: { page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/shares`, { params });
    return response.data;
  }

  async shareSheet(
    sheetId: string,
    shares: Array<{
      email: string;
      accessLevel: string;
      subject?: string;
      message?: string;
    }>,
    params?: { sendEmail?: boolean }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/shares`, shares, { params });
    return response.data;
  }

  async updateSheetShare(sheetId: string, shareId: string, body: { accessLevel: string }) {
    let response = await this.api.put(`/sheets/${sheetId}/shares/${shareId}`, body);
    return response.data;
  }

  async deleteSheetShare(sheetId: string, shareId: string) {
    let response = await this.api.delete(`/sheets/${sheetId}/shares/${shareId}`);
    return response.data;
  }

  async shareWorkspace(
    workspaceId: string,
    shares: Array<{
      email: string;
      accessLevel: string;
      subject?: string;
      message?: string;
    }>,
    params?: { sendEmail?: boolean }
  ) {
    let response = await this.api.post(`/workspaces/${workspaceId}/shares`, shares, {
      params
    });
    return response.data;
  }

  // ── Search ────────────────────────────────────────────────

  async searchAll(query: string, params?: { include?: string; scopes?: string }) {
    let response = await this.api.get('/search', { params: { query, ...params } });
    return response.data;
  }

  async searchSheet(sheetId: string, query: string) {
    let response = await this.api.get(`/search/sheets/${sheetId}`, { params: { query } });
    return response.data;
  }

  // ── Users ─────────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.api.get('/users/me');
    return response.data;
  }

  async listUsers(params?: {
    page?: number;
    pageSize?: number;
    includeAll?: boolean;
    email?: string;
  }) {
    let response = await this.api.get('/users', { params });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  async addUser(body: {
    email: string;
    admin?: boolean;
    licensedSheetCreator?: boolean;
    firstName?: string;
    lastName?: string;
    groupAdmin?: boolean;
    resourceViewer?: boolean;
  }) {
    let response = await this.api.post('/users', body);
    return response.data;
  }

  async updateUser(
    userId: string,
    body: {
      admin?: boolean;
      licensedSheetCreator?: boolean;
      firstName?: string;
      lastName?: string;
      groupAdmin?: boolean;
      resourceViewer?: boolean;
    }
  ) {
    let response = await this.api.put(`/users/${userId}`, body);
    return response.data;
  }

  async removeUser(
    userId: string,
    params?: { transferTo?: string; removeFromSharing?: boolean }
  ) {
    let response = await this.api.delete(`/users/${userId}`, { params });
    return response.data;
  }

  // ── Discussions and Comments ──────────────────────────────

  async listSheetDiscussions(
    sheetId: string,
    params?: { include?: string; page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/discussions`, { params });
    return response.data;
  }

  async listRowDiscussions(
    sheetId: string,
    rowId: string,
    params?: { include?: string; page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/rows/${rowId}/discussions`, {
      params
    });
    return response.data;
  }

  async createDiscussionOnSheet(sheetId: string, body: { comment: { text: string } }) {
    let response = await this.api.post(`/sheets/${sheetId}/discussions`, body);
    return response.data;
  }

  async createDiscussionOnRow(
    sheetId: string,
    rowId: string,
    body: { comment: { text: string } }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/rows/${rowId}/discussions`, body);
    return response.data;
  }

  async addComment(sheetId: string, discussionId: string, body: { text: string }) {
    let response = await this.api.post(
      `/sheets/${sheetId}/discussions/${discussionId}/comments`,
      body
    );
    return response.data;
  }

  async deleteDiscussion(sheetId: string, discussionId: string) {
    let response = await this.api.delete(`/sheets/${sheetId}/discussions/${discussionId}`);
    return response.data;
  }

  // ── Webhooks ──────────────────────────────────────────────

  async listWebhooks(params?: { page?: number; pageSize?: number; includeAll?: boolean }) {
    let response = await this.api.get('/webhooks', { params });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.api.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(body: {
    name: string;
    callbackUrl: string;
    scope: string;
    scopeObjectId: number;
    events: string[];
    version: number;
    subscope?: { columnIds?: number[] };
  }) {
    let response = await this.api.post('/webhooks', body);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    body: {
      enabled?: boolean;
      events?: string[];
      callbackUrl?: string;
      name?: string;
      version?: number;
    }
  ) {
    let response = await this.api.put(`/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.api.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async resetSharedSecret(webhookId: string) {
    let response = await this.api.post(`/webhooks/${webhookId}/resetsharedsecret`);
    return response.data;
  }

  // ── Reports ───────────────────────────────────────────────

  async listReports(params?: { page?: number; pageSize?: number; includeAll?: boolean }) {
    let response = await this.api.get('/reports', { params });
    return response.data;
  }

  async getReport(
    reportId: string,
    params?: { page?: number; pageSize?: number; include?: string }
  ) {
    let response = await this.api.get(`/reports/${reportId}`, { params });
    return response.data;
  }

  // ── Dashboards (Sights) ───────────────────────────────────

  async listDashboards(params?: { page?: number; pageSize?: number; includeAll?: boolean }) {
    let response = await this.api.get('/sights', { params });
    return response.data;
  }

  async getDashboard(dashboardId: string) {
    let response = await this.api.get(`/sights/${dashboardId}`);
    return response.data;
  }

  async deleteDashboard(dashboardId: string) {
    let response = await this.api.delete(`/sights/${dashboardId}`);
    return response.data;
  }

  async copyDashboard(
    dashboardId: string,
    body: {
      destinationType: string;
      destinationId?: string;
      newName: string;
    }
  ) {
    let response = await this.api.post(`/sights/${dashboardId}/copy`, body);
    return response.data;
  }

  async moveDashboard(
    dashboardId: string,
    body: {
      destinationType: string;
      destinationId?: string;
    }
  ) {
    let response = await this.api.post(`/sights/${dashboardId}/move`, body);
    return response.data;
  }

  // ── Sheet Summary ─────────────────────────────────────────

  async getSheetSummary(sheetId: string, params?: { include?: string }) {
    let response = await this.api.get(`/sheets/${sheetId}/summary`, { params });
    return response.data;
  }

  async addSheetSummaryFields(
    sheetId: string,
    fields: Array<{
      title: string;
      type: string;
      formula?: string;
      objectValue?: any;
    }>
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/summary/fields`, fields);
    return response.data;
  }

  async updateSheetSummaryFields(
    sheetId: string,
    fields: Array<{
      fieldId: number;
      title?: string;
      formula?: string;
      objectValue?: any;
    }>
  ) {
    let response = await this.api.put(`/sheets/${sheetId}/summary/fields`, fields);
    return response.data;
  }

  async deleteSheetSummaryFields(sheetId: string, fieldIds: string[]) {
    let response = await this.api.delete(`/sheets/${sheetId}/summary/fields`, {
      params: { ids: fieldIds.join(',') }
    });
    return response.data;
  }

  // ── Favorites ─────────────────────────────────────────────

  async listFavorites() {
    let response = await this.api.get('/favorites');
    return response.data;
  }

  async addFavorites(favorites: Array<{ type: string; objectId: number }>) {
    let response = await this.api.post('/favorites', favorites);
    return response.data;
  }

  async removeFavorite(type: string, objectId: string) {
    let response = await this.api.delete(`/favorites/${type}/${objectId}`);
    return response.data;
  }

  // ── Send via Email ────────────────────────────────────────

  async sendSheetViaEmail(
    sheetId: string,
    body: {
      to: Array<{ email: string }>;
      subject: string;
      message?: string;
      ccMe?: boolean;
      format?: string;
      formatDetails?: { paperSize?: string };
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/emails`, body);
    return response.data;
  }

  async sendRowsViaEmail(
    sheetId: string,
    body: {
      to: Array<{ email: string }>;
      subject: string;
      message?: string;
      ccMe?: boolean;
      rowIds: number[];
      columnIds?: number[];
      includeAttachments?: boolean;
      includeDiscussions?: boolean;
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/rows/emails`, body);
    return response.data;
  }

  // ── Update Requests ───────────────────────────────────────

  async createUpdateRequest(
    sheetId: string,
    body: {
      rowIds: number[];
      sendTo: Array<{ email: string }>;
      subject?: string;
      message?: string;
      ccMe?: boolean;
      includeAttachments?: boolean;
      includeDiscussions?: boolean;
      columnIds?: number[];
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/updaterequests`, body);
    return response.data;
  }

  async listUpdateRequests(
    sheetId: string,
    params?: { page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/updaterequests`, { params });
    return response.data;
  }

  // ── Contacts ──────────────────────────────────────────────

  async listContacts(params?: { page?: number; pageSize?: number; includeAll?: boolean }) {
    let response = await this.api.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.api.get(`/contacts/${contactId}`);
    return response.data;
  }

  // ── Automation Rules ──────────────────────────────────────

  async listAutomationRules(
    sheetId: string,
    params?: { page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/automationrules`, { params });
    return response.data;
  }

  // ── Cross-Sheet References ────────────────────────────────

  async listCrossSheetReferences(
    sheetId: string,
    params?: { page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/crosssheetreferences`, { params });
    return response.data;
  }

  async createCrossSheetReference(
    sheetId: string,
    body: {
      name: string;
      sourceSheetId: number;
      startRowId?: number;
      endRowId?: number;
      startColumnId?: number;
      endColumnId?: number;
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/crosssheetreferences`, body);
    return response.data;
  }

  // ── Groups ────────────────────────────────────────────────

  async listGroups(params?: { page?: number; pageSize?: number; includeAll?: boolean }) {
    let response = await this.api.get('/groups', { params });
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.api.get(`/groups/${groupId}`);
    return response.data;
  }

  async createGroup(body: {
    name: string;
    description?: string;
    members?: Array<{ email: string }>;
  }) {
    let response = await this.api.post('/groups', body);
    return response.data;
  }

  async updateGroup(
    groupId: string,
    body: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.api.put(`/groups/${groupId}`, body);
    return response.data;
  }

  async deleteGroup(groupId: string) {
    let response = await this.api.delete(`/groups/${groupId}`);
    return response.data;
  }

  async addGroupMembers(groupId: string, members: Array<{ email: string }>) {
    let response = await this.api.post(`/groups/${groupId}/members`, members);
    return response.data;
  }

  async removeGroupMember(groupId: string, userId: string) {
    let response = await this.api.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  }

  // ── Templates ─────────────────────────────────────────────

  async listPublicTemplates(params?: {
    page?: number;
    pageSize?: number;
    includeAll?: boolean;
  }) {
    let response = await this.api.get('/templates/public', { params });
    return response.data;
  }

  async listUserTemplates(params?: {
    page?: number;
    pageSize?: number;
    includeAll?: boolean;
  }) {
    let response = await this.api.get('/templates', { params });
    return response.data;
  }

  async createSheetFromTemplate(body: { name: string; fromId: number; includes?: string[] }) {
    let response = await this.api.post('/sheets', body);
    return response.data;
  }

  // ── Attachments ───────────────────────────────────────────

  async listSheetAttachments(
    sheetId: string,
    params?: { page?: number; pageSize?: number; includeAll?: boolean }
  ) {
    let response = await this.api.get(`/sheets/${sheetId}/attachments`, { params });
    return response.data;
  }

  async getAttachment(sheetId: string, attachmentId: string) {
    let response = await this.api.get(`/sheets/${sheetId}/attachments/${attachmentId}`);
    return response.data;
  }

  async deleteAttachment(sheetId: string, attachmentId: string) {
    let response = await this.api.delete(`/sheets/${sheetId}/attachments/${attachmentId}`);
    return response.data;
  }

  async attachUrlToSheet(
    sheetId: string,
    body: {
      name: string;
      url: string;
      attachmentType: string;
      attachmentSubType?: string;
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/attachments`, body);
    return response.data;
  }

  async attachUrlToRow(
    sheetId: string,
    rowId: string,
    body: {
      name: string;
      url: string;
      attachmentType: string;
      attachmentSubType?: string;
    }
  ) {
    let response = await this.api.post(`/sheets/${sheetId}/rows/${rowId}/attachments`, body);
    return response.data;
  }

  async attachUrlToComment(
    sheetId: string,
    commentId: string,
    body: {
      name: string;
      url: string;
      attachmentType: string;
      attachmentSubType?: string;
    }
  ) {
    let response = await this.api.post(
      `/sheets/${sheetId}/comments/${commentId}/attachments`,
      body
    );
    return response.data;
  }
}
