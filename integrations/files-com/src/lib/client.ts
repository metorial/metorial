import { createAxios } from 'slates';

export interface FilesComClientConfig {
  token: string;
  subdomain?: string;
}

export class FilesComClient {
  private axios: ReturnType<typeof createAxios>;
  private baseUrl: string;

  constructor(config: FilesComClientConfig) {
    let host = config.subdomain ? `${config.subdomain}.files.com` : 'app.files.com';
    this.baseUrl = `https://${host}/api/rest/v1`;

    this.axios = createAxios({
      baseURL: this.baseUrl,
      headers: {
        'X-FilesAPI-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Files ────────────────────────────────────────────────────────────

  async getFileInfo(path: string): Promise<Record<string, unknown>> {
    let encodedPath = encodePath(path);
    let response = await this.axios.get(`/files/${encodedPath}`);
    return response.data;
  }

  async downloadFile(path: string): Promise<{ downloadUri: string }> {
    let encodedPath = encodePath(path);
    let response = await this.axios.get(`/files/${encodedPath}`, {
      params: { action: 'redirect' }
    });
    return { downloadUri: response.data.download_uri ?? response.headers?.location ?? '' };
  }

  async deleteFile(path: string, params?: { recursive?: boolean }): Promise<void> {
    let encodedPath = encodePath(path);
    await this.axios.delete(`/files/${encodedPath}`, {
      params: params ?? {}
    });
  }

  async copyFile(
    path: string,
    destination: string,
    params?: { overwrite?: boolean; structure?: boolean }
  ): Promise<Record<string, unknown>> {
    let encodedPath = encodePath(path);
    let response = await this.axios.post(`/file_actions/copy/${encodedPath}`, {
      destination,
      ...params
    });
    return response.data;
  }

  async moveFile(
    path: string,
    destination: string,
    params?: { overwrite?: boolean }
  ): Promise<Record<string, unknown>> {
    let encodedPath = encodePath(path);
    let response = await this.axios.post(`/file_actions/move/${encodedPath}`, {
      destination,
      ...params
    });
    return response.data;
  }

  // ─── Folders ──────────────────────────────────────────────────────────

  async listFolder(
    path: string,
    params?: {
      cursor?: string;
      perPage?: number;
      search?: string;
      sortBy?: Record<string, string>;
    }
  ): Promise<{ entries: Record<string, unknown>[]; cursor?: string }> {
    let encodedPath = encodePath(path);
    let response = await this.axios.get(`/folders/${encodedPath}`, {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        search_all: params?.search,
        sort_by: params?.sortBy
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      entries: response.data,
      cursor: cursor || undefined
    };
  }

  async createFolder(
    path: string,
    params?: { mkdirParents?: boolean; providedMtime?: string }
  ): Promise<Record<string, unknown>> {
    let encodedPath = encodePath(path);
    let response = await this.axios.post(`/folders/${encodedPath}`, {
      mkdir_parents: params?.mkdirParents ?? true,
      provided_mtime: params?.providedMtime
    });
    return response.data;
  }

  // ─── Users ────────────────────────────────────────────────────────────

  async listUsers(params?: {
    cursor?: string;
    perPage?: number;
    search?: string;
    sortBy?: Record<string, string>;
  }): Promise<{ users: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/users.json', {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        search: params?.search,
        sort_by: params?.sortBy
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      users: response.data,
      cursor: cursor || undefined
    };
  }

  async getUser(userId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/users/${userId}.json`);
    return response.data;
  }

  async createUser(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/users.json', data);
    return response.data;
  }

  async updateUser(
    userId: number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/users/${userId}.json`, data);
    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.axios.delete(`/users/${userId}.json`);
  }

  // ─── Groups ───────────────────────────────────────────────────────────

  async listGroups(params?: {
    cursor?: string;
    perPage?: number;
    sortBy?: Record<string, string>;
  }): Promise<{ groups: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/groups.json', {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        sort_by: params?.sortBy
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      groups: response.data,
      cursor: cursor || undefined
    };
  }

  async getGroup(groupId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/groups/${groupId}.json`);
    return response.data;
  }

  async createGroup(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/groups.json', data);
    return response.data;
  }

  async updateGroup(
    groupId: number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/groups/${groupId}.json`, data);
    return response.data;
  }

  async deleteGroup(groupId: number): Promise<void> {
    await this.axios.delete(`/groups/${groupId}.json`);
  }

  // ─── Permissions ──────────────────────────────────────────────────────

  async listPermissions(params?: {
    path?: string;
    userId?: number;
    groupId?: number;
    includeGroups?: boolean;
    cursor?: string;
    perPage?: number;
  }): Promise<{ permissions: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/permissions.json', {
      params: {
        path: params?.path,
        user_id: params?.userId,
        group_id: params?.groupId,
        include_groups: params?.includeGroups,
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      permissions: response.data,
      cursor: cursor || undefined
    };
  }

  async createPermission(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/permissions.json', data);
    return response.data;
  }

  async deletePermission(permissionId: number): Promise<void> {
    await this.axios.delete(`/permissions/${permissionId}.json`);
  }

  // ─── Bundles (Share Links) ────────────────────────────────────────────

  async listBundles(params?: {
    cursor?: string;
    perPage?: number;
    userId?: number;
    sortBy?: Record<string, string>;
  }): Promise<{ bundles: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/bundles.json', {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        user_id: params?.userId,
        sort_by: params?.sortBy
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      bundles: response.data,
      cursor: cursor || undefined
    };
  }

  async getBundle(bundleId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/bundles/${bundleId}.json`);
    return response.data;
  }

  async createBundle(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/bundles.json', data);
    return response.data;
  }

  async updateBundle(
    bundleId: number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/bundles/${bundleId}.json`, data);
    return response.data;
  }

  async deleteBundle(bundleId: number): Promise<void> {
    await this.axios.delete(`/bundles/${bundleId}.json`);
  }

  async shareBundle(bundleId: number, data: { to: string[]; note?: string }): Promise<void> {
    await this.axios.post(`/bundles/${bundleId}/share.json`, data);
  }

  // ─── Automations ─────────────────────────────────────────────────────

  async listAutomations(params?: {
    cursor?: string;
    perPage?: number;
    sortBy?: Record<string, string>;
  }): Promise<{ automations: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/automations.json', {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        sort_by: params?.sortBy
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      automations: response.data,
      cursor: cursor || undefined
    };
  }

  async getAutomation(automationId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/automations/${automationId}.json`);
    return response.data;
  }

  async createAutomation(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/automations.json', data);
    return response.data;
  }

  async updateAutomation(
    automationId: number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/automations/${automationId}.json`, data);
    return response.data;
  }

  async deleteAutomation(automationId: number): Promise<void> {
    await this.axios.delete(`/automations/${automationId}.json`);
  }

  async runAutomation(automationId: number): Promise<void> {
    await this.axios.post(`/automations/${automationId}/manual_run.json`);
  }

  // ─── Notifications ────────────────────────────────────────────────────

  async listNotifications(params?: {
    cursor?: string;
    perPage?: number;
    path?: string;
    userId?: number;
    groupId?: number;
  }): Promise<{ notifications: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/notifications.json', {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        path: params?.path,
        user_id: params?.userId,
        group_id: params?.groupId
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      notifications: response.data,
      cursor: cursor || undefined
    };
  }

  async createNotification(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/notifications.json', data);
    return response.data;
  }

  async updateNotification(
    notificationId: number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/notifications/${notificationId}.json`, data);
    return response.data;
  }

  async deleteNotification(notificationId: number): Promise<void> {
    await this.axios.delete(`/notifications/${notificationId}.json`);
  }

  // ─── Behaviors (Webhooks) ─────────────────────────────────────────────

  async listBehaviors(params?: {
    cursor?: string;
    perPage?: number;
    path?: string;
    behavior?: string;
    sortBy?: Record<string, string>;
  }): Promise<{ behaviors: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/behaviors.json', {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        path: params?.path,
        'filter[behavior]': params?.behavior,
        sort_by: params?.sortBy
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      behaviors: response.data,
      cursor: cursor || undefined
    };
  }

  async createBehavior(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/behaviors.json', data);
    return response.data;
  }

  async updateBehavior(
    behaviorId: number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/behaviors/${behaviorId}.json`, data);
    return response.data;
  }

  async deleteBehavior(behaviorId: number): Promise<void> {
    await this.axios.delete(`/behaviors/${behaviorId}.json`);
  }

  async testWebhook(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/behaviors/webhook_test.json', data);
    return response.data;
  }

  // ─── Action Logs (History) ────────────────────────────────────────────

  async listActionLogs(params?: {
    cursor?: string;
    perPage?: number;
    path?: string;
    folder?: string;
    userId?: number;
    username?: string;
    startAt?: string;
    endAt?: string;
  }): Promise<{ logs: Record<string, unknown>[]; cursor?: string }> {
    let queryParams: Record<string, unknown> = {
      cursor: params?.cursor,
      per_page: params?.perPage ?? 100
    };

    if (params?.path) queryParams['filter[path]'] = params.path;
    if (params?.folder) queryParams['filter[folder]'] = params.folder;
    if (params?.userId) queryParams['filter[user_id]'] = params.userId;
    if (params?.username) queryParams['filter[username]'] = params.username;
    if (params?.startAt) queryParams['filter_gt[created_at]'] = params.startAt;
    if (params?.endAt) queryParams['filter_lt[created_at]'] = params.endAt;

    let response = await this.axios.get('/action_logs.json', {
      params: queryParams
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      logs: response.data,
      cursor: cursor || undefined
    };
  }

  // ─── API Keys ─────────────────────────────────────────────────────────

  async listApiKeys(params?: {
    cursor?: string;
    perPage?: number;
    userId?: number;
    sortBy?: Record<string, string>;
  }): Promise<{ apiKeys: Record<string, unknown>[]; cursor?: string }> {
    let response = await this.axios.get('/api_keys.json', {
      params: {
        cursor: params?.cursor,
        per_page: params?.perPage ?? 100,
        user_id: params?.userId,
        sort_by: params?.sortBy
      }
    });
    let cursor =
      response.headers?.['x-files-cursor-next'] ?? response.headers?.['X-Files-Cursor-Next'];
    return {
      apiKeys: response.data,
      cursor: cursor || undefined
    };
  }

  async getCurrentApiKey(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api_key.json');
    return response.data;
  }

  async createApiKey(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api_keys.json', data);
    return response.data;
  }

  async deleteApiKey(apiKeyId: number): Promise<void> {
    await this.axios.delete(`/api_keys/${apiKeyId}.json`);
  }

  // ─── Site ─────────────────────────────────────────────────────────────

  async getSite(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/site.json');
    return response.data;
  }
}

let encodePath = (path: string): string => {
  let normalized = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return normalized.split('/').map(encodeURIComponent).join('/');
};
