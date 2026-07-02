import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: {
    token: string;
    email: string;
    accountName: string;
  }) {
    this.axios = createAxios({
      baseURL: `https://${params.accountName}.deployhq.com`,
      auth: {
        username: params.email,
        password: params.token
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ── Projects ──────────────────────────────────────────────

  async listProjects(): Promise<any[]> {
    let response = await this.axios.get('/projects');
    return response.data;
  }

  async getProject(projectPermalink: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectPermalink}`);
    return response.data;
  }

  async createProject(data: { name: string; zoneId?: number }): Promise<any> {
    let response = await this.axios.post('/projects', {
      project: {
        name: data.name,
        ...(data.zoneId !== undefined ? { zone_id: data.zoneId } : {})
      }
    });
    return response.data;
  }

  async updateProject(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/projects/${projectPermalink}`, {
      project: data
    });
    return response.data;
  }

  async deleteProject(projectPermalink: string): Promise<any> {
    let response = await this.axios.delete(`/projects/${projectPermalink}`);
    return response.data;
  }

  // ── Servers ───────────────────────────────────────────────

  async listServers(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectPermalink}/servers`);
    return response.data;
  }

  async getServer(projectPermalink: string, serverIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${projectPermalink}/servers/${serverIdentifier}`
    );
    return response.data;
  }

  async createServer(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/projects/${projectPermalink}/servers`, {
      server: data
    });
    return response.data;
  }

  async updateServer(
    projectPermalink: string,
    serverIdentifier: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/projects/${projectPermalink}/servers/${serverIdentifier}`,
      {
        server: data
      }
    );
    return response.data;
  }

  async deleteServer(projectPermalink: string, serverIdentifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${projectPermalink}/servers/${serverIdentifier}`
    );
    return response.data;
  }

  // ── Server Groups ─────────────────────────────────────────

  async listServerGroups(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectPermalink}/server_groups`);
    return response.data;
  }

  async getServerGroup(projectPermalink: string, groupIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${projectPermalink}/server_groups/${groupIdentifier}`
    );
    return response.data;
  }

  async createServerGroup(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/projects/${projectPermalink}/server_groups`, {
      server_group: data
    });
    return response.data;
  }

  async deleteServerGroup(projectPermalink: string, groupIdentifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${projectPermalink}/server_groups/${groupIdentifier}`
    );
    return response.data;
  }

  // ── Deployments ───────────────────────────────────────────

  async listDeployments(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectPermalink}/deployments`);
    return response.data;
  }

  async getDeployment(projectPermalink: string, deploymentIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${projectPermalink}/deployments/${deploymentIdentifier}`
    );
    return response.data;
  }

  async createDeployment(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/projects/${projectPermalink}/deployments`, {
      deployment: data
    });
    return response.data;
  }

  async getDeploymentPreview(
    projectPermalink: string,
    deploymentIdentifier: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/projects/${projectPermalink}/deployments/${deploymentIdentifier}/preview`
    );
    return response.data;
  }

  // ── Scheduled Deployments ─────────────────────────────────

  async listScheduledDeployments(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectPermalink}/scheduled_deployments`);
    return response.data;
  }

  async deleteScheduledDeployment(projectPermalink: string, identifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${projectPermalink}/scheduled_deployments/${identifier}`
    );
    return response.data;
  }

  // ── Config Files ──────────────────────────────────────────

  async listConfigFiles(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectPermalink}/config_files`);
    return response.data;
  }

  async getConfigFile(projectPermalink: string, configFileIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${projectPermalink}/config_files/${configFileIdentifier}`
    );
    return response.data;
  }

  async createConfigFile(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/projects/${projectPermalink}/config_files`, {
      config_file: data
    });
    return response.data;
  }

  async updateConfigFile(
    projectPermalink: string,
    configFileIdentifier: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/projects/${projectPermalink}/config_files/${configFileIdentifier}`,
      {
        config_file: data
      }
    );
    return response.data;
  }

  async deleteConfigFile(
    projectPermalink: string,
    configFileIdentifier: string
  ): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${projectPermalink}/config_files/${configFileIdentifier}`
    );
    return response.data;
  }

  // ── SSH Commands ──────────────────────────────────────────

  async listCommands(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectPermalink}/commands`);
    return response.data;
  }

  async getCommand(projectPermalink: string, commandIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${projectPermalink}/commands/${commandIdentifier}`
    );
    return response.data;
  }

  async createCommand(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/projects/${projectPermalink}/commands`, {
      command: data
    });
    return response.data;
  }

  async updateCommand(
    projectPermalink: string,
    commandIdentifier: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/projects/${projectPermalink}/commands/${commandIdentifier}`,
      {
        command: data
      }
    );
    return response.data;
  }

  async deleteCommand(projectPermalink: string, commandIdentifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${projectPermalink}/commands/${commandIdentifier}`
    );
    return response.data;
  }
}
