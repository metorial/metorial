import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import type {
  CrawlerPage,
  DataHistoryResponse,
  Folder,
  FolderContentResponse,
  NotificationContent,
  NotificationListResponse,
  Wachet
} from './types';

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('Reconnect Wachete to obtain an access token.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.wachete.com/thirdparty/v1',
      timeout: 30000,
      authHeader: { value: `bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Wachete',
          reason: 'wachete_api_error'
        })
    });
  }

  // --- Task (Wachet) Management ---

  async createOrUpdateWachet(wachet: Wachet): Promise<Wachet> {
    if (
      wachet.recurrenceInSeconds != null &&
      (!Number.isInteger(wachet.recurrenceInSeconds) ||
        wachet.recurrenceInSeconds < -2147483648 ||
        wachet.recurrenceInSeconds > 2147483647)
    ) {
      throw createApiServiceError(
        "Check frequency must be a whole number of seconds in the API's 32-bit integer range."
      );
    }
    if (wachet.crawlingDepth != null && !Number.isInteger(wachet.crawlingDepth)) {
      throw createApiServiceError('Crawling depth must be a whole number.');
    }
    let response = await this.http.put('/task', wachet);
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid response object.');
    }
    return response.data;
  }

  async getWachet(wachetId: string): Promise<Wachet> {
    if (!wachetId.trim()) {
      throw createApiServiceError('Provide a nonempty monitor ID.');
    }
    let response = await this.http.get(`/task/${encodeURIComponent(wachetId)}`);
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid response object.');
    }
    return response.data;
  }

  async deleteWachet(wachetId: string): Promise<void> {
    if (!wachetId.trim()) {
      throw createApiServiceError('Provide a nonempty monitor ID.');
    }
    await this.http.delete(`/task/${encodeURIComponent(wachetId)}`);
  }

  async searchWachets(query: string): Promise<Wachet[]> {
    let response = await this.http.get('/task/search', {
      params: { query }
    });
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid list of results.');
    }
    return response.data;
  }

  async getCrawlerPages(wachetId: string): Promise<CrawlerPage[]> {
    if (!wachetId.trim()) {
      throw createApiServiceError('Provide a nonempty monitor ID.');
    }
    let response = await this.http.get(`/task/${encodeURIComponent(wachetId)}/pages`);
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid list of results.');
    }
    return response.data;
  }

  // --- Notifications ---

  async listNotifications(params: {
    taskId?: string;
    from?: string;
    to?: string;
    count?: number;
    continuationToken?: string;
    html?: boolean;
  }): Promise<NotificationListResponse> {
    if (
      params.count !== undefined &&
      (!Number.isInteger(params.count) ||
        params.count < -2147483648 ||
        params.count > 2147483647)
    ) {
      throw createApiServiceError(
        "Notification count must be a whole number in the API's 32-bit integer range."
      );
    }
    let response = await this.http.get('/notification/list', {
      params
    });
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid response object.');
    }
    return response.data;
  }

  async getNotificationContent(alertId: string): Promise<NotificationContent> {
    if (!alertId.trim()) {
      throw createApiServiceError('Provide a nonempty notification ID.');
    }
    let response = await this.http.get(`/notification/${encodeURIComponent(alertId)}`);
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid response object.');
    }
    return response.data;
  }

  // --- Data History ---

  async listDataHistory(
    wachetId: string,
    params?: {
      from?: string;
      to?: string;
      count?: number;
      returnDiff?: boolean;
      continuationToken?: string;
    }
  ): Promise<DataHistoryResponse> {
    if (!wachetId.trim()) {
      throw createApiServiceError('Provide a nonempty monitor ID.');
    }
    if (
      params?.count !== undefined &&
      (!Number.isInteger(params.count) ||
        params.count < -2147483648 ||
        params.count > 2147483647)
    ) {
      throw createApiServiceError(
        "History count must be a whole number in the API's 32-bit integer range."
      );
    }
    let response = await this.http.get(`/data/list/${encodeURIComponent(wachetId)}`, {
      params
    });
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid response object.');
    }
    return response.data;
  }

  // --- Folder Management ---

  async listFolderContent(params?: {
    parentId?: string;
    continuationToken?: string;
  }): Promise<FolderContentResponse> {
    let response = await this.http.get('/folder/list', {
      params
    });
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid response object.');
    }
    return response.data;
  }

  async createOrUpdateFolder(folder: Folder): Promise<Folder> {
    let response = await this.http.post('/folder', folder);
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Wachete returned an invalid response object.');
    }
    return response.data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    if (!folderId.trim()) {
      throw createApiServiceError('Provide a nonempty folder ID.');
    }
    await this.http.delete(`/folder/${encodeURIComponent(folderId)}`);
  }

  async moveItems(params: {
    taskIds?: string[];
    folderIds?: string[];
    folderId?: string;
  }): Promise<void> {
    await this.http.post('/folder/move', params);
  }
}
