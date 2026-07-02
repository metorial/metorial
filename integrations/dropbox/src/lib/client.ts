import { createAxios } from 'slates';

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

  // ── Files & Folders ──────────────────────────────────────────

  async listFolder(path: string, recursive: boolean = false, limit?: number) {
    let response = await this.api.post('/files/list_folder', {
      path: path === '/' ? '' : path,
      recursive,
      include_mounted_folders: true,
      include_non_downloadable_files: true,
      ...(limit ? { limit } : {})
    });
    return response.data;
  }

  async listFolderContinue(cursor: string) {
    let response = await this.api.post('/files/list_folder/continue', { cursor });
    return response.data;
  }

  async getMetadata(path: string) {
    let response = await this.api.post('/files/get_metadata', {
      path,
      include_media_info: true,
      include_has_explicit_shared_members: true
    });
    return response.data;
  }

  async createFolder(path: string, autorename: boolean = false) {
    let response = await this.api.post('/files/create_folder_v2', {
      path,
      autorename
    });
    return response.data;
  }

  async deleteFile(path: string) {
    let response = await this.api.post('/files/delete_v2', { path });
    return response.data;
  }

  async moveFile(
    fromPath: string,
    toPath: string,
    autorename: boolean = false,
    allowOwnershipTransfer: boolean = false
  ) {
    let response = await this.api.post('/files/move_v2', {
      from_path: fromPath,
      to_path: toPath,
      autorename,
      allow_ownership_transfer: allowOwnershipTransfer
    });
    return response.data;
  }

  async copyFile(
    fromPath: string,
    toPath: string,
    autorename: boolean = false,
    allowOwnershipTransfer: boolean = false
  ) {
    let response = await this.api.post('/files/copy_v2', {
      from_path: fromPath,
      to_path: toPath,
      autorename,
      allow_ownership_transfer: allowOwnershipTransfer
    });
    return response.data;
  }

  async uploadFile(
    path: string,
    content: string,
    mode: string = 'add',
    autorename: boolean = false,
    mute: boolean = false
  ) {
    let response = await this.content.post('/files/upload', content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode,
          autorename,
          mute,
          strict_conflict: false
        })
      }
    });
    return response.data;
  }

  async downloadFile(path: string) {
    let response = await this.content.post('/files/download', null, {
      headers: {
        'Dropbox-API-Arg': JSON.stringify({ path })
      },
      responseType: 'text'
    });
    let metadata = response.headers['dropbox-api-result'];
    let parsedMetadata = metadata ? JSON.parse(metadata) : {};
    return {
      metadata: parsedMetadata,
      content: response.data
    };
  }

  // ── Search ───────────────────────────────────────────────────

  async searchFiles(
    query: string,
    path?: string,
    maxResults?: number,
    fileCategories?: string[]
  ) {
    let options: Record<string, any> = {};
    if (path) {
      options.path = path;
    }
    if (maxResults) {
      options.max_results = maxResults;
    }
    if (fileCategories && fileCategories.length > 0) {
      options.file_categories = fileCategories;
    }

    let response = await this.api.post('/files/search_v2', {
      query,
      options: Object.keys(options).length > 0 ? options : undefined
    });
    return response.data;
  }

  // ── File Revisions ───────────────────────────────────────────

  async listRevisions(path: string, limit?: number) {
    let response = await this.api.post('/files/list_revisions', {
      path,
      mode: { '.tag': 'path' },
      ...(limit ? { limit } : {})
    });
    return response.data;
  }

  async restoreRevision(path: string, rev: string) {
    let response = await this.api.post('/files/restore', { path, rev });
    return response.data;
  }

  // ── Sharing ──────────────────────────────────────────────────

  async createSharedLink(
    path: string,
    settings?: {
      requestedVisibility?: string;
      audience?: string;
      access?: string;
      allowDownload?: boolean;
      password?: string;
      expires?: string;
    }
  ) {
    let requestSettings: Record<string, any> = {};
    if (settings?.requestedVisibility) {
      requestSettings.requested_visibility = { '.tag': settings.requestedVisibility };
    }
    if (settings?.audience) {
      requestSettings.audience = { '.tag': settings.audience };
    }
    if (settings?.access) {
      requestSettings.access = { '.tag': settings.access };
    }
    if (settings?.allowDownload !== undefined) {
      requestSettings.allow_download = settings.allowDownload;
    }
    if (settings?.password) {
      requestSettings.link_password = settings.password;
    }
    if (settings?.expires) {
      requestSettings.expires = settings.expires;
    }

    let response = await this.api.post('/sharing/create_shared_link_with_settings', {
      path,
      settings: Object.keys(requestSettings).length > 0 ? requestSettings : undefined
    });
    return response.data;
  }

  async listSharedLinks(path?: string, cursor?: string, directOnly?: boolean) {
    let body: Record<string, any> = {};
    if (path) body.path = path;
    if (cursor) body.cursor = cursor;
    if (directOnly !== undefined) body.direct_only = directOnly;

    let response = await this.api.post('/sharing/list_shared_links', body);
    return response.data;
  }

  async revokeSharedLink(url: string) {
    await this.api.post('/sharing/revoke_shared_link', { url });
  }

  async shareFolder(
    path: string,
    memberPolicy?: string,
    aclUpdatePolicy?: string,
    sharedLinkPolicy?: string,
    forceAsync: boolean = false
  ) {
    let body: Record<string, any> = { path, force_async: forceAsync };
    if (memberPolicy) body.member_policy = { '.tag': memberPolicy };
    if (aclUpdatePolicy) body.acl_update_policy = { '.tag': aclUpdatePolicy };
    if (sharedLinkPolicy) body.shared_link_policy = { '.tag': sharedLinkPolicy };

    let response = await this.api.post('/sharing/share_folder', body);
    return response.data;
  }

  async addFolderMember(
    sharedFolderId: string,
    members: { email: string; accessLevel?: string }[],
    quiet: boolean = false,
    customMessage?: string
  ) {
    let response = await this.api.post('/sharing/add_folder_member', {
      shared_folder_id: sharedFolderId,
      members: members.map(m => ({
        member: { '.tag': 'email', email: m.email },
        access_level: { '.tag': m.accessLevel || 'viewer' }
      })),
      quiet,
      custom_message: customMessage
    });
    return response.data;
  }

  async removeFolderMember(
    sharedFolderId: string,
    memberEmail: string,
    leaveACopy: boolean = false
  ) {
    let response = await this.api.post('/sharing/remove_folder_member', {
      shared_folder_id: sharedFolderId,
      member: { '.tag': 'email', email: memberEmail },
      leave_a_copy: leaveACopy
    });
    return response.data;
  }

  async listFolderMembers(sharedFolderId: string, limit?: number) {
    let body: Record<string, any> = { shared_folder_id: sharedFolderId };
    if (limit) body.limit = limit;

    let response = await this.api.post('/sharing/list_folder_members', body);
    return response.data;
  }

  // ── File Requests ────────────────────────────────────────────

  async createFileRequest(
    title: string,
    destination: string,
    deadline?: string,
    open: boolean = true
  ) {
    let body: Record<string, any> = {
      title,
      destination,
      open
    };
    if (deadline) {
      body.deadline = { deadline };
    }

    let response = await this.api.post('/file_requests/create', body);
    return response.data;
  }

  async listFileRequests() {
    let response = await this.api.post('/file_requests/list_v2', {
      limit: 1000
    });
    return response.data;
  }

  async getFileRequest(fileRequestId: string) {
    let response = await this.api.post('/file_requests/get', { id: fileRequestId });
    return response.data;
  }

  async updateFileRequest(
    fileRequestId: string,
    updates: { title?: string; destination?: string; deadline?: string | null; open?: boolean }
  ) {
    let body: Record<string, any> = { id: fileRequestId };
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.destination !== undefined) body.destination = updates.destination;
    if (updates.open !== undefined) body.open = updates.open;
    if (updates.deadline !== undefined) {
      body.deadline =
        updates.deadline === null ? { '.tag': 'no_deadline' } : { deadline: updates.deadline };
    }

    let response = await this.api.post('/file_requests/update', body);
    return response.data;
  }

  async deleteFileRequests(fileRequestIds: string[]) {
    let response = await this.api.post('/file_requests/delete', { ids: fileRequestIds });
    return response.data;
  }

  // ── Account ──────────────────────────────────────────────────

  async getCurrentAccount() {
    let response = await this.api.post('/users/get_current_account', null);
    return response.data;
  }

  async getSpaceUsage() {
    let response = await this.api.post('/users/get_space_usage', null);
    return response.data;
  }

  async getAccount(accountId: string) {
    let response = await this.api.post('/users/get_account', { account_id: accountId });
    return response.data;
  }

  // ── Polling / List folder longpoll ───────────────────────────

  async listFolderGetLatestCursor(path: string, recursive: boolean = false) {
    let response = await this.api.post('/files/list_folder/get_latest_cursor', {
      path: path === '/' ? '' : path,
      recursive,
      include_mounted_folders: true,
      include_non_downloadable_files: true
    });
    return response.data;
  }
}
