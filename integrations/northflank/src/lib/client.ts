import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  teamId?: string;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    hasNextPage: boolean;
    cursor?: string;
    count: number;
  };
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private teamId?: string;

  constructor(config: ClientConfig) {
    this.teamId = config.teamId;
    this.axios = createAxios({
      baseURL: 'https://api.northflank.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private teamPath(path: string): string {
    if (this.teamId) {
      return `/teams/${this.teamId}${path}`;
    }
    return path;
  }

  // --- Projects ---

  async listProjects(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ projects: any[] }>> {
    let response = await this.axios.get(this.teamPath('/projects'), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getProject(projectId: string): Promise<any> {
    let response = await this.axios.get(this.teamPath(`/projects/${projectId}`));
    return response.data?.data;
  }

  async createProject(data: {
    name: string;
    description?: string;
    color?: string;
    region?: string;
    clusterId?: string;
  }): Promise<any> {
    let response = await this.axios.post(this.teamPath('/projects'), data);
    return response.data?.data;
  }

  async updateProject(
    projectId: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(this.teamPath(`/projects/${projectId}`), data);
    return response.data?.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(this.teamPath(`/projects/${projectId}`));
  }

  // --- Services ---

  async listServices(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ services: any[] }>> {
    let response = await this.axios.get(this.teamPath(`/projects/${projectId}/services`), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getService(projectId: string, serviceId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${projectId}/services/${serviceId}`)
    );
    return response.data?.data;
  }

  async createDeploymentService(
    projectId: string,
    data: {
      name: string;
      description?: string;
      tags?: string[];
      billing: { deploymentPlan: string };
      deployment: {
        instances: number;
        external?: {
          imagePath: string;
          credentials?: string;
        };
        internal?: {
          id: string;
          branch: string;
          buildSHA: string;
        };
      };
      ports?: Array<{
        name: string;
        internalPort: number;
        protocol: string;
        public: boolean;
      }>;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/projects/${projectId}/services`),
      data
    );
    return response.data?.data;
  }

  async updateService(
    projectId: string,
    serviceId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      this.teamPath(`/projects/${projectId}/services/${serviceId}`),
      data
    );
    return response.data?.data;
  }

  async deleteService(projectId: string, serviceId: string): Promise<void> {
    await this.axios.delete(this.teamPath(`/projects/${projectId}/services/${serviceId}`));
  }

  async pauseService(projectId: string, serviceId: string): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/projects/${projectId}/services/${serviceId}/pause`)
    );
    return response.data?.data;
  }

  async resumeService(projectId: string, serviceId: string): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/projects/${projectId}/services/${serviceId}/resume`)
    );
    return response.data?.data;
  }

  // --- Jobs ---

  async listJobs(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ jobs: any[] }>> {
    let response = await this.axios.get(this.teamPath(`/projects/${projectId}/jobs`), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getJob(projectId: string, jobId: string): Promise<any> {
    let response = await this.axios.get(this.teamPath(`/projects/${projectId}/jobs/${jobId}`));
    return response.data?.data;
  }

  async runJob(
    projectId: string,
    jobId: string,
    overrides?: {
      runtimeEnvironment?: Record<string, string>;
      billing?: { deploymentPlan?: string };
      deployment?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/projects/${projectId}/jobs/${jobId}/run`),
      overrides || {}
    );
    return response.data?.data;
  }

  async listJobRuns(
    projectId: string,
    jobId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ runs: any[] }>> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${projectId}/jobs/${jobId}/runs`),
      {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          cursor: params?.cursor
        }
      }
    );
    return response.data;
  }

  // --- Addons ---

  async listAddons(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ addons: any[] }>> {
    let response = await this.axios.get(this.teamPath(`/projects/${projectId}/addons`), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getAddon(projectId: string, addonId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${projectId}/addons/${addonId}`)
    );
    return response.data?.data;
  }

  async createAddon(
    projectId: string,
    data: {
      name: string;
      description?: string;
      type: string;
      version: string;
      billing: {
        deploymentPlan: string;
        storage: number;
        replicas: number;
      };
      tags?: string[];
      tlsEnabled?: boolean;
      externalAccessEnabled?: boolean;
    }
  ): Promise<any> {
    let body: any = {
      name: data.name,
      type: data.type,
      billing: data.billing,
      infrastructure: { version: data.version }
    };
    if (data.description) body.description = data.description;
    if (data.tags) body.tags = data.tags;
    if (data.tlsEnabled !== undefined) body.tlsEnabled = data.tlsEnabled;
    if (data.externalAccessEnabled !== undefined)
      body.externalAccessEnabled = data.externalAccessEnabled;

    let response = await this.axios.post(this.teamPath(`/projects/${projectId}/addons`), body);
    return response.data?.data;
  }

  async deleteAddon(projectId: string, addonId: string): Promise<void> {
    await this.axios.delete(this.teamPath(`/projects/${projectId}/addons/${addonId}`));
  }

  async getAddonCredentials(projectId: string, addonId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${projectId}/addons/${addonId}/credentials`)
    );
    return response.data?.data;
  }

  async backupAddon(projectId: string, addonId: string): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/projects/${projectId}/addons/${addonId}/backups`)
    );
    return response.data?.data;
  }

  async listAddonBackups(
    projectId: string,
    addonId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ backups: any[] }>> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${projectId}/addons/${addonId}/backups`),
      {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          cursor: params?.cursor
        }
      }
    );
    return response.data;
  }

  // --- Secrets ---

  async listProjectSecrets(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ secrets: any[] }>> {
    let response = await this.axios.get(this.teamPath(`/projects/${projectId}/secrets`), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getProjectSecret(projectId: string, secretId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${projectId}/secrets/${secretId}`)
    );
    return response.data?.data;
  }

  async createProjectSecret(
    projectId: string,
    data: {
      name: string;
      description?: string;
      secretType: string;
      priority?: number;
      tags?: string[];
      variables?: Record<string, string>;
      files?: Record<string, string>;
      restrictions?: {
        restricted: boolean;
        nfObjects?: Array<{ nfObjectId: string; nfObjectType: string }>;
        tags?: string[];
      };
    }
  ): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/projects/${projectId}/secrets`),
      data
    );
    return response.data?.data;
  }

  async updateProjectSecret(
    projectId: string,
    secretId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      this.teamPath(`/projects/${projectId}/secrets/${secretId}`),
      data
    );
    return response.data?.data;
  }

  async deleteProjectSecret(projectId: string, secretId: string): Promise<void> {
    await this.axios.delete(this.teamPath(`/projects/${projectId}/secrets/${secretId}`));
  }

  // --- Pipelines ---

  async listPipelines(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ pipelines: any[] }>> {
    let response = await this.axios.get(this.teamPath(`/projects/${projectId}/pipelines`), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async getPipeline(projectId: string, pipelineId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${projectId}/pipelines/${pipelineId}`)
    );
    return response.data?.data;
  }

  // --- Domains ---

  async listDomains(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ domains: any[] }>> {
    let response = await this.axios.get(this.teamPath('/domains'), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  // --- Notification Integrations ---

  async listNotificationIntegrations(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ integrations: any[] }>> {
    let response = await this.axios.get(this.teamPath('/integrations/notifications'), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async createNotificationIntegration(data: {
    name: string;
    type: string;
    webhook: string;
    secret?: string;
    restricted?: boolean;
    restrictions?: {
      tags?: { enabled: boolean; items: string[]; matchCondition?: string };
      projects?: string[];
    };
    events?: Record<string, boolean>;
  }): Promise<any> {
    let response = await this.axios.post(this.teamPath('/integrations/notifications'), data);
    return response.data?.data;
  }

  async getNotificationIntegration(notificationId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(`/integrations/notifications/${notificationId}`)
    );
    return response.data?.data;
  }

  async updateNotificationIntegration(
    notificationId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/integrations/notifications/${notificationId}`),
      data
    );
    return response.data?.data;
  }

  async deleteNotificationIntegration(notificationId: string): Promise<void> {
    await this.axios.delete(this.teamPath(`/integrations/notifications/${notificationId}`));
  }

  // --- Templates ---

  async listTemplates(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ templates: any[] }>> {
    let response = await this.axios.get(this.teamPath('/templates'), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async runTemplate(templateId: string, args?: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/templates/${templateId}/run`),
      args ? { arguments: args } : {}
    );
    return response.data?.data;
  }

  // --- Log Sinks ---

  async listLogSinks(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ logSinks: any[] }>> {
    let response = await this.axios.get(this.teamPath('/integrations/log-sinks'), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  // --- Tags ---

  async listTags(params?: PaginationParams): Promise<PaginatedResponse<{ tags: any[] }>> {
    let response = await this.axios.get(this.teamPath('/tags'), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  // --- Billing ---

  async listInvoices(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ invoices: any[] }>> {
    let response = await this.axios.get(this.teamPath('/billing/invoices'), {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  // --- Misc ---

  async listRegions(): Promise<any> {
    let response = await this.axios.get('/regions');
    return response.data?.data;
  }

  async listAddonTypes(): Promise<any> {
    let response = await this.axios.get('/addon-types');
    return response.data?.data;
  }

  async listPlans(): Promise<any> {
    let response = await this.axios.get('/plans');
    return response.data?.data;
  }

  async healthCheck(): Promise<any> {
    let response = await this.axios.get('/health');
    return response.data?.data;
  }
}
