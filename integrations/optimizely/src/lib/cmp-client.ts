import { createAxios } from 'slates';

export class CmpClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.cmp.optimizely.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Tasks
  async listTasks(params?: { page?: number; limit?: number; status?: string }) {
    let response = await this.axios.get('/v3/tasks', { params });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/v3/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: {
    name: string;
    description?: string;
    campaign_id?: string;
    assignee_id?: string;
    due_date?: string;
    workflow_id?: string;
    custom_fields?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v3/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/v3/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    let response = await this.axios.delete(`/v3/tasks/${taskId}`);
    return response.data;
  }

  // Task Comments
  async listTaskComments(taskId: string) {
    let response = await this.axios.get(`/v3/tasks/${taskId}/comments`);
    return response.data;
  }

  async createTaskComment(taskId: string, data: { body: string }) {
    let response = await this.axios.post(`/v3/tasks/${taskId}/comments`, data);
    return response.data;
  }

  // Campaigns
  async listCampaigns(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/v3/campaigns', { params });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(`/v3/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    custom_fields?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v3/campaigns', data);
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/v3/campaigns/${campaignId}`, data);
    return response.data;
  }

  // Assets / Library
  async listAssets(params?: {
    page?: number;
    limit?: number;
    folder_id?: string;
    type?: string;
  }) {
    let response = await this.axios.get('/v3/assets', { params });
    return response.data;
  }

  async getAsset(assetId: string) {
    let response = await this.axios.get(`/v3/assets/${assetId}`);
    return response.data;
  }

  async updateAsset(assetId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/v3/assets/${assetId}`, data);
    return response.data;
  }

  async deleteAsset(assetId: string) {
    let response = await this.axios.delete(`/v3/assets/${assetId}`);
    return response.data;
  }

  // Folders
  async listFolders(params?: { parent_id?: string }) {
    let response = await this.axios.get('/v3/folders', { params });
    return response.data;
  }

  async getFolder(folderId: string) {
    let response = await this.axios.get(`/v3/folders/${folderId}`);
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
    let response = await this.axios.get(`/v3/work-requests/${workRequestId}`);
    return response.data;
  }

  async createWorkRequest(data: {
    title: string;
    description?: string;
    assignee_id?: string;
    due_date?: string;
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
    let response = await this.axios.get(`/v3/users/${userId}`);
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
    let response = await this.axios.get(`/v3/content-types/${contentTypeId}`);
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
    let response = await this.axios.delete(`/v3/webhooks/${webhookId}`);
    return response.data;
  }
}
