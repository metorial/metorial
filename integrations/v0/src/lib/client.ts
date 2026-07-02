import { createAxios } from 'slates';

export class V0Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.v0.dev/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Projects ──

  async listProjects(): Promise<any> {
    let response = await this.axios.get('/projects');
    return response.data;
  }

  async createProject(params: {
    name: string;
    description?: string;
    icon?: string;
    instructions?: string;
    privacy?: 'private' | 'team';
    vercelProjectId?: string;
    environmentVariables?: Array<{ key: string; value: string }>;
  }): Promise<any> {
    let response = await this.axios.post('/projects', params);
    return response.data;
  }

  async getProject(projectId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async updateProject(
    projectId: string,
    params: {
      name?: string;
      description?: string;
      instructions?: string;
      privacy?: 'private' | 'team';
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/projects/${projectId}`, params);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<any> {
    let response = await this.axios.delete(`/projects/${projectId}`);
    return response.data;
  }

  // ── Environment Variables ──

  async listEnvVars(projectId: string, decrypted?: boolean): Promise<any> {
    let params: Record<string, string> = {};
    if (decrypted !== undefined) {
      params.decrypted = String(decrypted);
    }
    let response = await this.axios.get(`/projects/${projectId}/env-vars`, { params });
    return response.data;
  }

  async createEnvVars(
    projectId: string,
    params: {
      environmentVariables: Array<{ key: string; value: string }>;
      upsert?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/projects/${projectId}/env-vars`, params);
    return response.data;
  }

  async updateEnvVars(
    projectId: string,
    params: {
      environmentVariables: Array<{ id: string; value: string }>;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/projects/${projectId}/env-vars`, params);
    return response.data;
  }

  async deleteEnvVars(projectId: string, environmentVariableIds: string[]): Promise<any> {
    let response = await this.axios.post(`/projects/${projectId}/env-vars/delete`, {
      environmentVariableIds
    });
    return response.data;
  }

  // ── Chats ──

  async listChats(params?: {
    limit?: number;
    offset?: number;
    isFavorite?: boolean;
    vercelProjectId?: string;
    branch?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit !== undefined) query.limit = String(params.limit);
    if (params?.offset !== undefined) query.offset = String(params.offset);
    if (params?.isFavorite !== undefined) query.isFavorite = String(params.isFavorite);
    if (params?.vercelProjectId) query.vercelProjectId = params.vercelProjectId;
    if (params?.branch) query.branch = params.branch;

    let response = await this.axios.get('/chats', { params: query });
    return response.data;
  }

  async createChat(params: {
    message: string;
    system?: string;
    projectId?: string;
    chatPrivacy?: 'public' | 'private' | 'team-edit' | 'team' | 'unlisted';
    responseMode?: 'sync' | 'async';
    designSystemId?: string;
    metadata?: Record<string, string>;
    attachments?: Array<{ url: string }>;
  }): Promise<any> {
    let response = await this.axios.post('/chats', params);
    return response.data;
  }

  async initChat(params: {
    type?: 'files' | 'repo' | 'registry' | 'zip';
    name?: string;
    chatPrivacy?: 'public' | 'private' | 'team-edit' | 'team' | 'unlisted';
    projectId?: string;
    metadata?: Record<string, string>;
    files?: Array<{ name: string; content: string; locked?: boolean }>;
    repo?: { url: string; branch?: string };
    registry?: { url: string };
    zip?: { url: string };
    lockAllFiles?: boolean;
    templateId?: string;
  }): Promise<any> {
    let response = await this.axios.post('/chats/init', params);
    return response.data;
  }

  async getChat(chatId: string): Promise<any> {
    let response = await this.axios.get(`/chats/${chatId}`);
    return response.data;
  }

  async deleteChat(chatId: string): Promise<any> {
    let response = await this.axios.delete(`/chats/${chatId}`);
    return response.data;
  }

  async sendMessage(
    chatId: string,
    params: {
      message: string;
      system?: string;
      responseMode?: 'sync' | 'async';
      attachments?: Array<{ url: string }>;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/chats/${chatId}/messages`, params);
    return response.data;
  }

  async assignProjectToChat(projectId: string, chatId: string): Promise<any> {
    let response = await this.axios.post(`/projects/${projectId}/assign`, { chatId });
    return response.data;
  }

  // ── Deployments ──

  async listDeployments(params: {
    projectId: string;
    chatId: string;
    versionId: string;
  }): Promise<any> {
    let response = await this.axios.get('/deployments', { params });
    return response.data;
  }

  async createDeployment(params: {
    projectId: string;
    chatId: string;
    versionId: string;
  }): Promise<any> {
    let response = await this.axios.post('/deployments', params);
    return response.data;
  }

  async getDeployment(deploymentId: string): Promise<any> {
    let response = await this.axios.get(`/deployments/${deploymentId}`);
    return response.data;
  }

  async deleteDeployment(deploymentId: string): Promise<any> {
    let response = await this.axios.delete(`/deployments/${deploymentId}`);
    return response.data;
  }

  async getDeploymentLogs(deploymentId: string, since?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (since) params.since = since;
    let response = await this.axios.get(`/deployments/${deploymentId}/logs`, { params });
    return response.data;
  }

  async getDeploymentErrors(deploymentId: string): Promise<any> {
    let response = await this.axios.get(`/deployments/${deploymentId}/errors`);
    return response.data;
  }

  // ── Hooks (Webhooks) ──

  async listHooks(): Promise<any> {
    let response = await this.axios.get('/hooks');
    return response.data;
  }

  async createHook(params: {
    name: string;
    events: string[];
    url: string;
    chatId?: string;
  }): Promise<any> {
    let response = await this.axios.post('/hooks', params);
    return response.data;
  }

  async getHook(hookId: string): Promise<any> {
    let response = await this.axios.get(`/hooks/${hookId}`);
    return response.data;
  }

  async deleteHook(hookId: string): Promise<any> {
    let response = await this.axios.delete(`/hooks/${hookId}`);
    return response.data;
  }

  // ── User ──

  async getUser(): Promise<any> {
    let response = await this.axios.get('/user');
    return response.data;
  }

  async getBilling(): Promise<any> {
    let response = await this.axios.get('/user/billing');
    return response.data;
  }

  async getPlan(): Promise<any> {
    let response = await this.axios.get('/user/plan');
    return response.data;
  }
}
