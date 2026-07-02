import { createAxios } from 'slates';

export class NeonClient {
  private axios;

  constructor(private options: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://console.neon.tech/api/v2'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.options.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(params?: {
    cursor?: string;
    limit?: number;
    search?: string;
    orgId?: string;
  }) {
    let response = await this.axios.get('/projects', {
      headers: this.headers,
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        search: params?.search,
        org_id: params?.orgId
      }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createProject(data: {
    name?: string;
    regionId?: string;
    pgVersion?: number;
    orgId?: string;
    defaultEndpointSettings?: Record<string, any>;
    settings?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      project: {
        name: data.name,
        region_id: data.regionId,
        pg_version: data.pgVersion,
        default_endpoint_settings: data.defaultEndpointSettings,
        settings: data.settings
      }
    };
    if (data.orgId) {
      body.project.org_id = data.orgId;
    }
    let response = await this.axios.post('/projects', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateProject(
    projectId: string,
    data: {
      name?: string;
      defaultEndpointSettings?: Record<string, any>;
      settings?: Record<string, any>;
    }
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}`,
      {
        project: {
          name: data.name,
          default_endpoint_settings: data.defaultEndpointSettings,
          settings: data.settings
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.axios.delete(`/projects/${projectId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async recoverProject(projectId: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/recover`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Branches ──────────────────────────────────────────────

  async listBranches(
    projectId: string,
    params?: {
      cursor?: string;
      limit?: number;
      search?: string;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/branches`, {
      headers: this.headers,
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        search: params?.search
      }
    });
    return response.data;
  }

  async getBranch(projectId: string, branchId: string) {
    let response = await this.axios.get(`/projects/${projectId}/branches/${branchId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createBranch(
    projectId: string,
    data?: {
      name?: string;
      parentId?: string;
      parentTimestamp?: string;
      parentLsn?: string;
      endpoints?: Array<{
        type: string;
        autoscalingLimitMinCu?: number;
        autoscalingLimitMaxCu?: number;
        suspendTimeoutSeconds?: number;
      }>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data) {
      let branch: Record<string, any> = {};
      if (data.name) branch.name = data.name;
      if (data.parentId) branch.parent_id = data.parentId;
      if (data.parentTimestamp) branch.parent_timestamp = data.parentTimestamp;
      if (data.parentLsn) branch.parent_lsn = data.parentLsn;
      body.branch = branch;

      if (data.endpoints && data.endpoints.length > 0) {
        body.endpoints = data.endpoints.map(ep => ({
          type: ep.type,
          autoscaling_limit_min_cu: ep.autoscalingLimitMinCu,
          autoscaling_limit_max_cu: ep.autoscalingLimitMaxCu,
          suspend_timeout_seconds: ep.suspendTimeoutSeconds
        }));
      }
    }
    let response = await this.axios.post(`/projects/${projectId}/branches`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateBranch(
    projectId: string,
    branchId: string,
    data: {
      name?: string;
    }
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/branches/${branchId}`,
      {
        branch: {
          name: data.name
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteBranch(projectId: string, branchId: string) {
    let response = await this.axios.delete(`/projects/${projectId}/branches/${branchId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async restoreBranch(
    projectId: string,
    branchId: string,
    data: {
      sourceTimestamp?: string;
      sourceLsn?: string;
      preserveUnderName?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.sourceTimestamp) body.source_timestamp = data.sourceTimestamp;
    if (data.sourceLsn) body.source_lsn = data.sourceLsn;
    if (data.preserveUnderName) body.preserve_under_name = data.preserveUnderName;
    let response = await this.axios.post(
      `/projects/${projectId}/branches/${branchId}/restore`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Databases ─────────────────────────────────────────────

  async listDatabases(projectId: string, branchId: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/branches/${branchId}/databases`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getDatabase(projectId: string, branchId: string, databaseName: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/branches/${branchId}/databases/${databaseName}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createDatabase(
    projectId: string,
    branchId: string,
    data: {
      name: string;
      ownerName: string;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/branches/${branchId}/databases`,
      {
        database: {
          name: data.name,
          owner_name: data.ownerName
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateDatabase(
    projectId: string,
    branchId: string,
    databaseName: string,
    data: {
      name?: string;
      ownerName?: string;
    }
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/branches/${branchId}/databases/${databaseName}`,
      {
        database: {
          name: data.name,
          owner_name: data.ownerName
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteDatabase(projectId: string, branchId: string, databaseName: string) {
    let response = await this.axios.delete(
      `/projects/${projectId}/branches/${branchId}/databases/${databaseName}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Endpoints (Compute) ──────────────────────────────────

  async listEndpoints(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}/endpoints`, {
      headers: this.headers
    });
    return response.data;
  }

  async getEndpoint(projectId: string, endpointId: string) {
    let response = await this.axios.get(`/projects/${projectId}/endpoints/${endpointId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createEndpoint(
    projectId: string,
    data: {
      branchId: string;
      type: string;
      autoscalingLimitMinCu?: number;
      autoscalingLimitMaxCu?: number;
      suspendTimeoutSeconds?: number;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/endpoints`,
      {
        endpoint: {
          branch_id: data.branchId,
          type: data.type,
          autoscaling_limit_min_cu: data.autoscalingLimitMinCu,
          autoscaling_limit_max_cu: data.autoscalingLimitMaxCu,
          suspend_timeout_seconds: data.suspendTimeoutSeconds
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateEndpoint(
    projectId: string,
    endpointId: string,
    data: {
      autoscalingLimitMinCu?: number;
      autoscalingLimitMaxCu?: number;
      suspendTimeoutSeconds?: number;
    }
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/endpoints/${endpointId}`,
      {
        endpoint: {
          autoscaling_limit_min_cu: data.autoscalingLimitMinCu,
          autoscaling_limit_max_cu: data.autoscalingLimitMaxCu,
          suspend_timeout_seconds: data.suspendTimeoutSeconds
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteEndpoint(projectId: string, endpointId: string) {
    let response = await this.axios.delete(`/projects/${projectId}/endpoints/${endpointId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async startEndpoint(projectId: string, endpointId: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/endpoints/${endpointId}/start`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async suspendEndpoint(projectId: string, endpointId: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/endpoints/${endpointId}/suspend`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async restartEndpoint(projectId: string, endpointId: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/endpoints/${endpointId}/restart`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Roles ─────────────────────────────────────────────────

  async listRoles(projectId: string, branchId: string) {
    let response = await this.axios.get(`/projects/${projectId}/branches/${branchId}/roles`, {
      headers: this.headers
    });
    return response.data;
  }

  async getRole(projectId: string, branchId: string, roleName: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/branches/${branchId}/roles/${roleName}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createRole(
    projectId: string,
    branchId: string,
    data: {
      name: string;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/branches/${branchId}/roles`,
      {
        role: {
          name: data.name
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteRole(projectId: string, branchId: string, roleName: string) {
    let response = await this.axios.delete(
      `/projects/${projectId}/branches/${branchId}/roles/${roleName}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async resetRolePassword(projectId: string, branchId: string, roleName: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/branches/${branchId}/roles/${roleName}/reset_password`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Operations ────────────────────────────────────────────

  async listOperations(
    projectId: string,
    params?: {
      cursor?: string;
      limit?: number;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/operations`, {
      headers: this.headers,
      params: {
        cursor: params?.cursor,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async getOperation(projectId: string, operationId: string) {
    let response = await this.axios.get(`/projects/${projectId}/operations/${operationId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Consumption ───────────────────────────────────────────

  async getProjectConsumption(
    projectId: string,
    params?: {
      from?: string;
      to?: string;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}`, {
      headers: this.headers,
      params: {
        from: params?.from,
        to: params?.to
      }
    });
    return response.data;
  }

  async getAccountConsumption(params?: {
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
    orgId?: string;
  }) {
    let response = await this.axios.get('/consumption/projects', {
      headers: this.headers,
      params: {
        from: params?.from,
        to: params?.to,
        cursor: params?.cursor,
        limit: params?.limit,
        org_id: params?.orgId
      }
    });
    return response.data;
  }
}
