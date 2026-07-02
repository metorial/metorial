import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(options: { baseUrl: string; token: string }) {
    this.axios = createAxios({
      baseURL: `${options.baseUrl.replace(/\/+$/, '')}/api/ext`,
      headers: {
        Authorization: `Basic ${options.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── User Management ───

  async listUsers(groupNames?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (groupNames) {
      params.group_names = groupNames;
    }
    let response = await this.axios.get('/users', { params });
    return response.data;
  }

  async getUser(identifier: string): Promise<any> {
    let response = await this.axios.get(`/user/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  async createUser(body: {
    name: string;
    email: string;
    password?: string;
    status?: string;
    workspaces?: any[];
  }): Promise<any> {
    let response = await this.axios.post('/users', body);
    return response.data;
  }

  async updateUser(
    identifier: string,
    body: {
      name?: string;
      email?: string;
      password?: string;
      status?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/user/${encodeURIComponent(identifier)}`, body);
    return response.data;
  }

  async updateUserRole(
    workspaceId: string,
    body: { newRole: string; email: string }
  ): Promise<any> {
    let response = await this.axios.put(
      `/update-user-role/workspace/${encodeURIComponent(workspaceId)}`,
      body
    );
    return response.data;
  }

  // ─── Workspace Management ───

  async listWorkspaces(): Promise<any[]> {
    let response = await this.axios.get('/workspaces');
    return response.data;
  }

  async replaceUserWorkspaces(userId: string, workspaces: any[]): Promise<any> {
    let response = await this.axios.put(
      `/user/${encodeURIComponent(userId)}/workspaces`,
      workspaces
    );
    return response.data;
  }

  async updateUserWorkspace(
    userId: string,
    workspaceId: string,
    body: {
      id?: string;
      name?: string;
      status?: string;
      groups?: any[];
    }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/user/${encodeURIComponent(userId)}/workspace/${encodeURIComponent(workspaceId)}`,
      body
    );
    return response.data;
  }

  // ─── Application Management ───

  async listApps(workspaceId: string): Promise<any[]> {
    let response = await this.axios.get(`/workspace/${encodeURIComponent(workspaceId)}/apps`);
    return response.data;
  }

  async exportApp(
    workspaceId: string,
    appId: string,
    options?: {
      exportTJDB?: boolean;
      appVersion?: string;
      exportAllVersions?: boolean;
    }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.exportTJDB !== undefined) {
      params.exportTJDB = String(options.exportTJDB);
    }
    if (options?.appVersion) {
      params.appVersion = options.appVersion;
    }
    if (options?.exportAllVersions !== undefined) {
      params.exportAllVersions = String(options.exportAllVersions);
    }
    let response = await this.axios.post(
      `/export/workspace/${encodeURIComponent(workspaceId)}/apps/${encodeURIComponent(appId)}`,
      {},
      { params }
    );
    return response.data;
  }

  async importApp(workspaceId: string, body: any): Promise<any> {
    let response = await this.axios.post(
      `/import/workspace/${encodeURIComponent(workspaceId)}/apps`,
      body
    );
    return response.data;
  }
}
