import { createAxios } from 'slates';
import { boxApiError } from './errors';

let api = createAxios({
  baseURL: 'https://api.box.com/2.0'
});

let uploadApi = createAxios({
  baseURL: 'https://upload.box.com/api/2.0'
});

let applyBoxApiErrorInterceptor = (
  http: ReturnType<typeof createAxios>,
  operation: string
) => {
  http.interceptors.response.use(
    response => response,
    error => Promise.reject(boxApiError(error, operation))
  );
};

let getHeaderValue = (headers: Record<string, any>, name: string) => {
  let value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === 'string' ? value : undefined;
};

let toBuffer = (data: unknown) => {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(data as any);
};

applyBoxApiErrorInterceptor(api, 'request');
applyBoxApiErrorInterceptor(uploadApi, 'upload request');

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`
    };
  }

  // ─── Files ───

  async getFileInfo(fileId: string, fields?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }
    let response = await api.get(`/files/${fileId}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async uploadFile(parentFolderId: string, fileName: string, content: string): Promise<any> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let attributes = JSON.stringify({
      name: fileName,
      parent: { id: parentFolderId }
    });

    let body = `--${boundary}\r\nContent-Disposition: form-data; name="attributes"\r\nContent-Type: application/json\r\n\r\n${attributes}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n${content}\r\n--${boundary}--`;

    let response = await uploadApi.post('/files/content', body, {
      headers: {
        ...this.headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data.entries?.[0] || response.data;
  }

  async updateFile(fileId: string, updates: Record<string, any>): Promise<any> {
    let response = await api.put(`/files/${fileId}`, updates, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async copyFile(fileId: string, parentFolderId: string, newName?: string): Promise<any> {
    let body: Record<string, any> = { parent: { id: parentFolderId } };
    if (newName) body.name = newName;
    let response = await api.post(`/files/${fileId}/copy`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/files/${fileId}`, {
      headers: this.headers
    });
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    let response = await api.get(`/files/${fileId}/content`, {
      headers: this.headers,
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400
    });
    return response.headers?.location || response.request?.responseURL || '';
  }

  async downloadFile(
    fileId: string,
    version?: string
  ): Promise<{
    file: any;
    contentBase64: string;
    mimeType: string;
    byteLength: number;
  }> {
    let [file, response] = await Promise.all([
      this.getFileInfo(fileId, ['id', 'name', 'size', 'extension']),
      api.get(`/files/${fileId}/content`, {
        headers: this.headers,
        params: version ? { version } : undefined,
        responseType: 'arraybuffer'
      })
    ]);
    let content = toBuffer(response.data);
    let mimeType =
      getHeaderValue(response.headers as Record<string, any>, 'content-type') ||
      'application/octet-stream';

    return {
      file,
      contentBase64: content.toString('base64'),
      mimeType,
      byteLength: content.byteLength
    };
  }

  async lockFile(fileId: string, expiresAt?: string): Promise<any> {
    let lock: Record<string, any> = { type: 'lock' };
    if (expiresAt) lock.expires_at = expiresAt;
    let response = await api.put(
      `/files/${fileId}`,
      { lock },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async unlockFile(fileId: string): Promise<any> {
    let response = await api.put(
      `/files/${fileId}`,
      { lock: null },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async getFileVersions(fileId: string): Promise<any[]> {
    let response = await api.get(`/files/${fileId}/versions`, {
      headers: this.headers
    });
    return response.data.entries || [];
  }

  // ─── Folders ───

  async getFolderInfo(folderId: string, fields?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }
    let response = await api.get(`/folders/${folderId}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getFolderItems(
    folderId: string,
    options?: {
      limit?: number;
      offset?: number;
      fields?: string[];
    }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }
    let response = await api.get(`/folders/${folderId}/items`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createFolder(parentFolderId: string, name: string): Promise<any> {
    let response = await api.post(
      '/folders',
      {
        name,
        parent: { id: parentFolderId }
      },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async updateFolder(folderId: string, updates: Record<string, any>): Promise<any> {
    let response = await api.put(`/folders/${folderId}`, updates, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async copyFolder(folderId: string, parentFolderId: string, newName?: string): Promise<any> {
    let body: Record<string, any> = { parent: { id: parentFolderId } };
    if (newName) body.name = newName;
    let response = await api.post(`/folders/${folderId}/copy`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteFolder(folderId: string, recursive: boolean = false): Promise<void> {
    await api.delete(`/folders/${folderId}`, {
      headers: this.headers,
      params: { recursive: String(recursive) }
    });
  }

  // ─── Search ───

  async search(
    query: string,
    options?: {
      fileExtensions?: string[];
      contentTypes?: string[];
      ancestorFolderIds?: string[];
      createdAtRange?: string;
      updatedAtRange?: string;
      ownerUserIds?: string[];
      type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    let params: Record<string, string> = { query };
    if (options?.fileExtensions) params.file_extensions = options.fileExtensions.join(',');
    if (options?.contentTypes) params.content_types = options.contentTypes.join(',');
    if (options?.ancestorFolderIds)
      params.ancestor_folder_ids = options.ancestorFolderIds.join(',');
    if (options?.createdAtRange) params.created_at_range = options.createdAtRange;
    if (options?.updatedAtRange) params.updated_at_range = options.updatedAtRange;
    if (options?.ownerUserIds) params.owner_user_ids = options.ownerUserIds.join(',');
    if (options?.type) params.type = options.type;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);

    let response = await api.get('/search', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Collaborations ───

  async createCollaboration(
    itemType: string,
    itemId: string,
    accessibleBy: {
      type: string;
      id?: string;
      login?: string;
    },
    role: string
  ): Promise<any> {
    let response = await api.post(
      '/collaborations',
      {
        item: { type: itemType, id: itemId },
        accessible_by: accessibleBy,
        role
      },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async getCollaboration(collaborationId: string): Promise<any> {
    let response = await api.get(`/collaborations/${collaborationId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCollaboration(
    collaborationId: string,
    role: string,
    status?: string
  ): Promise<any> {
    let body: Record<string, any> = { role };
    if (status) body.status = status;
    let response = await api.put(`/collaborations/${collaborationId}`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteCollaboration(collaborationId: string): Promise<void> {
    await api.delete(`/collaborations/${collaborationId}`, {
      headers: this.headers
    });
  }

  async getFileCollaborations(fileId: string): Promise<any[]> {
    let response = await api.get(`/files/${fileId}/collaborations`, {
      headers: this.headers
    });
    return response.data.entries || [];
  }

  async getFolderCollaborations(folderId: string): Promise<any[]> {
    let response = await api.get(`/folders/${folderId}/collaborations`, {
      headers: this.headers
    });
    return response.data.entries || [];
  }

  // ─── Shared Links ───

  async createFileSharedLink(
    fileId: string,
    options?: {
      access?: string;
      password?: string;
      unsharedAt?: string;
      permissions?: { canDownload?: boolean; canPreview?: boolean; canEdit?: boolean };
    }
  ): Promise<any> {
    let sharedLink: Record<string, any> = {};
    if (options?.access) sharedLink.access = options.access;
    if (options?.password) sharedLink.password = options.password;
    if (options?.unsharedAt) sharedLink.unshared_at = options.unsharedAt;
    if (options?.permissions) {
      sharedLink.permissions = {};
      if (options.permissions.canDownload !== undefined)
        sharedLink.permissions.can_download = options.permissions.canDownload;
      if (options.permissions.canPreview !== undefined)
        sharedLink.permissions.can_preview = options.permissions.canPreview;
      if (options.permissions.canEdit !== undefined)
        sharedLink.permissions.can_edit = options.permissions.canEdit;
    }
    let response = await api.put(
      `/files/${fileId}`,
      { shared_link: sharedLink },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        params: { fields: 'shared_link' }
      }
    );
    return response.data;
  }

  async createFolderSharedLink(
    folderId: string,
    options?: {
      access?: string;
      password?: string;
      unsharedAt?: string;
      permissions?: { canDownload?: boolean; canPreview?: boolean };
    }
  ): Promise<any> {
    let sharedLink: Record<string, any> = {};
    if (options?.access) sharedLink.access = options.access;
    if (options?.password) sharedLink.password = options.password;
    if (options?.unsharedAt) sharedLink.unshared_at = options.unsharedAt;
    if (options?.permissions) {
      sharedLink.permissions = {};
      if (options.permissions.canDownload !== undefined)
        sharedLink.permissions.can_download = options.permissions.canDownload;
      if (options.permissions.canPreview !== undefined)
        sharedLink.permissions.can_preview = options.permissions.canPreview;
    }
    let response = await api.put(
      `/folders/${folderId}`,
      { shared_link: sharedLink },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        params: { fields: 'shared_link' }
      }
    );
    return response.data;
  }

  async removeFileSharedLink(fileId: string): Promise<any> {
    let response = await api.put(
      `/files/${fileId}`,
      { shared_link: null },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async removeFolderSharedLink(folderId: string): Promise<any> {
    let response = await api.put(
      `/folders/${folderId}`,
      { shared_link: null },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  // ─── Comments ───

  async addComment(fileId: string, message: string, taggedMessage?: string): Promise<any> {
    let body: Record<string, any> = {
      item: { type: 'file', id: fileId },
      message
    };
    if (taggedMessage) body.tagged_message = taggedMessage;
    let response = await api.post('/comments', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getComments(fileId: string): Promise<any[]> {
    let response = await api.get(`/files/${fileId}/comments`, {
      headers: this.headers
    });
    return response.data.entries || [];
  }

  async updateComment(commentId: string, message: string): Promise<any> {
    let response = await api.put(
      `/comments/${commentId}`,
      { message },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`, {
      headers: this.headers
    });
  }

  // ─── Tasks ───

  async createTask(
    fileId: string,
    options: {
      message?: string;
      dueAt?: string;
      action?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      item: { type: 'file', id: fileId },
      action: options.action || 'review'
    };
    if (options.message) body.message = options.message;
    if (options.dueAt) body.due_at = options.dueAt;
    let response = await api.post('/tasks', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getFileTasks(fileId: string): Promise<any[]> {
    let response = await api.get(`/files/${fileId}/tasks`, {
      headers: this.headers
    });
    return response.data.entries || [];
  }

  async createTaskAssignment(
    taskId: string,
    assignTo: { id?: string; login?: string }
  ): Promise<any> {
    let response = await api.post(
      '/task_assignments',
      {
        task: { type: 'task', id: taskId },
        assign_to: assignTo
      },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async updateTask(taskId: string, updates: Record<string, any>): Promise<any> {
    let response = await api.put(`/tasks/${taskId}`, updates, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`, {
      headers: this.headers
    });
  }

  // ─── Metadata ───

  async getFileMetadata(fileId: string, scope: string, templateKey: string): Promise<any> {
    let response = await api.get(`/files/${fileId}/metadata/${scope}/${templateKey}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getAllFileMetadata(fileId: string): Promise<any[]> {
    let response = await api.get(`/files/${fileId}/metadata`, {
      headers: this.headers
    });
    return response.data.entries || [];
  }

  async applyFileMetadata(
    fileId: string,
    scope: string,
    templateKey: string,
    metadata: Record<string, any>
  ): Promise<any> {
    let response = await api.post(
      `/files/${fileId}/metadata/${scope}/${templateKey}`,
      metadata,
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async updateFileMetadata(
    fileId: string,
    scope: string,
    templateKey: string,
    operations: Array<{
      op: string;
      path: string;
      value?: any;
    }>
  ): Promise<any> {
    let response = await api.put(
      `/files/${fileId}/metadata/${scope}/${templateKey}`,
      operations,
      {
        headers: { ...this.headers, 'Content-Type': 'application/json-patch+json' }
      }
    );
    return response.data;
  }

  async deleteFileMetadata(fileId: string, scope: string, templateKey: string): Promise<void> {
    await api.delete(`/files/${fileId}/metadata/${scope}/${templateKey}`, {
      headers: this.headers
    });
  }

  async getMetadataTemplates(scope: string): Promise<any[]> {
    let response = await api.get(`/metadata_templates/${scope}`, {
      headers: this.headers
    });
    return response.data.entries || [];
  }

  async getMetadataTemplate(scope: string, templateKey: string): Promise<any> {
    let response = await api.get(`/metadata_templates/${scope}/${templateKey}/schema`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Users ───

  async getCurrentUser(fields?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }
    let response = await api.get('/users/me', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await api.get(`/users/${userId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listUsers(options?: {
    filterTerm?: string;
    limit?: number;
    offset?: number;
    userType?: string;
  }): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.filterTerm) params.filter_term = options.filterTerm;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.userType) params.user_type = options.userType;
    let response = await api.get('/users', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Webhooks ───

  async createWebhook(
    targetType: string,
    targetId: string,
    address: string,
    triggers: string[]
  ): Promise<any> {
    let response = await api.post(
      '/webhooks',
      {
        target: { type: targetType, id: targetId },
        address,
        triggers
      },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await api.get(`/webhooks/${webhookId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listWebhooks(limit?: number, marker?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    if (marker) params.marker = marker;
    let response = await api.get('/webhooks', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await api.delete(`/webhooks/${webhookId}`, {
      headers: this.headers
    });
  }

  // ─── Sign Requests ───

  async createSignRequest(options: {
    signers: Array<{
      email: string;
      role?: string;
      order?: number;
    }>;
    sourceFiles: Array<{ id: string; type?: string }>;
    parentFolderId: string;
    name?: string;
    emailSubject?: string;
    emailMessage?: string;
    isDocumentPreparationNeeded?: boolean;
    daysValid?: number;
  }): Promise<any> {
    let body: Record<string, any> = {
      signers: options.signers,
      source_files: options.sourceFiles.map(f => ({ id: f.id, type: f.type || 'file' })),
      parent_folder: { id: options.parentFolderId, type: 'folder' }
    };
    if (options.name) body.name = options.name;
    if (options.emailSubject) body.email_subject = options.emailSubject;
    if (options.emailMessage) body.email_message = options.emailMessage;
    if (options.isDocumentPreparationNeeded !== undefined)
      body.is_document_preparation_needed = options.isDocumentPreparationNeeded;
    if (options.daysValid) body.days_valid = options.daysValid;

    let response = await api.post('/sign_requests', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getSignRequest(signRequestId: string): Promise<any> {
    let response = await api.get(`/sign_requests/${signRequestId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listSignRequests(limit?: number, marker?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    if (marker) params.marker = marker;
    let response = await api.get('/sign_requests', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async cancelSignRequest(signRequestId: string): Promise<any> {
    let response = await api.post(
      `/sign_requests/${signRequestId}/cancel`,
      {},
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  // ─── Events ───

  async getEvents(options?: {
    streamType?: string;
    eventType?: string[];
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    streamPosition?: string;
  }): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.streamType) params.stream_type = options.streamType;
    if (options?.eventType) params.event_type = options.eventType.join(',');
    if (options?.createdAfter) params.created_after = options.createdAfter;
    if (options?.createdBefore) params.created_before = options.createdBefore;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.streamPosition) params.stream_position = options.streamPosition;
    let response = await api.get('/events', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Web Links ───

  async createWebLink(
    url: string,
    parentFolderId: string,
    name?: string,
    description?: string
  ): Promise<any> {
    let body: Record<string, any> = {
      url,
      parent: { id: parentFolderId }
    };
    if (name) body.name = name;
    if (description) body.description = description;
    let response = await api.post('/web_links', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getWebLink(webLinkId: string): Promise<any> {
    let response = await api.get(`/web_links/${webLinkId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateWebLink(webLinkId: string, updates: Record<string, any>): Promise<any> {
    let response = await api.put(`/web_links/${webLinkId}`, updates, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteWebLink(webLinkId: string): Promise<void> {
    await api.delete(`/web_links/${webLinkId}`, {
      headers: this.headers
    });
  }
}
