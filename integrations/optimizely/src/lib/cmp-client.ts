import { createApiServiceError, createAxios } from 'slates';
import { optimizelyErrorMapping } from './api-errors';

let pagination = (page?: number, limit?: number) => {
  if (page !== undefined && (!Number.isInteger(page) || page < 1))
    throw createApiServiceError('page must be a positive whole number.');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100))
    throw createApiServiceError('limit must be a whole number between 1 and 100.');
  return {
    offset: page === undefined ? undefined : (page - 1) * (limit ?? 10),
    page_size: limit
  };
};

export class CmpClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      errorMapping: optimizelyErrorMapping,
      timeout: 30000,
      baseURL: 'https://api.cmp.optimizely.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getCurrentUser() {
    let response = await this.axios.get(
      'https://accounts.cmp.optimizely.com/o/oauth2/v1/userinfo'
    );
    return response.data;
  }

  // Tasks
  async listTasks(params?: { page?: number; limit?: number; status?: string }) {
    let response = await this.axios.get('/v3/tasks', {
      params: { ...pagination(params?.page, params?.limit), status: params?.status }
    });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/v3/tasks/${encodeURIComponent(taskId)}`);
    return response.data;
  }

  async createTask(data: {
    title: string;
    description?: string;
    campaign_id?: string;
    assignee_id?: string;
    due_at?: string;
    owner_id?: string;
    workflow_id?: string;
    custom_fields?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v3/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/v3/tasks/${encodeURIComponent(taskId)}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    let response = await this.axios.delete(`/v3/tasks/${encodeURIComponent(taskId)}`);
    return response.data;
  }

  // Task Comments
  async listTaskComments(taskId: string) {
    let response = await this.axios.get(`/v3/tasks/${encodeURIComponent(taskId)}/comments`);
    return response.data;
  }

  async createTaskComment(taskId: string, data: { value: string }) {
    let response = await this.axios.post(
      `/v3/tasks/${encodeURIComponent(taskId)}/comments`,
      data
    );
    return response.data;
  }

  // Campaigns
  async listCampaigns(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/v3/campaigns', {
      params: pagination(params?.page, params?.limit)
    });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(`/v3/campaigns/${encodeURIComponent(campaignId)}`);
    return response.data;
  }

  async createCampaign(data: {
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    custom_fields?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v3/campaigns', data);
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, any>) {
    let response = await this.axios.patch(
      `/v3/campaigns/${encodeURIComponent(campaignId)}`,
      data
    );
    return response.status === 204 ? this.getCampaign(campaignId) : response.data;
  }

  private assetPath(
    assetId: string,
    assetType?: string,
    action: 'get' | 'update' | 'delete' = 'get'
  ) {
    let paths: Record<string, string> = {
      image: 'images',
      video: 'videos',
      article: 'articles',
      raw_file: 'raw-files',
      structured_content: 'structured-contents'
    };
    if (assetType && !paths[assetType])
      throw createApiServiceError(
        'assetType must be image, video, article, raw_file, or structured_content.'
      );
    let documentedType =
      assetType &&
      !(assetType === 'article' && action !== 'get') &&
      !(assetType === 'structured_content' && action === 'delete')
        ? assetType
        : undefined;
    return `/v3/${documentedType ? paths[documentedType] : 'assets'}/${encodeURIComponent(assetId)}`;
  }

  // Assets / Library
  async listAssets(params?: {
    page?: number;
    limit?: number;
    folder_id?: string;
    type?: string;
  }) {
    let response = await this.axios.get('/v3/assets', {
      params: {
        ...pagination(params?.page, params?.limit),
        folder_id: params?.folder_id,
        type: params?.type
      }
    });
    return response.data;
  }

  async getAsset(assetId: string, assetType?: string) {
    let response = await this.axios.get(this.assetPath(assetId, assetType));
    return response.data;
  }

  async updateAsset(assetId: string, data: Record<string, any>, assetType?: string) {
    let payload = this.assetPath(assetId, assetType, 'update').startsWith('/v3/assets/')
      ? data
      : { ...data, title: data.name, name: undefined };
    let response = await this.axios.patch(
      this.assetPath(assetId, assetType, 'update'),
      payload
    );
    return response.data;
  }

  async deleteAsset(assetId: string, assetType?: string) {
    let response = await this.axios.delete(this.assetPath(assetId, assetType, 'delete'));
    return response.data;
  }

  // Folders
  async listFolders(params?: { parent_id?: string }) {
    let response = await this.axios.get('/v3/folders', {
      params: { parent_folder_id: params?.parent_id }
    });
    return response.data;
  }

  async getFolder(folderId: string) {
    let response = await this.axios.get(`/v3/folders/${encodeURIComponent(folderId)}`);
    return response.data;
  }

  // Publishing
  async listPublishingEvents(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/v3/publishing', { params });
    return response.data;
  }

  // Work Requests
  async listWorkRequests(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/v3/work-requests', { params });
    return response.data;
  }

  async getWorkRequest(workRequestId: string) {
    let response = await this.axios.get(
      `/v3/work-requests/${encodeURIComponent(workRequestId)}`
    );
    return response.data;
  }

  async createWorkRequest(data: {
    title: string;
    description?: string;
    assignee_id?: string;
    due_at?: string;
    owner_id?: string;
    custom_fields?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v3/work-requests', data);
    return response.data;
  }

  // Users & Teams
  async listUsers(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/v3/users', { params });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/v3/users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async listTeams(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/v3/teams', { params });
    return response.data;
  }

  // Structured Content
  async listContentTypes() {
    let response = await this.axios.get('/v3/content-types');
    return response.data;
  }

  async getContentType(contentTypeId: string) {
    let response = await this.axios.get(
      `/v3/content-types/${encodeURIComponent(contentTypeId)}`
    );
    return response.data;
  }

  // Webhooks
  async listWebhooks() {
    let response = await this.axios.get('/v3/webhooks');
    return response.data;
  }

  async createWebhook(data: { url: string; events: string[]; secret?: string }) {
    let response = await this.axios.post('/v3/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/v3/webhooks/${encodeURIComponent(webhookId)}`);
    return response.data;
  }
}
