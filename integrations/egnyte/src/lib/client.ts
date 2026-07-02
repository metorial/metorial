import { createAxios } from 'slates';

export class EgnyteClient {
  private http: ReturnType<typeof createAxios>;
  private domain: string;

  constructor(config: { token: string; domain: string }) {
    this.domain = config.domain;
    this.http = createAxios({
      baseURL: `https://${config.domain}.egnyte.com`,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // ── File System ──────────────────────────────────────────────

  async listFolder(
    path: string,
    params?: {
      listContent?: boolean;
      allowedLinkTypes?: boolean;
      count?: number;
      offset?: number;
      sortBy?: string;
      sortDirection?: string;
    }
  ) {
    let response = await this.http.get(`/pubapi/v1/fs/${encodeFilePath(path)}`, {
      params: {
        list_content: params?.listContent !== false,
        allowed_link_types: params?.allowedLinkTypes,
        count: params?.count,
        offset: params?.offset,
        sort_by: params?.sortBy,
        sort_direction: params?.sortDirection
      }
    });
    return response.data;
  }

  async getFileMetadata(path: string) {
    let response = await this.http.get(`/pubapi/v1/fs/${encodeFilePath(path)}`);
    return response.data;
  }

  async getFileById(groupId: string) {
    let response = await this.http.get(`/pubapi/v1/fs/ids/file/${groupId}`);
    return response.data;
  }

  async getFolderById(folderId: string) {
    let response = await this.http.get(`/pubapi/v1/fs/ids/folder/${folderId}`);
    return response.data;
  }

  async createFolder(path: string) {
    let response = await this.http.post(`/pubapi/v1/fs/${encodeFilePath(path)}`, {
      action: 'add_folder'
    });
    return response.data;
  }

  async uploadFile(
    folderPath: string,
    fileName: string,
    content: string | Uint8Array,
    contentType?: string
  ) {
    let response = await this.http.post(
      `/pubapi/v1/fs-content/${encodeFilePath(folderPath)}/${encodeURIComponent(fileName)}`,
      content,
      {
        headers: {
          'Content-Type': contentType || 'application/octet-stream'
        }
      }
    );
    return response.data;
  }

  async downloadFile(path: string, entryId?: string) {
    let params: Record<string, string> = {};
    if (entryId) {
      params.entry_id = entryId;
    }
    let response = await this.http.get(`/pubapi/v1/fs-content/${encodeFilePath(path)}`, {
      params,
      responseType: 'arraybuffer'
    });
    return {
      content: Buffer.from(response.data as ArrayBuffer).toString('base64'),
      contentType: String(response.headers?.['content-type'] ?? 'application/octet-stream')
    };
  }

  async copyFileOrFolder(sourcePath: string, destinationPath: string, permissions?: string) {
    let body: Record<string, string> = {
      action: 'copy',
      destination: destinationPath
    };
    if (permissions) {
      body.permissions = permissions;
    }
    let response = await this.http.post(`/pubapi/v1/fs/${encodeFilePath(sourcePath)}`, body);
    return response.data;
  }

  async moveFileOrFolder(sourcePath: string, destinationPath: string, permissions?: string) {
    let body: Record<string, string> = {
      action: 'move',
      destination: destinationPath
    };
    if (permissions) {
      body.permissions = permissions;
    }
    let response = await this.http.post(`/pubapi/v1/fs/${encodeFilePath(sourcePath)}`, body);
    return response.data;
  }

  async deleteFileOrFolder(path: string, entryId?: string) {
    let params: Record<string, string> = {};
    if (entryId) {
      params.entry_id = entryId;
    }
    await this.http.delete(`/pubapi/v1/fs/${encodeFilePath(path)}`, { params });
  }

  async lockFile(path: string, lockToken: string) {
    await this.http.post(`/pubapi/v1/fs/${encodeFilePath(path)}`, {
      action: 'lock',
      lock_token: lockToken
    });
  }

  async unlockFile(path: string, lockToken: string) {
    await this.http.post(`/pubapi/v1/fs/${encodeFilePath(path)}`, {
      action: 'unlock',
      lock_token: lockToken
    });
  }

  // ── Links ────────────────────────────────────────────────────

  async createLink(params: {
    path: string;
    type: 'file' | 'folder' | 'upload';
    accessibility: string;
    sendEmail?: boolean;
    recipients?: string[];
    message?: string;
    copyMe?: boolean;
    notify?: boolean;
    linkToCurrent?: boolean;
    expiryDate?: string;
    expiryClicks?: number;
    addFilename?: boolean;
    password?: string;
  }) {
    let response = await this.http.post('/pubapi/v1/links', {
      path: params.path,
      type: params.type,
      accessibility: params.accessibility,
      send_email: params.sendEmail,
      recipients: params.recipients,
      message: params.message,
      copy_me: params.copyMe,
      notify: params.notify,
      link_to_current: params.linkToCurrent,
      expiry_date: params.expiryDate,
      expiry_clicks: params.expiryClicks,
      add_filename: params.addFilename,
      password: params.password
    });
    return response.data;
  }

  async listLinks(params?: {
    path?: string;
    username?: string;
    createdBefore?: string;
    createdAfter?: string;
    type?: string;
    accessibility?: string;
    offset?: number;
    count?: number;
  }) {
    let response = await this.http.get('/pubapi/v1/links', {
      params: {
        path: params?.path,
        username: params?.username,
        created_before: params?.createdBefore,
        created_after: params?.createdAfter,
        type: params?.type,
        accessibility: params?.accessibility,
        offset: params?.offset,
        count: params?.count
      }
    });
    return response.data;
  }

  async deleteLink(linkId: string) {
    await this.http.delete(`/pubapi/v1/links/${linkId}`);
  }

  async getLinkDetails(linkId: string) {
    let response = await this.http.get(`/pubapi/v1/links/${linkId}`);
    return response.data;
  }

  // ── Permissions ──────────────────────────────────────────────

  async getPermissions(folderPath: string, params?: { users?: string; groups?: string }) {
    let response = await this.http.get(`/pubapi/v2/perms/${encodeFilePath(folderPath)}`, {
      params
    });
    return response.data;
  }

  async setPermissions(
    folderPath: string,
    body: {
      userPerms?: Record<string, string>;
      groupPerms?: Record<string, string>;
      inheritsPermissions?: boolean;
      keepParentPermissions?: boolean;
    }
  ) {
    let requestBody: Record<string, unknown> = {};
    if (body.userPerms) requestBody.userPerms = body.userPerms;
    if (body.groupPerms) requestBody.groupPerms = body.groupPerms;
    if (body.inheritsPermissions !== undefined)
      requestBody.inheritsPermissions = String(body.inheritsPermissions);
    if (body.keepParentPermissions !== undefined)
      requestBody.keepParentPermissions = String(body.keepParentPermissions);

    let response = await this.http.post(
      `/pubapi/v2/perms/${encodeFilePath(folderPath)}`,
      requestBody
    );
    return response.data;
  }

  // ── Users ────────────────────────────────────────────────────

  async listUsers(params?: { startIndex?: number; count?: number; filter?: string }) {
    let response = await this.http.get('/pubapi/v2/users', {
      params: {
        startIndex: params?.startIndex,
        count: params?.count,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getUser(userId: number | string) {
    let response = await this.http.get(`/pubapi/v2/users/${userId}`);
    return response.data;
  }

  async createUser(body: {
    userName: string;
    externalId?: string;
    email: string;
    familyName: string;
    givenName: string;
    active?: boolean;
    sendInvite?: boolean;
    authType?: string;
    userType?: string;
    idpUserId?: string;
    userPrincipalName?: string;
  }) {
    let response = await this.http.post('/pubapi/v2/users', {
      userName: body.userName,
      externalId: body.externalId,
      email: body.email,
      name: {
        familyName: body.familyName,
        givenName: body.givenName
      },
      active: body.active !== false,
      sendInvite: body.sendInvite,
      authType: body.authType,
      userType: body.userType,
      idpUserId: body.idpUserId,
      userPrincipalName: body.userPrincipalName
    });
    return response.data;
  }

  async updateUser(userId: number | string, body: Record<string, unknown>) {
    let response = await this.http.patch(`/pubapi/v2/users/${userId}`, body);
    return response.data;
  }

  async deleteUser(userId: number | string) {
    await this.http.delete(`/pubapi/v2/users/${userId}`);
  }

  // ── Groups ───────────────────────────────────────────────────

  async listGroups(params?: { startIndex?: number; count?: number; filter?: string }) {
    let response = await this.http.get('/pubapi/v2/groups', {
      params: {
        startIndex: params?.startIndex,
        count: params?.count,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.http.get(`/pubapi/v2/groups/${groupId}`);
    return response.data;
  }

  async createGroup(displayName: string, members?: Array<{ value: number }>) {
    let response = await this.http.post('/pubapi/v2/groups', {
      displayName,
      members
    });
    return response.data;
  }

  async updateGroup(
    groupId: string,
    body: { displayName?: string; members?: Array<{ value: number }> }
  ) {
    let response = await this.http.patch(`/pubapi/v2/groups/${groupId}`, body);
    return response.data;
  }

  async deleteGroup(groupId: string) {
    await this.http.delete(`/pubapi/v2/groups/${groupId}`);
  }

  // ── Search ───────────────────────────────────────────────────

  async search(params: {
    query: string;
    offset?: number;
    count?: number;
    folder?: string;
    modifiedBefore?: string;
    modifiedAfter?: string;
  }) {
    let response = await this.http.get('/pubapi/v1/search', {
      params: {
        query: params.query,
        offset: params.offset,
        count: params.count,
        folder: params.folder,
        modified_before: params.modifiedBefore,
        modified_after: params.modifiedAfter
      }
    });
    return response.data;
  }

  // ── Audit ────────────────────────────────────────────────────

  async createAuditReport(
    type: 'logins' | 'files' | 'permissions' | 'users' | 'groups',
    body: Record<string, unknown>
  ) {
    let response = await this.http.post(`/pubapi/v1/audit/${type}`, body);
    return response.data;
  }

  async getAuditReport(type: string, reportId: string) {
    let response = await this.http.get(`/pubapi/v1/audit/${type}/${reportId}`);
    return response.data;
  }

  // ── Trash ────────────────────────────────────────────────────

  async listTrash(folderPath?: string, params?: { offset?: number; count?: number }) {
    let path = folderPath
      ? `/pubapi/v1/fs/trash/${encodeFilePath(folderPath)}`
      : '/pubapi/v1/fs/trash';
    let response = await this.http.get(path, { params });
    return response.data;
  }

  async restoreFromTrash(trashItemPath: string) {
    let response = await this.http.post(
      `/pubapi/v1/fs/trash/${encodeFilePath(trashItemPath)}`,
      {
        action: 'restore'
      }
    );
    return response.data;
  }

  async deleteFromTrash(trashItemPath: string) {
    await this.http.delete(`/pubapi/v1/fs/trash/${encodeFilePath(trashItemPath)}`);
  }

  async emptyTrash() {
    await this.http.delete('/pubapi/v1/fs/trash');
  }

  // ── Comments/Notes ───────────────────────────────────────────

  async createComment(filePath: string, body: string) {
    let response = await this.http.post('/pubapi/v1/notes', {
      path: filePath,
      body
    });
    return response.data;
  }

  async listComments(filePath: string, params?: { offset?: number; count?: number }) {
    let response = await this.http.get('/pubapi/v1/notes', {
      params: {
        file: filePath,
        offset: params?.offset,
        count: params?.count
      }
    });
    return response.data;
  }

  async deleteComment(commentId: string) {
    await this.http.delete(`/pubapi/v1/notes/${commentId}`);
  }

  // ── Metadata ─────────────────────────────────────────────────

  async setFileMetadataProperties(
    groupId: string,
    namespace: string,
    properties: Record<string, unknown>
  ) {
    let response = await this.http.put(
      `/pubapi/v1/fs/ids/file/${groupId}/properties/${encodeURIComponent(namespace)}`,
      properties
    );
    return response.data;
  }

  async setFolderMetadataProperties(
    folderId: string,
    namespace: string,
    properties: Record<string, unknown>
  ) {
    let response = await this.http.put(
      `/pubapi/v1/fs/ids/folder/${folderId}/properties/${encodeURIComponent(namespace)}`,
      properties
    );
    return response.data;
  }

  async getNamespace(namespace: string) {
    let response = await this.http.get(
      `/pubapi/v1/properties/namespace/${encodeURIComponent(namespace)}`
    );
    return response.data;
  }

  // ── Workflows ────────────────────────────────────────────────

  async createWorkflow(body: {
    name: string;
    workflowType: string;
    file: { groupId: string };
    steps: Record<string, unknown>[];
  }) {
    let response = await this.http.post('/pubapi/v1/workflows', body);
    return response.data;
  }

  async getWorkflow(workflowId: string) {
    let response = await this.http.get(`/pubapi/v1/workflows/${workflowId}`);
    return response.data;
  }

  async listWorkflowTasks(params?: { offset?: number; count?: number }) {
    let response = await this.http.get('/pubapi/v1/workflows/tasks', { params });
    return response.data;
  }

  async cancelWorkflow(workflowId: string) {
    await this.http.post(`/pubapi/v1/workflows/${workflowId}/cancel`);
  }

  // ── Events (Polling) ────────────────────────────────────────

  async getEvents(cursor?: string | number) {
    let params: Record<string, string | number> = {};
    if (cursor !== undefined && cursor !== null) {
      params.id = cursor;
    }
    let response = await this.http.get('/pubapi/v2/events', { params });
    return response.data;
  }

  // ── Webhooks ─────────────────────────────────────────────────

  async createWebhook(params: {
    url: string;
    eventType?: string[];
    path?: string;
    authHeader?: string;
  }) {
    let response = await this.http.post('/pubapi/v1/webhooks', {
      url: params.url,
      eventType: params.eventType,
      path: params.path,
      authHeader: params.authHeader
    });
    return response.data;
  }

  async listWebhooks() {
    let response = await this.http.get('/pubapi/v1/webhooks');
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/pubapi/v1/webhooks/${webhookId}`);
  }

  async getWebhookDetails(webhookId: string) {
    let response = await this.http.get(`/pubapi/v1/webhooks/${webhookId}/details`);
    return response.data;
  }

  // ── User Info ────────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.http.get('/pubapi/v1/userinfo');
    return response.data;
  }
}

// Helper to encode file paths for URL segments while preserving slashes
let encodeFilePath = (path: string): string => {
  let normalized = path.startsWith('/') ? path.slice(1) : path;
  return normalized
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
};
