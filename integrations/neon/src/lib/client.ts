import { createAxios } from 'slates';
import { neonApiError } from './errors';

export class NeonClient {
  private axios;

  constructor(private options: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://console.neon.tech/api/v2'
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(neonApiError(error))
    );
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.options.token}`,
      'Content-Type': 'application/json'
    };
  }

  async listRegions(params?: { orgId?: string }) {
    let response = await this.axios.get('/regions', {
      headers: this.headers,
      params: {
        org_id: params?.orgId
      }
    });
    return response.data;
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(params?: {
    cursor?: string;
    limit?: number;
    search?: string;
    orgId?: string;
    recoverable?: boolean;
  }) {
    let response = await this.axios.get('/projects', {
      headers: this.headers,
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        search: params?.search,
        org_id: params?.orgId,
        recoverable: params?.recoverable
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
    branchName?: string;
    databaseName?: string;
    roleName?: string;
    storePasswords?: boolean;
    historyRetentionSeconds?: number;
    defaultEndpointSettings?: Record<string, any>;
    settings?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      project: {
        name: data.name,
        region_id: data.regionId,
        pg_version: data.pgVersion,
        branch: {
          name: data.branchName,
          database_name: data.databaseName,
          role_name: data.roleName
        },
        store_passwords: data.storePasswords,
        history_retention_seconds: data.historyRetentionSeconds,
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
      historyRetentionSeconds?: number;
      defaultEndpointSettings?: Record<string, any>;
      settings?: Record<string, any>;
    }
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}`,
      {
        project: {
          name: data.name,
          history_retention_seconds: data.historyRetentionSeconds,
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

  async getConnectionUri(
    projectId: string,
    data: {
      branchId?: string;
      endpointId?: string;
      databaseName: string;
      roleName: string;
      pooled?: boolean;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/connection_uri`, {
      headers: this.headers,
      params: {
        branch_id: data.branchId,
        endpoint_id: data.endpointId,
        database_name: data.databaseName,
        role_name: data.roleName,
        pooled: data.pooled
      }
    });
    return response.data;
  }

  // ─── Branches ──────────────────────────────────────────────

  async listBranches(
    projectId: string,
    params?: {
      cursor?: string;
      limit?: number;
      search?: string;
      sortBy?: 'name' | 'created_at' | 'updated_at';
      sortOrder?: 'asc' | 'desc';
      includeDeleted?: boolean;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/branches`, {
      headers: this.headers,
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        search: params?.search,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        include_deleted: params?.includeDeleted
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
      protected?: boolean;
      expiresAt?: string | null;
    }
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/branches/${branchId}`,
      {
        branch: {
          name: data.name,
          protected: data.protected,
          expires_at: data.expiresAt
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async setDefaultBranch(projectId: string, branchId: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/branches/${branchId}/set_as_default`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async recoverBranch(projectId: string, branchId: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/branches/${branchId}/recover`,
      {},
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
      name?: string;
      regionId?: string;
      autoscalingLimitMinCu?: number;
      autoscalingLimitMaxCu?: number;
      suspendTimeoutSeconds?: number;
      disabled?: boolean;
      passwordlessAccess?: boolean;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/endpoints`,
      {
        endpoint: {
          branch_id: data.branchId,
          type: data.type,
          name: data.name,
          region_id: data.regionId,
          autoscaling_limit_min_cu: data.autoscalingLimitMinCu,
          autoscaling_limit_max_cu: data.autoscalingLimitMaxCu,
          suspend_timeout_seconds: data.suspendTimeoutSeconds,
          disabled: data.disabled,
          passwordless_access: data.passwordlessAccess
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
      name?: string;
      autoscalingLimitMinCu?: number;
      autoscalingLimitMaxCu?: number;
      suspendTimeoutSeconds?: number;
      disabled?: boolean;
      passwordlessAccess?: boolean;
    }
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/endpoints/${endpointId}`,
      {
        endpoint: {
          name: data.name,
          autoscaling_limit_min_cu: data.autoscalingLimitMinCu,
          autoscaling_limit_max_cu: data.autoscalingLimitMaxCu,
          suspend_timeout_seconds: data.suspendTimeoutSeconds,
          disabled: data.disabled,
          passwordless_access: data.passwordlessAccess
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

  async revealRolePassword(projectId: string, branchId: string, roleName: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/branches/${branchId}/roles/${roleName}/reveal_password`,
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

  // ─── Snapshots ─────────────────────────────────────────────

  async listSnapshots(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}/snapshots`, {
      headers: this.headers
    });
    return response.data;
  }

  async createSnapshot(
    projectId: string,
    branchId: string,
    params?: {
      name?: string;
      lsn?: string;
      timestamp?: string;
      expiresAt?: string;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/branches/${branchId}/snapshot`,
      {},
      {
        headers: this.headers,
        params: {
          name: params?.name,
          lsn: params?.lsn,
          timestamp: params?.timestamp,
          expires_at: params?.expiresAt
        }
      }
    );
    return response.data;
  }

  async updateSnapshot(projectId: string, snapshotId: string, data: { name: string }) {
    let response = await this.axios.patch(
      `/projects/${projectId}/snapshots/${snapshotId}`,
      {
        snapshot: {
          name: data.name
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteSnapshot(projectId: string, snapshotId: string) {
    let response = await this.axios.delete(`/projects/${projectId}/snapshots/${snapshotId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async restoreSnapshot(
    projectId: string,
    snapshotId: string,
    data?: {
      name?: string;
      targetBranchId?: string;
      finalizeRestore?: boolean;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/snapshots/${snapshotId}/restore`,
      {
        name: data?.name,
        target_branch_id: data?.targetBranchId,
        finalize_restore: data?.finalizeRestore
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Consumption ───────────────────────────────────────────

  async getProjectConsumption(
    projectId: string,
    params?: {
      from?: string;
      to?: string;
      granularity?: 'hourly' | 'daily' | 'monthly';
      metrics?: string[];
    }
  ) {
    let response = await this.axios.get('/consumption_history/projects', {
      headers: this.headers,
      params: {
        project_ids: projectId,
        from: params?.from,
        to: params?.to,
        granularity: params?.granularity,
        metrics: params?.metrics
      }
    });
    return response.data;
  }

  async getAccountConsumption(params?: {
    from?: string;
    to?: string;
    granularity?: 'hourly' | 'daily' | 'monthly';
    cursor?: string;
    limit?: number;
    orgId?: string;
    projectIds?: string[];
    metrics?: string[];
  }) {
    let response = await this.axios.get('/consumption_history/projects', {
      headers: this.headers,
      params: {
        from: params?.from,
        to: params?.to,
        granularity: params?.granularity,
        cursor: params?.cursor,
        limit: params?.limit,
        org_id: params?.orgId,
        project_ids: params?.projectIds,
        metrics: params?.metrics
      }
    });
    return response.data;
  }
}
