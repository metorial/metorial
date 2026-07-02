import { createAxios } from 'slates';

export class Client {
  private instanceUrl: string;
  private token: string;

  constructor(config: { instanceUrl: string; token: string }) {
    this.instanceUrl = config.instanceUrl;
    this.token = config.token;
  }

  private getAxios() {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers.Cookie = `SESSION=${this.token}`;
    }

    return createAxios({
      baseURL: this.instanceUrl,
      headers
    });
  }

  // ---- Health & Monitoring ----

  async checkHealth(): Promise<{ isHealthy: boolean; status: string }> {
    let ax = this.getAxios();
    try {
      let response = await ax.get('/api/v1/health');
      return {
        isHealthy: response.status === 200,
        status:
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
      };
    } catch (err: any) {
      return {
        isHealthy: false,
        status: err?.message ?? 'Unknown error'
      };
    }
  }

  async getInstanceInfo(): Promise<Record<string, any>> {
    let ax = this.getAxios();
    let response = await ax.get('/api/v1/consolidated-api/view');
    return response.data;
  }

  // ---- Workspaces ----

  async listWorkspaces(): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/api/v1/workspaces');
    return response.data?.data ?? [];
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/api/v1/workspaces/${workspaceId}`);
    return response.data?.data ?? {};
  }

  async createWorkspace(name: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/api/v1/workspaces', { name });
    return response.data?.data ?? {};
  }

  async updateWorkspace(
    workspaceId: string,
    updates: { name?: string; website?: string; logo?: string }
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/api/v1/workspaces/${workspaceId}`, updates);
    return response.data?.data ?? {};
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/api/v1/workspaces/${workspaceId}`);
  }

  async getWorkspaceMembers(workspaceId: string): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get(`/api/v1/workspaces/${workspaceId}/members`);
    return response.data?.data ?? [];
  }

  // ---- Applications ----

  async listApplications(workspaceId: string): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/api/v1/applications', {
      params: { workspaceId }
    });
    return response.data?.data ?? [];
  }

  async getApplication(applicationId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/api/v1/applications/${applicationId}`);
    return response.data?.data ?? {};
  }

  async createApplication(
    workspaceId: string,
    name: string,
    color?: string,
    icon?: string
  ): Promise<any> {
    let ax = this.getAxios();
    let body: Record<string, any> = { workspaceId, name };
    if (color) body.color = color;
    if (icon) body.icon = icon;
    let response = await ax.post('/api/v1/applications', body);
    return response.data?.data ?? {};
  }

  async updateApplication(
    applicationId: string,
    updates: { name?: string; isPublic?: boolean }
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/api/v1/applications/${applicationId}`, updates);
    return response.data?.data ?? {};
  }

  async deleteApplication(applicationId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/api/v1/applications/${applicationId}`);
  }

  async publishApplication(applicationId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/api/v1/applications/publish/${applicationId}`);
    return response.data?.data ?? {};
  }

  async cloneApplication(applicationId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/api/v1/applications/clone/${applicationId}`);
    return response.data?.data ?? {};
  }

  async forkApplication(applicationId: string, targetWorkspaceId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(
      `/api/v1/applications/${applicationId}/fork/${targetWorkspaceId}`
    );
    return response.data?.data ?? {};
  }

  async exportApplication(applicationId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/api/v1/applications/export/${applicationId}`);
    return response.data;
  }

  async importApplication(workspaceId: string, applicationJson: any): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(
      `/api/v1/applications/import/${workspaceId}`,
      applicationJson
    );
    return response.data?.data ?? {};
  }

  // ---- Pages ----

  async listPages(applicationId: string): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get(`/api/v1/pages/application/${applicationId}`);
    return response.data?.data?.pages ?? [];
  }

  async getPage(pageId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/api/v1/pages/${pageId}`);
    return response.data?.data ?? {};
  }

  async createPage(applicationId: string, name: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/api/v1/pages', { applicationId, name });
    return response.data?.data ?? {};
  }

  async updatePage(
    pageId: string,
    updates: { name?: string; isHidden?: boolean }
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/api/v1/pages/${pageId}`, updates);
    return response.data?.data ?? {};
  }

  async deletePage(pageId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/api/v1/pages/${pageId}`);
  }

  // ---- Datasources ----

  async listDatasources(workspaceId: string): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/api/v1/datasources', {
      params: { workspaceId }
    });
    return response.data?.data ?? [];
  }

  async getDatasource(datasourceId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/api/v1/datasources/${datasourceId}`);
    return response.data?.data ?? {};
  }

  // ---- Users ----

  async getCurrentUser(): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/api/v1/users/me');
    return response.data?.data ?? {};
  }

  // ---- Audit Logs (Business/Enterprise) ----

  async queryAuditLogs(params?: {
    resourceType?: string;
    event?: string;
    userId?: string;
    limit?: number;
    sortOrder?: string;
  }): Promise<any> {
    let ax = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.resourceType) query.resourceType = params.resourceType;
    if (params?.event) query.event = params.event;
    if (params?.userId) query.userId = params.userId;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    let response = await ax.get('/api/v1/audit-logs', { params: query });
    return response.data?.data ?? {};
  }

  // ---- Workflows (Business/Enterprise) ----

  async triggerWorkflow(webhookUrl: string, payload: any): Promise<any> {
    let ax = createAxios({});
    let response = await ax.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }
}
