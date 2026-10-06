import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import type { Chat, Deployment, EnvVar, Hook, List, Project, User, Version } from './types';

export class V0Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    this.axios = createAuthenticatedAxios({
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'v0',
          reason: 'v0_api_error',
          extractMessage: () =>
            'The request was rejected. Check account access, resource IDs, and API limits.'
        }),
      baseURL: 'https://api.v0.dev/v1',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Projects ──

  async listProjects(): Promise<List<Project>> {
    let response = await this.axios.get<List<Project>>('/projects');
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
  }): Promise<Project> {
    let response = await this.axios.post<Project>('/projects', params);
    return response.data;
  }

  async getProject(projectId: string): Promise<Project> {
    let response = await this.axios.get<Project>(`/projects/${encodeURIComponent(projectId)}`);
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
  ): Promise<Project> {
    let response = await this.axios.patch<Project>(
      `/projects/${encodeURIComponent(projectId)}`,
      params
    );
    return response.data;
  }

  async deleteProject(projectId: string): Promise<{ id: string; deleted: boolean }> {
    let response = await this.axios.delete<{ id: string; deleted: boolean }>(
      `/projects/${encodeURIComponent(projectId)}`
    );
    return response.data;
  }

  // ── Environment Variables ──

  async listEnvVars(projectId: string, decrypted?: boolean): Promise<List<EnvVar>> {
    let params: Record<string, string> = {};
    if (decrypted !== undefined) {
      params.decrypted = String(decrypted);
    }
    let response = await this.axios.get<List<EnvVar>>(
      `/projects/${encodeURIComponent(projectId)}/env-vars`,
      { params }
    );
    return response.data;
  }

  async createEnvVars(
    projectId: string,
    params: {
      environmentVariables: Array<{ key: string; value: string }>;
      upsert?: boolean;
    }
  ): Promise<List<EnvVar>> {
    let response = await this.axios.post<List<EnvVar>>(
      `/projects/${encodeURIComponent(projectId)}/env-vars`,
      params
    );
    return response.data;
  }

  async updateEnvVars(
    projectId: string,
    params: {
      environmentVariables: Array<{ id: string; value: string }>;
    }
  ): Promise<List<EnvVar>> {
    let response = await this.axios.patch<List<EnvVar>>(
      `/projects/${encodeURIComponent(projectId)}/env-vars`,
      params
    );
    return response.data;
  }

  async deleteEnvVars(
    projectId: string,
    environmentVariableIds: string[]
  ): Promise<List<{ id: string; deleted: boolean }>> {
    let response = await this.axios.post<List<{ id: string; deleted: boolean }>>(
      `/projects/${encodeURIComponent(projectId)}/env-vars/delete`,
      {
        environmentVariableIds
      }
    );
    return response.data;
  }

  // ── Chats ──

  async listChats(params?: {
    limit?: number;
    offset?: number;
    isFavorite?: boolean;
    vercelProjectId?: string;
    branch?: string;
  }): Promise<List<Chat>> {
    let query: Record<string, string> = {};
    if (params?.limit !== undefined) query.limit = String(params.limit);
    if (params?.offset !== undefined) query.offset = String(params.offset);
    if (params?.isFavorite !== undefined) query.isFavorite = String(params.isFavorite);
    if (params?.vercelProjectId) query.vercelProjectId = params.vercelProjectId;
    if (params?.branch) query.branch = params.branch;

    let response = await this.axios.get<List<Chat>>('/chats', { params: query });
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
  }): Promise<Chat> {
    let response = await this.axios.post<Chat>('/chats', { ...params, mcpServerIds: [] });
    return response.data;
  }

  async initChat(params: {
    type: 'files' | 'repo' | 'registry' | 'zip' | 'template';
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
  }): Promise<Chat> {
    let response = await this.axios.post<Chat>('/chats/init', params);
    return response.data;
  }

  async getChat(chatId: string): Promise<Chat> {
    let response = await this.axios.get<Chat>(`/chats/${encodeURIComponent(chatId)}`);
    return response.data;
  }

  async deleteChat(chatId: string): Promise<{ id: string; deleted: boolean }> {
    let response = await this.axios.delete<{ id: string; deleted: boolean }>(
      `/chats/${encodeURIComponent(chatId)}`
    );
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
  ): Promise<Chat> {
    let response = await this.axios.post<Chat>(
      `/chats/${encodeURIComponent(chatId)}/messages`,
      { ...params, mcpServerIds: [] }
    );
    return response.data;
  }

  async assignProjectToChat(
    projectId: string,
    chatId: string
  ): Promise<{ id: string; assigned: boolean }> {
    let response = await this.axios.post<{ id: string; assigned: boolean }>(
      `/projects/${encodeURIComponent(projectId)}/assign`,
      { chatId }
    );
    return response.data;
  }

  // ── Deployments ──

  async listDeployments(params: {
    projectId: string;
    chatId: string;
    versionId: string;
  }): Promise<List<Deployment>> {
    let response = await this.axios.get<List<Deployment>>('/deployments', { params });
    return response.data;
  }

  async createDeployment(params: {
    projectId: string;
    chatId: string;
    versionId: string;
  }): Promise<Deployment> {
    let response = await this.axios.post<Deployment>('/deployments', params);
    return response.data;
  }

  async getDeployment(deploymentId: string): Promise<Deployment> {
    let response = await this.axios.get<Deployment>(
      `/deployments/${encodeURIComponent(deploymentId)}`
    );
    return response.data;
  }

  async deleteDeployment(deploymentId: string): Promise<{ id: string; deleted: boolean }> {
    let response = await this.axios.delete<{ id: string; deleted: boolean }>(
      `/deployments/${encodeURIComponent(deploymentId)}`
    );
    return response.data;
  }

  async getDeploymentLogs(
    deploymentId: string,
    since?: string
  ): Promise<{
    logs: Array<{
      createdAt: string;
      deploymentId: string;
      id: string;
      text: string;
      type: string;
      level?: string;
    }>;
    nextSince?: number;
    object: string;
  }> {
    let params: Record<string, string> = {};
    if (since !== undefined) {
      const timestamp = /^\d+$/.test(since)
        ? Number(since)
        : Math.floor(Date.parse(since) / 1000);
      if (!Number.isFinite(timestamp) || timestamp < 0)
        throw createApiServiceError(
          'since must be an ISO timestamp or a non-negative Unix timestamp in seconds.'
        );
      params.since = String(timestamp);
    }
    let response = await this.axios.get<{
      logs: Array<{
        createdAt: string;
        deploymentId: string;
        id: string;
        text: string;
        type: string;
        level?: string;
      }>;
      nextSince?: number;
      object: string;
    }>(`/deployments/${encodeURIComponent(deploymentId)}/logs`, { params });
    return response.data;
  }

  async getDeploymentErrors(
    deploymentId: string
  ): Promise<{ fullErrorText?: string; errorType?: string; formattedError?: string }> {
    let response = await this.axios.get<{
      fullErrorText?: string;
      errorType?: string;
      formattedError?: string;
    }>(`/deployments/${encodeURIComponent(deploymentId)}/errors`);
    return response.data;
  }

  // ── Hooks (Webhooks) ──

  async listHooks(): Promise<List<Hook>> {
    let response = await this.axios.get<List<Hook>>('/hooks');
    return response.data;
  }

  async createHook(params: {
    name: string;
    events: string[];
    url: string;
    chatId?: string;
  }): Promise<Hook> {
    let response = await this.axios.post<Hook>('/hooks', params);
    return response.data;
  }

  async getHook(hookId: string): Promise<Hook> {
    let response = await this.axios.get<Hook>(`/hooks/${encodeURIComponent(hookId)}`);
    return response.data;
  }

  async deleteHook(hookId: string): Promise<{ id: string; deleted: boolean }> {
    let response = await this.axios.delete<{ id: string; deleted: boolean }>(
      `/hooks/${encodeURIComponent(hookId)}`
    );
    return response.data;
  }

  // ── User ──

  async getUser(): Promise<User> {
    let response = await this.axios.get<User>('/user');
    return response.data;
  }

  async getBilling(): Promise<Record<string, unknown>> {
    let response = await this.axios.get<Record<string, unknown>>('/user/billing');
    return response.data;
  }

  async getPlan(): Promise<Record<string, unknown>> {
    let response = await this.axios.get<Record<string, unknown>>('/user/plan');
    return response.data;
  }

  async listVersions(chatId: string, params: { limit?: number; cursor?: string }) {
    return (
      await this.axios.get<
        List<Version> & {
          pagination: { hasMore: boolean; nextCursor?: string };
          meta?: { totalCount: number };
        }
      >(`/chats/${encodeURIComponent(chatId)}/versions`, { params })
    ).data;
  }

  async getVersion(chatId: string, versionId: string) {
    return (
      await this.axios.get<Version>(
        `/chats/${encodeURIComponent(chatId)}/versions/${encodeURIComponent(versionId)}`
      )
    ).data;
  }
}
