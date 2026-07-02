import { createAxios } from 'slates';
import type {
  CrawlerPage,
  DataHistoryResponse,
  Folder,
  FolderContentResponse,
  NotificationListResponse,
  Wachet
} from './types';

let http = createAxios({
  baseURL: 'https://api.wachete.com/thirdparty/v1'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // --- Task (Wachet) Management ---

  async createOrUpdateWachet(wachet: Wachet): Promise<Wachet> {
    let response = await http.put('/task', wachet, { headers: this.headers });
    return response.data;
  }

  async getWachet(wachetId: string): Promise<Wachet> {
    let response = await http.get(`/task/${wachetId}`, { headers: this.headers });
    return response.data;
  }

  async deleteWachet(wachetId: string): Promise<void> {
    await http.delete(`/task/${wachetId}`, { headers: this.headers });
  }

  async searchWachets(query: string): Promise<Wachet[]> {
    let response = await http.get('/task/search', {
      headers: this.headers,
      params: { query }
    });
    return response.data;
  }

  async getCrawlerPages(wachetId: string): Promise<CrawlerPage[]> {
    let response = await http.get(`/task/${wachetId}/pages`, { headers: this.headers });
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
    let response = await http.get('/notification/list', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getNotificationContent(alertId: string): Promise<{
    jobType?: string;
    syntheticExpression?: string;
    url?: string;
    name?: string;
    html?: string;
    timestampUtc?: string;
  }> {
    let response = await http.get(`/notification/${alertId}`, { headers: this.headers });
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
    let response = await http.get(`/data/list/${wachetId}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // --- Folder Management ---

  async listFolderContent(params?: {
    parentId?: string;
    continuationToken?: string;
  }): Promise<FolderContentResponse> {
    let response = await http.get('/folder/list', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createOrUpdateFolder(folder: Folder): Promise<Folder> {
    let response = await http.post('/folder', folder, { headers: this.headers });
    return response.data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await http.delete(`/folder/${folderId}`, { headers: this.headers });
  }

  async moveItems(params: {
    taskIds?: string[];
    folderIds?: string[];
    folderId?: string;
  }): Promise<void> {
    await http.post('/folder/move', params, { headers: this.headers });
  }
}
