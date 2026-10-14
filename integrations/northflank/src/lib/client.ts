import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ClientConfig {
  token: string;
  teamId?: string;
}

export interface AuthInfo {
  tokenKind: string;
  id: string;
  name?: string;
  entityId: string;
  entityUid: string;
  entityType: string;
  orgId?: string;
  creatorEmail?: string;
  createdAt: string;
  expiresAt?: string | null;
  permissions?: Record<string, unknown>;
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private teamId?: string;

  constructor(config: ClientConfig) {
    this.teamId = config.teamId;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.northflank.com/v1',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Northflank',
          reason: 'northflank_api_error'
        })
    });
  }

  private teamPath(path: string): string {
    if (this.teamId) {
      return `/teams/${encodeURIComponent(this.teamId)}${path}`;
    }
    return path;
  }

  private async requiredTeamPath(path: string): Promise<string> {
    if (!this.teamId) {
      let identity = await this.getAuthInfo();
      if (identity.entityType !== 'team') {
        throw createApiServiceError(
          'This operation requires teamId. Call list_teams to discover an authorized team.'
        );
      }
      this.teamId = identity.entityId;
    }
    return this.teamPath(path);
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
    let response = await this.axios.get(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}`)
    );
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
    let response = await this.axios.patch(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}`),
      data
    );
    return response.data?.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(this.teamPath(`/projects/${encodeURIComponent(projectId)}`));
  }

  // --- Services ---

  async listServices(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ services: any[] }>> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/services`),
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

  async getService(projectId: string, serviceId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}`
      )
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
          branch?: string;
          buildSHA?: string;
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
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/services/deployment`),
      data
    );
    return response.data?.data;
  }

  async updateService(
    projectId: string,
    serviceId: string,
    data: Record<string, any>
  ): Promise<any> {
    let service = await this.getService(projectId, serviceId);
    let serviceType = service?.serviceType;
    if (!['deployment', 'build', 'combined'].includes(serviceType)) {
      throw createApiServiceError('The service type could not be resolved for this update.');
    }
    let response = await this.axios.patch(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/services/${serviceType}/${encodeURIComponent(serviceId)}`
      ),
      data
    );
    return response.data?.data;
  }

  async deleteService(projectId: string, serviceId: string): Promise<void> {
    await this.axios.delete(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}`
      )
    );
  }

  async pauseService(projectId: string, serviceId: string): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}/pause`
      )
    );
    return response.data?.data;
  }

  async resumeService(projectId: string, serviceId: string): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}/resume`
      )
    );
    return response.data?.data;
  }

  // --- Jobs ---

  async listJobs(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ jobs: any[] }>> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/jobs`),
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

  async getJob(projectId: string, jobId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}`
      )
    );
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
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}/runs`
      ),
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
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}/runs`
      ),
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
    let response = await this.axios.get(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/addons`),
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

  async getAddon(projectId: string, addonId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/addons/${encodeURIComponent(addonId)}`
      )
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
      version: data.version
    };
    if (data.description) body.description = data.description;
    if (data.tags) body.tags = data.tags;
    if (data.tlsEnabled !== undefined) body.tlsEnabled = data.tlsEnabled;
    if (data.externalAccessEnabled !== undefined)
      body.externalAccessEnabled = data.externalAccessEnabled;

    let response = await this.axios.post(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/addons`),
      body
    );
    return response.data?.data;
  }

  async deleteAddon(projectId: string, addonId: string): Promise<void> {
    await this.axios.delete(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/addons/${encodeURIComponent(addonId)}`
      )
    );
  }

  async getAddonCredentials(projectId: string, addonId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/addons/${encodeURIComponent(addonId)}/credentials`
      )
    );
    return response.data?.data;
  }

  async backupAddon(projectId: string, addonId: string): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/addons/${encodeURIComponent(addonId)}/backups`
      )
    );
    return response.data?.data;
  }

  async listAddonBackups(
    projectId: string,
    addonId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ backups: any[] }>> {
    let response = await this.axios.get(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/addons/${encodeURIComponent(addonId)}/backups`
      ),
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
    let response = await this.axios.get(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/secrets`),
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

  async getProjectSecret(projectId: string, secretId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/secrets/${encodeURIComponent(secretId)}`
      )
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
    let { variables, files, ...metadata } = data;
    let response = await this.axios.post(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/secrets`),
      { ...metadata, priority: data.priority ?? 0, secrets: { variables, files } }
    );
    return response.data?.data;
  }

  async updateProjectSecret(
    projectId: string,
    secretId: string,
    data: Record<string, any>
  ): Promise<any> {
    let { variables, files, ...metadata } = data;
    let secrets =
      variables !== undefined || files !== undefined ? { variables, files } : undefined;
    let response = await this.axios.patch(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/secrets/${encodeURIComponent(secretId)}`
      ),
      { ...metadata, secrets }
    );
    return response.data?.data;
  }

  async deleteProjectSecret(projectId: string, secretId: string): Promise<void> {
    await this.axios.delete(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/secrets/${encodeURIComponent(secretId)}`
      )
    );
  }

  // --- Pipelines ---

  async listPipelines(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ pipelines: any[] }>> {
    let response = await this.axios.get(
      this.teamPath(`/projects/${encodeURIComponent(projectId)}/pipelines`),
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

  async getPipeline(projectId: string, pipelineId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/pipelines/${encodeURIComponent(pipelineId)}`
      )
    );
    return response.data?.data;
  }

  // --- Domains ---

  async listDomains(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ domains: any[] }>> {
    let response = await this.axios.get(await this.requiredTeamPath('/domains'), {
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
  ): Promise<PaginatedResponse<{ notificationIntegrations: any[] }>> {
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
    };
    projects?: string[];
    events?: Record<string, boolean>;
  }): Promise<any> {
    let response = await this.axios.post(this.teamPath('/integrations/notifications'), data);
    return response.data?.data;
  }

  async getNotificationIntegration(notificationId: string): Promise<any> {
    let response = await this.axios.get(
      this.teamPath(`/integrations/notifications/${encodeURIComponent(notificationId)}`)
    );
    return response.data?.data;
  }

  async updateNotificationIntegration(
    notificationId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      this.teamPath(`/integrations/notifications/${encodeURIComponent(notificationId)}`),
      data
    );
    return response.data?.data;
  }

  async deleteNotificationIntegration(notificationId: string): Promise<void> {
    await this.axios.delete(
      this.teamPath(`/integrations/notifications/${encodeURIComponent(notificationId)}`)
    );
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
      this.teamPath(`/templates/${encodeURIComponent(templateId)}/runs`),
      args ? { arguments: args } : {}
    );
    return response.data?.data;
  }

  // --- Log Sinks ---

  async listLogSinks(
    params?: PaginationParams
  ): Promise<PaginatedResponse<{ logSinks: any[] }>> {
    let response = await this.axios.get(
      await this.requiredTeamPath('/integrations/log-sinks'),
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

  // --- Tags ---

  async listTags(params?: PaginationParams): Promise<PaginatedResponse<{ tags: any[] }>> {
    let response = await this.axios.get(await this.requiredTeamPath('/tags'), {
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
    let response = await this.axios.get(await this.requiredTeamPath('/billing/invoices'), {
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

  async getAuthInfo(): Promise<AuthInfo> {
    let response = await this.axios.get('/auth');
    return response.data.data;
  }

  async listTeams(params?: PaginationParams): Promise<PaginatedResponse<{ teams: any[] }>> {
    let response = await this.axios.get('/teams', {
      params: { page: params?.page, per_page: params?.perPage, cursor: params?.cursor }
    });
    return response.data;
  }

  async restartService(projectId: string, serviceId: string): Promise<void> {
    await this.axios.post(
      this.teamPath(
        `/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}/restart`
      )
    );
  }
}
