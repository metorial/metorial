import { createAxios } from 'slates';
import type {
  ChangeListResponse,
  CommentListResponse,
  DriveChange,
  DriveComment,
  DriveFile,
  DrivePermission,
  DriveReply,
  DriveRevision,
  FileListResponse,
  PermissionListResponse,
  RevisionListResponse,
  SharedDrive,
  SharedDriveListResponse
} from './types';

let FILE_FIELDS =
  'id,name,mimeType,description,starred,trashed,parents,webViewLink,webContentLink,iconLink,thumbnailLink,size,createdTime,modifiedTime,sharedWithMeTime,owners,lastModifyingUser,shared,capabilities';

/** Max bytes returned in one **Download File** response (base64 in JSON); avoids MCP / JSON payload limits. */
export let MAX_DRIVE_DOWNLOAD_BYTES = 6 * 1024 * 1024;

let mapFile = (raw: any): DriveFile => ({
  fileId: raw.id,
  name: raw.name,
  mimeType: raw.mimeType,
  description: raw.description,
  starred: raw.starred,
  trashed: raw.trashed,
  parents: raw.parents,
  webViewLink: raw.webViewLink,
  webContentLink: raw.webContentLink,
  iconLink: raw.iconLink,
  thumbnailLink: raw.thumbnailLink,
  size: raw.size,
  createdTime: raw.createdTime,
  modifiedTime: raw.modifiedTime,
  sharedWithMeTime: raw.sharedWithMeTime,
  owners: raw.owners?.map((o: any) => ({
    displayName: o.displayName,
    emailAddress: o.emailAddress,
    photoLink: o.photoLink,
    permissionId: o.permissionId
  })),
  lastModifyingUser: raw.lastModifyingUser
    ? {
        displayName: raw.lastModifyingUser.displayName,
        emailAddress: raw.lastModifyingUser.emailAddress,
        photoLink: raw.lastModifyingUser.photoLink,
        permissionId: raw.lastModifyingUser.permissionId
      }
    : undefined,
  shared: raw.shared,
  capabilities: raw.capabilities
});

let mapPermission = (raw: any): DrivePermission => ({
  permissionId: raw.id,
  role: raw.role,
  type: raw.type,
  emailAddress: raw.emailAddress,
  domain: raw.domain,
  displayName: raw.displayName,
  expirationTime: raw.expirationTime,
  allowFileDiscovery: raw.allowFileDiscovery
});

let mapComment = (raw: any): DriveComment => ({
  commentId: raw.id,
  content: raw.content,
  createdTime: raw.createdTime,
  modifiedTime: raw.modifiedTime,
  author: {
    displayName: raw.author?.displayName,
    emailAddress: raw.author?.emailAddress,
    photoLink: raw.author?.photoLink
  },
  resolved: raw.resolved || false,
  replies: raw.replies?.map(mapReply),
  quotedFileContent: raw.quotedFileContent,
  anchor: raw.anchor
});

let mapReply = (raw: any): DriveReply => ({
  replyId: raw.id,
  content: raw.content,
  createdTime: raw.createdTime,
  modifiedTime: raw.modifiedTime,
  author: {
    displayName: raw.author?.displayName,
    emailAddress: raw.author?.emailAddress,
    photoLink: raw.author?.photoLink
  },
  action: raw.action
});

let mapRevision = (raw: any): DriveRevision => ({
  revisionId: raw.id,
  mimeType: raw.mimeType,
  modifiedTime: raw.modifiedTime,
  lastModifyingUser: raw.lastModifyingUser
    ? {
        displayName: raw.lastModifyingUser.displayName,
        emailAddress: raw.lastModifyingUser.emailAddress,
        photoLink: raw.lastModifyingUser.photoLink
      }
    : undefined,
  size: raw.size,
  keepForever: raw.keepForever,
  publishAuto: raw.publishAuto,
  published: raw.published,
  originalFilename: raw.originalFilename
});

let mapSharedDrive = (raw: any): SharedDrive => ({
  driveId: raw.id,
  name: raw.name,
  createdTime: raw.createdTime,
  hidden: raw.hidden,
  capabilities: raw.capabilities,
  restrictions: raw.restrictions
});

let mapChange = (raw: any): DriveChange => ({
  changeId: raw.changeId || raw.id || '',
  type: raw.type,
  time: raw.time,
  removed: raw.removed || false,
  fileId: raw.fileId,
  file: raw.file ? mapFile(raw.file) : undefined,
  driveId: raw.driveId,
  drive: raw.drive ? mapSharedDrive(raw.drive) : undefined
});

function httpStatusFromAxiosError(e: unknown): number | undefined {
  let s = (e as { response?: { status?: number } })?.response?.status;
  return typeof s === 'number' ? s : undefined;
}

/** Replace generic axios 404 with something actionable (wrong id, wrong account, no access). */
function driveFileNotFoundError(fileId: string): Error {
  return new Error(
    `Drive returned 404 for file id "${fileId}". ` +
      `Google does not expose that id to the signed-in Google account (wrong id, deleted/trashed file, or different account than in the browser). ` +
      `Copy the id from the open tab URL (/file/d/…, /document/d/…, etc.), confirm Slates Hub / this app uses the same Google user, ` +
      `and check for typos (I vs l, O vs 0).`
  );
}

export class GoogleDriveClient {
  private api;
  private uploadApi;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: 'https://www.googleapis.com/drive/v3',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    this.uploadApi = createAxios({
      baseURL: 'https://www.googleapis.com/upload/drive/v3',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ---- Files ----

  async getFile(fileId: string): Promise<DriveFile> {
    let response = await this.api.get(`/files/${encodeURIComponent(fileId)}`, {
      params: { fields: FILE_FIELDS, supportsAllDrives: true }
    });
    return mapFile(response.data);
  }

  /** Minimal metadata for download/export guards (one cheap GET). */
  async getFileLightMeta(
    fileId: string
  ): Promise<{ mimeType?: string; size?: string; name?: string }> {
    try {
      let response = await this.api.get(`/files/${encodeURIComponent(fileId)}`, {
        params: { fields: 'mimeType,size,name', supportsAllDrives: true }
      });
      return {
        mimeType: response.data.mimeType,
        size: response.data.size,
        name: response.data.name
      };
    } catch (e) {
      if (httpStatusFromAxiosError(e) === 404) {
        throw driveFileNotFoundError(fileId);
      }
      throw e;
    }
  }

  async listFiles(params: {
    query?: string;
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
    driveId?: string;
    spaces?: string;
  }): Promise<FileListResponse> {
    let requestParams: Record<string, any> = {
      fields: `nextPageToken,incompleteSearch,files(${FILE_FIELDS})`,
      pageSize: params.pageSize || 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    };

    if (params.query) requestParams.q = params.query;
    if (params.pageToken) requestParams.pageToken = params.pageToken;
    if (params.orderBy) requestParams.orderBy = params.orderBy;
    if (params.driveId) {
      requestParams.driveId = params.driveId;
      requestParams.corpora = 'drive';
    }
    if (params.spaces) requestParams.spaces = params.spaces;

    let response = await this.api.get('/files', { params: requestParams });
    return {
      files: (response.data.files || []).map(mapFile),
      nextPageToken: response.data.nextPageToken,
      incompleteSearch: response.data.incompleteSearch
    };
  }

  async createFile(params: {
    name: string;
    mimeType?: string;
    parents?: string[];
    description?: string;
    starred?: boolean;
  }): Promise<DriveFile> {
    let response = await this.api.post(
      '/files',
      {
        name: params.name,
        mimeType: params.mimeType,
        parents: params.parents,
        description: params.description,
        starred: params.starred
      },
      {
        params: { fields: FILE_FIELDS, supportsAllDrives: true }
      }
    );
    return mapFile(response.data);
  }

  async uploadFile(params: {
    name: string;
    mimeType?: string;
    parents?: string[];
    description?: string;
    content: string;
    contentEncoding?: 'base64' | 'text';
    convertToGoogleFormat?: string;
  }): Promise<DriveFile> {
    let metadata: Record<string, any> = { name: params.name };
    if (params.parents) metadata.parents = params.parents;
    if (params.description) metadata.description = params.description;
    if (params.mimeType) metadata.mimeType = params.mimeType;

    let boundary = `-------slate_boundary_${Date.now()}`;
    let contentType = params.mimeType || 'application/octet-stream';

    let fileContent: string;
    if (params.contentEncoding === 'base64') {
      fileContent = atob(params.content);
    } else {
      fileContent = params.content;
    }

    let uploadParams: Record<string, any> = {
      uploadType: 'multipart',
      fields: FILE_FIELDS,
      supportsAllDrives: true
    };

    let body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n${fileContent}\r\n--${boundary}--`;

    let response = await this.uploadApi.post('/files', body, {
      params: uploadParams,
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      }
    });
    return mapFile(response.data);
  }

  async updateFile(
    fileId: string,
    params: {
      name?: string;
      mimeType?: string;
      description?: string;
      starred?: boolean;
      trashed?: boolean;
      addParents?: string[];
      removeParents?: string[];
    }
  ): Promise<DriveFile> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.mimeType !== undefined) body.mimeType = params.mimeType;
    if (params.description !== undefined) body.description = params.description;
    if (params.starred !== undefined) body.starred = params.starred;
    if (params.trashed !== undefined) body.trashed = params.trashed;

    let requestParams: Record<string, any> = {
      fields: FILE_FIELDS,
      supportsAllDrives: true
    };
    if (params.addParents?.length) requestParams.addParents = params.addParents.join(',');
    if (params.removeParents?.length)
      requestParams.removeParents = params.removeParents.join(',');

    let response = await this.api.patch(`/files/${encodeURIComponent(fileId)}`, body, {
      params: requestParams
    });
    return mapFile(response.data);
  }

  async copyFile(
    fileId: string,
    params: {
      name?: string;
      parents?: string[];
      description?: string;
    }
  ): Promise<DriveFile> {
    let body: Record<string, any> = {};
    if (params.name) body.name = params.name;
    if (params.parents) body.parents = params.parents;
    if (params.description) body.description = params.description;

    let response = await this.api.post(`/files/${encodeURIComponent(fileId)}/copy`, body, {
      params: { fields: FILE_FIELDS, supportsAllDrives: true }
    });
    return mapFile(response.data);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.api.delete(`/files/${encodeURIComponent(fileId)}`, {
      params: { supportsAllDrives: true }
    });
  }

  async emptyTrash(): Promise<void> {
    await this.api.delete('/files/trash');
  }

  async exportFile(
    fileId: string,
    exportMimeType: string
  ): Promise<{ contentBase64: string; mimeType?: string; byteLength: number }> {
    let response: any;
    try {
      response = await this.api.get(`/files/${encodeURIComponent(fileId)}/export`, {
        params: { mimeType: exportMimeType },
        responseType: 'arraybuffer'
      });
    } catch (e) {
      if (httpStatusFromAxiosError(e) === 404) {
        throw driveFileNotFoundError(fileId);
      }
      throw e;
    }
    let buf = Buffer.from(response.data as ArrayBuffer);
    let ct = response.headers['content-type'];
    let mimeType = Array.isArray(ct) ? ct[0] : ct;
    return {
      contentBase64: buf.toString('base64'),
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      byteLength: buf.length
    };
  }

  async downloadFile(
    fileId: string
  ): Promise<{ contentBase64: string; mimeType?: string; byteLength: number }> {
    let meta = await this.getFileLightMeta(fileId);
    if (meta.mimeType?.startsWith('application/vnd.google-apps.')) {
      throw new Error(
        `This file is Google Workspace format (${meta.mimeType}${meta.name ? `, "${meta.name}"` : ''}). ` +
          `Drive does not allow \`alt=media\` download for Docs/Sheets/Slides/etc. Use the **Export File** tool instead ` +
          `(e.g. \`text/plain\`, \`application/pdf\`, or DOCX/XLSX depending on the source type).`
      );
    }
    let declaredBytes =
      meta.size !== undefined && meta.size !== '' ? Number(meta.size) : Number.NaN;
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_DRIVE_DOWNLOAD_BYTES) {
      throw new Error(
        `File size (~${declaredBytes} bytes) exceeds this tool’s limit of ${MAX_DRIVE_DOWNLOAD_BYTES} bytes for MCP-safe JSON payloads. Download via another path or split the file.`
      );
    }

    let response: any;
    try {
      response = await this.api.get(`/files/${encodeURIComponent(fileId)}`, {
        params: { alt: 'media', supportsAllDrives: true },
        responseType: 'arraybuffer'
      });
    } catch (e) {
      if (httpStatusFromAxiosError(e) === 404) {
        throw driveFileNotFoundError(fileId);
      }
      throw e;
    }
    let buf = Buffer.from(response.data as ArrayBuffer);
    if (buf.length > MAX_DRIVE_DOWNLOAD_BYTES) {
      throw new Error(
        `Downloaded ${buf.length} bytes, which exceeds the tool limit of ${MAX_DRIVE_DOWNLOAD_BYTES} bytes for MCP-safe JSON.`
      );
    }
    let ct = response.headers['content-type'];
    let mimeType = Array.isArray(ct) ? ct[0] : ct;
    return {
      contentBase64: buf.toString('base64'),
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      byteLength: buf.length
    };
  }

  async generateFileIds(count: number = 1, space?: string): Promise<string[]> {
    let response = await this.api.get('/files/generateIds', {
      params: { count, space }
    });
    return response.data.ids;
  }

  // ---- Permissions ----

  async listPermissions(
    fileId: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<PermissionListResponse> {
    let response = await this.api.get(`/files/${encodeURIComponent(fileId)}/permissions`, {
      params: {
        fields:
          'nextPageToken,permissions(id,role,type,emailAddress,domain,displayName,expirationTime,allowFileDiscovery)',
        pageSize: params?.pageSize || 100,
        pageToken: params?.pageToken,
        supportsAllDrives: true
      }
    });
    return {
      permissions: (response.data.permissions || []).map(mapPermission),
      nextPageToken: response.data.nextPageToken
    };
  }

  async createPermission(
    fileId: string,
    params: {
      role: string;
      type: string;
      emailAddress?: string;
      domain?: string;
      allowFileDiscovery?: boolean;
      sendNotificationEmail?: boolean;
      emailMessage?: string;
      transferOwnership?: boolean;
      moveToNewOwnersRoot?: boolean;
    }
  ): Promise<DrivePermission> {
    let body: Record<string, any> = {
      role: params.role,
      type: params.type
    };
    if (params.emailAddress) body.emailAddress = params.emailAddress;
    if (params.domain) body.domain = params.domain;
    if (params.allowFileDiscovery !== undefined)
      body.allowFileDiscovery = params.allowFileDiscovery;

    let queryParams: Record<string, any> = {
      fields: 'id,role,type,emailAddress,domain,displayName,expirationTime,allowFileDiscovery',
      supportsAllDrives: true
    };
    if (params.sendNotificationEmail !== undefined)
      queryParams.sendNotificationEmail = params.sendNotificationEmail;
    if (params.emailMessage) queryParams.emailMessage = params.emailMessage;
    if (params.transferOwnership !== undefined)
      queryParams.transferOwnership = params.transferOwnership;
    if (params.moveToNewOwnersRoot !== undefined)
      queryParams.moveToNewOwnersRoot = params.moveToNewOwnersRoot;

    let response = await this.api.post(
      `/files/${encodeURIComponent(fileId)}/permissions`,
      body,
      {
        params: queryParams
      }
    );
    return mapPermission(response.data);
  }

  async updatePermission(
    fileId: string,
    permissionId: string,
    params: {
      role: string;
      transferOwnership?: boolean;
    }
  ): Promise<DrivePermission> {
    let queryParams: Record<string, any> = {
      fields: 'id,role,type,emailAddress,domain,displayName,expirationTime,allowFileDiscovery',
      supportsAllDrives: true
    };
    if (params.transferOwnership !== undefined)
      queryParams.transferOwnership = params.transferOwnership;

    let response = await this.api.patch(
      `/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
      { role: params.role },
      { params: queryParams }
    );
    return mapPermission(response.data);
  }

  async deletePermission(fileId: string, permissionId: string): Promise<void> {
    await this.api.delete(
      `/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
      { params: { supportsAllDrives: true } }
    );
  }

  // ---- Comments ----

  async listComments(
    fileId: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
      includeDeleted?: boolean;
    }
  ): Promise<CommentListResponse> {
    let response = await this.api.get(`/files/${encodeURIComponent(fileId)}/comments`, {
      params: {
        fields:
          'nextPageToken,comments(id,content,createdTime,modifiedTime,author,resolved,replies,quotedFileContent,anchor)',
        pageSize: params?.pageSize || 100,
        pageToken: params?.pageToken,
        includeDeleted: params?.includeDeleted
      }
    });
    return {
      comments: (response.data.comments || []).map(mapComment),
      nextPageToken: response.data.nextPageToken
    };
  }

  async createComment(
    fileId: string,
    params: {
      content: string;
      anchor?: string;
      quotedFileContent?: { mimeType: string; value: string };
    }
  ): Promise<DriveComment> {
    let response = await this.api.post(
      `/files/${encodeURIComponent(fileId)}/comments`,
      {
        content: params.content,
        anchor: params.anchor,
        quotedFileContent: params.quotedFileContent
      },
      {
        params: {
          fields:
            'id,content,createdTime,modifiedTime,author,resolved,replies,quotedFileContent,anchor'
        }
      }
    );
    return mapComment(response.data);
  }

  async updateComment(
    fileId: string,
    commentId: string,
    content: string
  ): Promise<DriveComment> {
    let response = await this.api.patch(
      `/files/${encodeURIComponent(fileId)}/comments/${encodeURIComponent(commentId)}`,
      { content },
      {
        params: {
          fields:
            'id,content,createdTime,modifiedTime,author,resolved,replies,quotedFileContent,anchor'
        }
      }
    );
    return mapComment(response.data);
  }

  async deleteComment(fileId: string, commentId: string): Promise<void> {
    await this.api.delete(
      `/files/${encodeURIComponent(fileId)}/comments/${encodeURIComponent(commentId)}`
    );
  }

  async createReply(
    fileId: string,
    commentId: string,
    params: {
      content: string;
      action?: string;
    }
  ): Promise<DriveReply> {
    let response = await this.api.post(
      `/files/${encodeURIComponent(fileId)}/comments/${encodeURIComponent(commentId)}/replies`,
      { content: params.content, action: params.action },
      { params: { fields: 'id,content,createdTime,modifiedTime,author,action' } }
    );
    return mapReply(response.data);
  }

  async deleteReply(fileId: string, commentId: string, replyId: string): Promise<void> {
    await this.api.delete(
      `/files/${encodeURIComponent(fileId)}/comments/${encodeURIComponent(commentId)}/replies/${encodeURIComponent(replyId)}`
    );
  }

  // ---- Revisions ----

  async listRevisions(
    fileId: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<RevisionListResponse> {
    let response = await this.api.get(`/files/${encodeURIComponent(fileId)}/revisions`, {
      params: {
        fields:
          'nextPageToken,revisions(id,mimeType,modifiedTime,lastModifyingUser,size,keepForever,publishAuto,published,originalFilename)',
        pageSize: params?.pageSize || 100,
        pageToken: params?.pageToken
      }
    });
    return {
      revisions: (response.data.revisions || []).map(mapRevision),
      nextPageToken: response.data.nextPageToken
    };
  }

  async getRevision(fileId: string, revisionId: string): Promise<DriveRevision> {
    let response = await this.api.get(
      `/files/${encodeURIComponent(fileId)}/revisions/${encodeURIComponent(revisionId)}`,
      {
        params: {
          fields:
            'id,mimeType,modifiedTime,lastModifyingUser,size,keepForever,publishAuto,published,originalFilename'
        }
      }
    );
    return mapRevision(response.data);
  }

  async updateRevision(
    fileId: string,
    revisionId: string,
    params: {
      keepForever?: boolean;
      publishAuto?: boolean;
      published?: boolean;
    }
  ): Promise<DriveRevision> {
    let response = await this.api.patch(
      `/files/${encodeURIComponent(fileId)}/revisions/${encodeURIComponent(revisionId)}`,
      params,
      {
        params: {
          fields:
            'id,mimeType,modifiedTime,lastModifyingUser,size,keepForever,publishAuto,published,originalFilename'
        }
      }
    );
    return mapRevision(response.data);
  }

  async deleteRevision(fileId: string, revisionId: string): Promise<void> {
    await this.api.delete(
      `/files/${encodeURIComponent(fileId)}/revisions/${encodeURIComponent(revisionId)}`
    );
  }

  // ---- Shared Drives ----

  async listSharedDrives(params?: {
    pageSize?: number;
    pageToken?: string;
    query?: string;
  }): Promise<SharedDriveListResponse> {
    let response = await this.api.get('/drives', {
      params: {
        fields: 'nextPageToken,drives(id,name,createdTime,hidden,capabilities,restrictions)',
        pageSize: params?.pageSize || 100,
        pageToken: params?.pageToken,
        q: params?.query
      }
    });
    return {
      drives: (response.data.drives || []).map(mapSharedDrive),
      nextPageToken: response.data.nextPageToken
    };
  }

  async getSharedDrive(driveId: string): Promise<SharedDrive> {
    let response = await this.api.get(`/drives/${encodeURIComponent(driveId)}`, {
      params: { fields: 'id,name,createdTime,hidden,capabilities,restrictions' }
    });
    return mapSharedDrive(response.data);
  }

  async createSharedDrive(name: string, requestId: string): Promise<SharedDrive> {
    let response = await this.api.post(
      '/drives',
      { name },
      {
        params: {
          requestId,
          fields: 'id,name,createdTime,hidden,capabilities,restrictions'
        }
      }
    );
    return mapSharedDrive(response.data);
  }

  async updateSharedDrive(
    driveId: string,
    params: {
      name?: string;
      restrictions?: Record<string, boolean>;
    }
  ): Promise<SharedDrive> {
    let response = await this.api.patch(`/drives/${encodeURIComponent(driveId)}`, params, {
      params: { fields: 'id,name,createdTime,hidden,capabilities,restrictions' }
    });
    return mapSharedDrive(response.data);
  }

  async deleteSharedDrive(driveId: string): Promise<void> {
    await this.api.delete(`/drives/${encodeURIComponent(driveId)}`);
  }

  // ---- Changes ----

  async getStartPageToken(driveId?: string): Promise<string> {
    let params: Record<string, any> = { supportsAllDrives: true };
    if (driveId) {
      params.driveId = driveId;
    }
    let response = await this.api.get('/changes/startPageToken', { params });
    return response.data.startPageToken;
  }

  async listChanges(
    pageToken: string,
    params?: {
      pageSize?: number;
      driveId?: string;
      includeRemoved?: boolean;
      spaces?: string;
    }
  ): Promise<ChangeListResponse> {
    let requestParams: Record<string, any> = {
      pageToken,
      fields: `nextPageToken,newStartPageToken,changes(changeId,type,time,removed,fileId,file(${FILE_FIELDS}),driveId,drive(id,name,createdTime))`,
      pageSize: params?.pageSize || 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    };
    if (params?.driveId) requestParams.driveId = params.driveId;
    if (params?.includeRemoved !== undefined)
      requestParams.includeRemoved = params.includeRemoved;
    if (params?.spaces) requestParams.spaces = params.spaces;

    let response = await this.api.get('/changes', { params: requestParams });
    return {
      changes: (response.data.changes || []).map(mapChange),
      nextPageToken: response.data.nextPageToken,
      newStartPageToken: response.data.newStartPageToken
    };
  }

  // ---- Watch (Push Notifications) ----

  async watchChanges(
    pageToken: string,
    webhookUrl: string,
    channelId: string,
    params?: {
      expiration?: string;
      driveId?: string;
    }
  ): Promise<{
    channelId: string;
    resourceId: string;
    expiration: string;
  }> {
    let body: Record<string, any> = {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl
    };
    if (params?.expiration) body.expiration = params.expiration;

    let requestParams: Record<string, any> = {
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    };
    if (params?.driveId) requestParams.driveId = params.driveId;

    let response = await this.api.post('/changes/watch', body, { params: requestParams });
    return {
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration
    };
  }

  async stopChannel(channelId: string, resourceId: string): Promise<void> {
    await this.api.post('/channels/stop', {
      id: channelId,
      resourceId
    });
  }

  // ---- About ----

  async getAbout(): Promise<{
    userId: string;
    displayName: string;
    emailAddress: string;
    storageQuotaLimit?: string;
    storageQuotaUsage?: string;
  }> {
    let response = await this.api.get('/about', {
      params: { fields: 'user,storageQuota' }
    });
    return {
      userId: response.data.user?.permissionId,
      displayName: response.data.user?.displayName,
      emailAddress: response.data.user?.emailAddress,
      storageQuotaLimit: response.data.storageQuota?.limit,
      storageQuotaUsage: response.data.storageQuota?.usage
    };
  }
}
