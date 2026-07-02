import { createAxios, getResponseHeaderValue } from 'slates';
import { dropboxApiError } from './errors';

type UploadMode = 'add' | 'overwrite' | 'update';
type UploadContent = string | Uint8Array | Buffer;
type TaggedValue<T extends string = string> = { '.tag': T };
type WriteModeValue = UploadMode | (TaggedValue<'update'> & { update: string });

type SharedLinkSettings = {
  requestedVisibility?: string;
  audience?: string;
  access?: string;
  allowDownload?: boolean;
  password?: string;
  expires?: string;
};

let tag = <T extends string>(value: T): TaggedValue<T> => ({ '.tag': value });

let normalizeRootPath = (path: string) => (path === '/' ? '' : path);

let toWriteMode = (mode: UploadMode, rev?: string): WriteModeValue => {
  if (mode !== 'update') return mode;

  return {
    '.tag': 'update',
    update: rev ?? ''
  };
};

let toBase64 = (data: unknown) => {
  if (Buffer.isBuffer(data)) return data.toString('base64');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('base64');
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
  }
  if (typeof data === 'string') return Buffer.from(data, 'binary').toString('base64');
  return Buffer.from(String(data)).toString('base64');
};

export class DropboxClient {
  private api: ReturnType<typeof createAxios>;
  private content: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: 'https://api.dropboxapi.com/2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    this.content = createAxios({
      baseURL: 'https://content.dropboxapi.com/2',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private async apiPost(path: string, data: unknown, operation: string) {
    try {
      let response = await this.api.post(path, data);
      return response.data;
    } catch (error) {
      throw dropboxApiError(error, operation);
    }
  }

  private async contentPost(
    path: string,
    data: unknown,
    config: Record<string, unknown>,
    operation: string
  ) {
    try {
      return await this.content.post(path, data, config);
    } catch (error) {
      throw dropboxApiError(error, operation);
    }
  }

  // Files & folders

  async listFolder(path: string, recursive: boolean = false, limit?: number) {
    return await this.apiPost(
      '/files/list_folder',
      {
        path: normalizeRootPath(path),
        recursive,
        include_mounted_folders: true,
        include_non_downloadable_files: true,
        ...(limit ? { limit } : {})
      },
      'list folder'
    );
  }

  async listFolderContinue(cursor: string) {
    return await this.apiPost(
      '/files/list_folder/continue',
      { cursor },
      'continue folder listing'
    );
  }

  async getMetadata(path: string) {
    return await this.apiPost(
      '/files/get_metadata',
      {
        path,
        include_media_info: true,
        include_has_explicit_shared_members: true
      },
      'get metadata'
    );
  }

  async createFolder(path: string, autorename: boolean = false) {
    return await this.apiPost(
      '/files/create_folder_v2',
      {
        path,
        autorename
      },
      'create folder'
    );
  }

  async deleteFile(path: string) {
    return await this.apiPost('/files/delete_v2', { path }, 'delete file or folder');
  }

  async moveFile(
    fromPath: string,
    toPath: string,
    autorename: boolean = false,
    allowOwnershipTransfer: boolean = false
  ) {
    return await this.apiPost(
      '/files/move_v2',
      {
        from_path: fromPath,
        to_path: toPath,
        autorename,
        allow_ownership_transfer: allowOwnershipTransfer
      },
      'move file or folder'
    );
  }

  async copyFile(
    fromPath: string,
    toPath: string,
    autorename: boolean = false,
    allowOwnershipTransfer: boolean = false
  ) {
    return await this.apiPost(
      '/files/copy_v2',
      {
        from_path: fromPath,
        to_path: toPath,
        autorename,
        allow_ownership_transfer: allowOwnershipTransfer
      },
      'copy file or folder'
    );
  }

  async uploadFile(
    path: string,
    content: UploadContent,
    mode: UploadMode = 'add',
    autorename: boolean = false,
    mute: boolean = false,
    options?: {
      rev?: string;
      contentHash?: string;
      clientModified?: string;
    }
  ) {
    let response = await this.contentPost(
      '/files/upload',
      content,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path,
            mode: toWriteMode(mode, options?.rev),
            autorename,
            mute,
            strict_conflict: false,
            ...(options?.clientModified ? { client_modified: options.clientModified } : {}),
            ...(options?.contentHash ? { content_hash: options.contentHash } : {})
          })
        }
      },
      'upload file'
    );
    return response.data;
  }

  async downloadFile(path: string) {
    let response = await this.contentPost(
      '/files/download',
      null,
      {
        headers: {
          'Dropbox-API-Arg': JSON.stringify({ path })
        },
        responseType: 'arraybuffer'
      },
      'download file'
    );
    let headers = response.headers as Record<string, unknown>;
    let metadata = getResponseHeaderValue(headers, 'dropbox-api-result');
    let parsedMetadata = metadata ? JSON.parse(metadata) : {};
    return {
      metadata: parsedMetadata,
      contentBase64: toBase64(response.data),
      contentType: getResponseHeaderValue(headers, 'content-type')
    };
  }

  async getTemporaryLink(path: string) {
    return await this.apiPost('/files/get_temporary_link', { path }, 'get temporary link');
  }

  async getThumbnail(
    path: string,
    options?: {
      format?: string;
      size?: string;
      mode?: string;
      quality?: string;
      excludeMediaInfo?: boolean;
    }
  ) {
    let response = await this.contentPost(
      '/files/get_thumbnail_v2',
      null,
      {
        headers: {
          'Dropbox-API-Arg': JSON.stringify({
            resource: {
              '.tag': 'path',
              path
            },
            format: tag(options?.format ?? 'jpeg'),
            size: tag(options?.size ?? 'w64h64'),
            mode: tag(options?.mode ?? 'strict'),
            quality: tag(options?.quality ?? 'quality_80'),
            ...(options?.excludeMediaInfo !== undefined
              ? { exclude_media_info: options.excludeMediaInfo }
              : {})
          })
        },
        responseType: 'arraybuffer'
      },
      'get thumbnail'
    );
    let headers = response.headers as Record<string, unknown>;
    let metadata = getResponseHeaderValue(headers, 'dropbox-api-result');
    let parsedMetadata = metadata ? JSON.parse(metadata) : {};
    return {
      metadata: parsedMetadata.file_metadata ?? parsedMetadata.link_metadata ?? {},
      contentBase64: toBase64(response.data),
      contentType: getResponseHeaderValue(headers, 'content-type')
    };
  }

  async startUploadSession(
    content: UploadContent,
    close: boolean = false,
    contentHash?: string
  ) {
    let response = await this.contentPost(
      '/files/upload_session/start',
      content,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            close,
            ...(contentHash ? { content_hash: contentHash } : {})
          })
        }
      },
      'start upload session'
    );
    return response.data;
  }

  async appendUploadSession(
    sessionId: string,
    offset: number,
    content: UploadContent,
    close: boolean = false,
    contentHash?: string
  ) {
    let response = await this.contentPost(
      '/files/upload_session/append_v2',
      content,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            cursor: {
              session_id: sessionId,
              offset
            },
            close,
            ...(contentHash ? { content_hash: contentHash } : {})
          })
        }
      },
      'append upload session'
    );
    return response.data;
  }

  async finishUploadSession(
    sessionId: string,
    offset: number,
    path: string,
    content: UploadContent,
    options?: {
      mode?: UploadMode;
      rev?: string;
      autorename?: boolean;
      mute?: boolean;
      contentHash?: string;
      clientModified?: string;
    }
  ) {
    let response = await this.contentPost(
      '/files/upload_session/finish',
      content,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            cursor: {
              session_id: sessionId,
              offset
            },
            commit: {
              path,
              mode: toWriteMode(options?.mode ?? 'add', options?.rev),
              autorename: options?.autorename ?? false,
              mute: options?.mute ?? false,
              ...(options?.clientModified ? { client_modified: options.clientModified } : {})
            },
            ...(options?.contentHash ? { content_hash: options.contentHash } : {})
          })
        }
      },
      'finish upload session'
    );
    return response.data;
  }

  // Search

  async searchFiles(
    query: string,
    path?: string,
    maxResults?: number,
    fileCategories?: string[]
  ) {
    let options: Record<string, any> = {};
    if (path) options.path = path;
    if (maxResults) options.max_results = maxResults;
    if (fileCategories && fileCategories.length > 0) options.file_categories = fileCategories;

    return await this.apiPost(
      '/files/search_v2',
      {
        query,
        options: Object.keys(options).length > 0 ? options : undefined
      },
      'search files'
    );
  }

  async searchFilesContinue(cursor: string) {
    return await this.apiPost('/files/search/continue_v2', { cursor }, 'continue file search');
  }

  // File revisions

  async listRevisions(path: string, limit?: number, mode: 'path' | 'id' = 'path') {
    return await this.apiPost(
      '/files/list_revisions',
      {
        path,
        mode: tag(mode),
        ...(limit ? { limit } : {})
      },
      'list file revisions'
    );
  }

  async restoreRevision(path: string, rev: string) {
    return await this.apiPost('/files/restore', { path, rev }, 'restore file revision');
  }

  // Sharing

  async createSharedLink(path: string, settings?: SharedLinkSettings) {
    let requestSettings: Record<string, any> = {};
    if (settings?.requestedVisibility) {
      requestSettings.requested_visibility = tag(settings.requestedVisibility);
    }
    if (settings?.audience) requestSettings.audience = tag(settings.audience);
    if (settings?.access) requestSettings.access = tag(settings.access);
    if (settings?.allowDownload !== undefined) {
      requestSettings.allow_download = settings.allowDownload;
    }
    if (settings?.password) {
      requestSettings.require_password = true;
      requestSettings.link_password = settings.password;
    }
    if (settings?.expires) requestSettings.expires = settings.expires;

    return await this.apiPost(
      '/sharing/create_shared_link_with_settings',
      {
        path,
        settings: Object.keys(requestSettings).length > 0 ? requestSettings : undefined
      },
      'create shared link'
    );
  }

  async listSharedLinks(path?: string, cursor?: string, directOnly?: boolean) {
    let body: Record<string, any> = {};
    if (path) body.path = path;
    if (cursor) body.cursor = cursor;
    if (directOnly !== undefined) body.direct_only = directOnly;

    return await this.apiPost('/sharing/list_shared_links', body, 'list shared links');
  }

  async revokeSharedLink(url: string) {
    await this.apiPost('/sharing/revoke_shared_link', { url }, 'revoke shared link');
  }

  async shareFolder(
    path: string,
    memberPolicy?: string,
    aclUpdatePolicy?: string,
    sharedLinkPolicy?: string,
    forceAsync: boolean = false
  ) {
    let body: Record<string, any> = { path, force_async: forceAsync };
    if (memberPolicy) body.member_policy = tag(memberPolicy);
    if (aclUpdatePolicy) body.acl_update_policy = tag(aclUpdatePolicy);
    if (sharedLinkPolicy) body.shared_link_policy = tag(sharedLinkPolicy);

    return await this.apiPost('/sharing/share_folder', body, 'share folder');
  }

  async addFolderMember(
    sharedFolderId: string,
    members: { email: string; accessLevel?: string }[],
    quiet: boolean = false,
    customMessage?: string
  ) {
    return await this.apiPost(
      '/sharing/add_folder_member',
      {
        shared_folder_id: sharedFolderId,
        members: members.map(m => ({
          member: { '.tag': 'email', email: m.email },
          access_level: tag(m.accessLevel || 'viewer')
        })),
        quiet,
        custom_message: customMessage
      },
      'add shared folder member'
    );
  }

  async removeFolderMember(
    sharedFolderId: string,
    memberEmail: string,
    leaveACopy: boolean = false
  ) {
    return await this.apiPost(
      '/sharing/remove_folder_member',
      {
        shared_folder_id: sharedFolderId,
        member: { '.tag': 'email', email: memberEmail },
        leave_a_copy: leaveACopy
      },
      'remove shared folder member'
    );
  }

  async listFolderMembers(sharedFolderId: string, limit?: number) {
    let body: Record<string, any> = { shared_folder_id: sharedFolderId };
    if (limit) body.limit = limit;

    return await this.apiPost(
      '/sharing/list_folder_members',
      body,
      'list shared folder members'
    );
  }

  // File requests

  async createFileRequest(
    title: string,
    destination: string,
    deadline?: string,
    open: boolean = true,
    description?: string
  ) {
    let body: Record<string, any> = {
      title,
      destination,
      open
    };
    if (deadline) body.deadline = { deadline };
    if (description) body.description = description;

    return await this.apiPost('/file_requests/create', body, 'create file request');
  }

  async listFileRequests(limit?: number) {
    return await this.apiPost(
      '/file_requests/list_v2',
      {
        limit: limit ?? 1000
      },
      'list file requests'
    );
  }

  async listFileRequestsContinue(cursor: string) {
    return await this.apiPost(
      '/file_requests/list/continue',
      { cursor },
      'continue file request listing'
    );
  }

  async getFileRequest(fileRequestId: string) {
    return await this.apiPost('/file_requests/get', { id: fileRequestId }, 'get file request');
  }

  async updateFileRequest(
    fileRequestId: string,
    updates: {
      title?: string;
      destination?: string;
      deadline?: string | null;
      open?: boolean;
      description?: string;
    }
  ) {
    let body: Record<string, any> = { id: fileRequestId };
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.destination !== undefined) body.destination = updates.destination;
    if (updates.open !== undefined) body.open = updates.open;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.deadline !== undefined) {
      body.deadline =
        updates.deadline === null
          ? { '.tag': 'update', update: null }
          : { '.tag': 'update', update: { deadline: updates.deadline } };
    }

    return await this.apiPost('/file_requests/update', body, 'update file request');
  }

  async deleteFileRequests(fileRequestIds: string[]) {
    return await this.apiPost(
      '/file_requests/delete',
      { ids: fileRequestIds },
      'delete file requests'
    );
  }

  // Account

  async getCurrentAccount() {
    return await this.apiPost('/users/get_current_account', null, 'get current account');
  }

  async getSpaceUsage() {
    return await this.apiPost('/users/get_space_usage', null, 'get space usage');
  }

  async getAccount(accountId: string) {
    return await this.apiPost('/users/get_account', { account_id: accountId }, 'get account');
  }

  // Polling / list folder cursors

  async listFolderGetLatestCursor(path: string, recursive: boolean = false) {
    return await this.apiPost(
      '/files/list_folder/get_latest_cursor',
      {
        path: normalizeRootPath(path),
        recursive,
        include_mounted_folders: true,
        include_non_downloadable_files: true
      },
      'get latest folder cursor'
    );
  }
}
