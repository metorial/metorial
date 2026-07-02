import { createAxios } from 'slates';

export interface KibanaClientConfig {
  kibanaUrl: string;
  token: string;
  spaceId?: string;
}

export class KibanaClient {
  private axios: ReturnType<typeof createAxios>;
  private spaceId?: string;

  constructor(config: KibanaClientConfig) {
    let baseUrl = config.kibanaUrl.replace(/\/+$/, '');
    this.spaceId = config.spaceId;

    this.axios = createAxios({
      baseURL: baseUrl,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true'
      }
    });
  }

  private getApiPath(path: string): string {
    if (this.spaceId) {
      return `/s/${this.spaceId}${path}`;
    }
    return path;
  }

  // ─── Saved Objects ─────────────────────────────────────────────

  async findSavedObjects(params: {
    type: string;
    search?: string;
    searchFields?: string[];
    page?: number;
    perPage?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<any> {
    let query: Record<string, any> = {
      type: params.type,
      page: params.page ?? 1,
      per_page: params.perPage ?? 20
    };
    if (params.search) query.search = params.search;
    if (params.searchFields) query.search_fields = params.searchFields;
    if (params.sortField) query.sort_field = params.sortField;
    if (params.sortOrder) query.sort_order = params.sortOrder;

    let response = await this.axios.get(this.getApiPath('/api/saved_objects/_find'), {
      params: query
    });
    return response.data;
  }

  async getSavedObject(type: string, objectId: string): Promise<any> {
    let response = await this.axios.get(
      this.getApiPath(`/api/saved_objects/${type}/${objectId}`)
    );
    return response.data;
  }

  async createSavedObject(
    type: string,
    attributes: Record<string, any>,
    options?: {
      objectId?: string;
      references?: Array<{ id: string; name: string; type: string }>;
      overwrite?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = { attributes };
    if (options?.references) body.references = options.references;
    if (options?.overwrite !== undefined) body.overwrite = options.overwrite;

    let path = options?.objectId
      ? this.getApiPath(`/api/saved_objects/${type}/${options.objectId}`)
      : this.getApiPath(`/api/saved_objects/${type}`);

    let response = await this.axios.post(path, body);
    return response.data;
  }

  async updateSavedObject(
    type: string,
    objectId: string,
    attributes: Record<string, any>,
    options?: {
      references?: Array<{ id: string; name: string; type: string }>;
    }
  ): Promise<any> {
    let body: Record<string, any> = { attributes };
    if (options?.references) body.references = options.references;

    let response = await this.axios.put(
      this.getApiPath(`/api/saved_objects/${type}/${objectId}`),
      body
    );
    return response.data;
  }

  async deleteSavedObject(type: string, objectId: string, force?: boolean): Promise<void> {
    let query: Record<string, any> = {};
    if (force) query.force = true;
    await this.axios.delete(this.getApiPath(`/api/saved_objects/${type}/${objectId}`), {
      params: query
    });
  }

  async exportSavedObjects(params: {
    types?: string[];
    objects?: Array<{ type: string; id: string }>;
    includeReferencesDeep?: boolean;
    excludeExportDetails?: boolean;
  }): Promise<string> {
    let body: Record<string, any> = {};
    if (params.types) body.type = params.types;
    if (params.objects) body.objects = params.objects;
    if (params.includeReferencesDeep !== undefined)
      body.includeReferencesDeep = params.includeReferencesDeep;
    if (params.excludeExportDetails !== undefined)
      body.excludeExportDetails = params.excludeExportDetails;

    let response = await this.axios.post(this.getApiPath('/api/saved_objects/_export'), body, {
      responseType: 'text'
    });
    return response.data;
  }

  // ─── Data Views ────────────────────────────────────────────────

  async getDataViews(): Promise<any> {
    let response = await this.axios.get(this.getApiPath('/api/data_views'));
    return response.data;
  }

  async getDataView(dataViewId: string): Promise<any> {
    let response = await this.axios.get(
      this.getApiPath(`/api/data_views/data_view/${dataViewId}`)
    );
    return response.data;
  }

  async createDataView(params: {
    title: string;
    name?: string;
    timeFieldName?: string;
    sourceFilters?: Array<{ value: string }>;
    fieldFormats?: Record<string, any>;
    runtimeFieldMap?: Record<string, any>;
    allowNoIndex?: boolean;
  }): Promise<any> {
    let response = await this.axios.post(this.getApiPath('/api/data_views/data_view'), {
      data_view: params
    });
    return response.data;
  }

  async updateDataView(
    dataViewId: string,
    params: {
      title?: string;
      name?: string;
      timeFieldName?: string;
      sourceFilters?: Array<{ value: string }>;
      fieldFormats?: Record<string, any>;
      runtimeFieldMap?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      this.getApiPath(`/api/data_views/data_view/${dataViewId}`),
      {
        data_view: params
      }
    );
    return response.data;
  }

  async deleteDataView(dataViewId: string): Promise<void> {
    await this.axios.delete(this.getApiPath(`/api/data_views/data_view/${dataViewId}`));
  }

  // ─── Spaces ────────────────────────────────────────────────────

  async getSpaces(): Promise<any[]> {
    let response = await this.axios.get('/api/spaces/space');
    return response.data;
  }

  async getSpace(spaceId: string): Promise<any> {
    let response = await this.axios.get(`/api/spaces/space/${spaceId}`);
    return response.data;
  }

  async createSpace(params: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    initials?: string;
    disabledFeatures?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/api/spaces/space', params);
    return response.data;
  }

  async updateSpace(
    spaceId: string,
    params: {
      name?: string;
      description?: string;
      color?: string;
      initials?: string;
      disabledFeatures?: string[];
    }
  ): Promise<any> {
    let response = await this.axios.put(`/api/spaces/space/${spaceId}`, {
      id: spaceId,
      ...params
    });
    return response.data;
  }

  async deleteSpace(spaceId: string): Promise<void> {
    await this.axios.delete(`/api/spaces/space/${spaceId}`);
  }

  // ─── Alerting Rules ────────────────────────────────────────────

  async findRules(params?: {
    page?: number;
    perPage?: number;
    search?: string;
    searchFields?: string[];
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    filter?: string;
  }): Promise<any> {
    let query: Record<string, any> = {
      page: params?.page ?? 1,
      per_page: params?.perPage ?? 20
    };
    if (params?.search) query.search = params.search;
    if (params?.searchFields) query.search_fields = params.searchFields;
    if (params?.sortField) query.sort_field = params.sortField;
    if (params?.sortOrder) query.sort_order = params.sortOrder;
    if (params?.filter) query.filter = params.filter;

    let response = await this.axios.get(this.getApiPath('/api/alerting/rules/_find'), {
      params: query
    });
    return response.data;
  }

  async getRule(ruleId: string): Promise<any> {
    let response = await this.axios.get(this.getApiPath(`/api/alerting/rule/${ruleId}`));
    return response.data;
  }

  async createRule(params: {
    name: string;
    ruleTypeId: string;
    consumer: string;
    schedule: { interval: string };
    params: Record<string, any>;
    actions?: Array<{
      group: string;
      id: string;
      params: Record<string, any>;
      frequency?: {
        summary: boolean;
        notify_when: string;
        throttle?: string | null;
      };
    }>;
    tags?: string[];
    enabled?: boolean;
    throttle?: string | null;
    notify_when?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: params.name,
      rule_type_id: params.ruleTypeId,
      consumer: params.consumer,
      schedule: params.schedule,
      params: params.params
    };
    if (params.actions) body.actions = params.actions;
    if (params.tags) body.tags = params.tags;
    if (params.enabled !== undefined) body.enabled = params.enabled;
    if (params.throttle !== undefined) body.throttle = params.throttle;
    if (params.notify_when) body.notify_when = params.notify_when;

    let response = await this.axios.post(this.getApiPath('/api/alerting/rule'), body);
    return response.data;
  }

  async updateRule(
    ruleId: string,
    params: {
      name?: string;
      schedule?: { interval: string };
      params?: Record<string, any>;
      actions?: Array<{
        group: string;
        id: string;
        params: Record<string, any>;
        frequency?: {
          summary: boolean;
          notify_when: string;
          throttle?: string | null;
        };
      }>;
      tags?: string[];
      throttle?: string | null;
      notify_when?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.schedule) body.schedule = params.schedule;
    if (params.params) body.params = params.params;
    if (params.actions) body.actions = params.actions;
    if (params.tags) body.tags = params.tags;
    if (params.throttle !== undefined) body.throttle = params.throttle;
    if (params.notify_when) body.notify_when = params.notify_when;

    let response = await this.axios.put(this.getApiPath(`/api/alerting/rule/${ruleId}`), body);
    return response.data;
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.axios.delete(this.getApiPath(`/api/alerting/rule/${ruleId}`));
  }

  async enableRule(ruleId: string): Promise<void> {
    await this.axios.post(this.getApiPath(`/api/alerting/rule/${ruleId}/_enable`));
  }

  async disableRule(ruleId: string): Promise<void> {
    await this.axios.post(this.getApiPath(`/api/alerting/rule/${ruleId}/_disable`));
  }

  async muteAllAlerts(ruleId: string): Promise<void> {
    await this.axios.post(this.getApiPath(`/api/alerting/rule/${ruleId}/_mute_all`));
  }

  async unmuteAllAlerts(ruleId: string): Promise<void> {
    await this.axios.post(this.getApiPath(`/api/alerting/rule/${ruleId}/_unmute_all`));
  }

  // ─── Connectors ────────────────────────────────────────────────

  async getConnectors(): Promise<any[]> {
    let response = await this.axios.get(this.getApiPath('/api/actions/connectors'));
    return response.data;
  }

  async getConnector(connectorId: string): Promise<any> {
    let response = await this.axios.get(
      this.getApiPath(`/api/actions/connector/${connectorId}`)
    );
    return response.data;
  }

  async createConnector(params: {
    name: string;
    connectorTypeId: string;
    config?: Record<string, any>;
    secrets?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post(this.getApiPath('/api/actions/connector'), {
      name: params.name,
      connector_type_id: params.connectorTypeId,
      config: params.config ?? {},
      secrets: params.secrets ?? {}
    });
    return response.data;
  }

  async updateConnector(
    connectorId: string,
    params: {
      name?: string;
      config?: Record<string, any>;
      secrets?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.put(
      this.getApiPath(`/api/actions/connector/${connectorId}`),
      params
    );
    return response.data;
  }

  async deleteConnector(connectorId: string): Promise<void> {
    await this.axios.delete(this.getApiPath(`/api/actions/connector/${connectorId}`));
  }

  async executeConnector(
    connectorId: string,
    connectorParams: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      this.getApiPath(`/api/actions/connector/${connectorId}/_execute`),
      {
        params: connectorParams
      }
    );
    return response.data;
  }

  async getConnectorTypes(): Promise<any[]> {
    let response = await this.axios.get(this.getApiPath('/api/actions/connector_types'));
    return response.data;
  }

  // ─── Cases ─────────────────────────────────────────────────────

  async findCases(params?: {
    page?: number;
    perPage?: number;
    search?: string;
    status?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    tags?: string[];
  }): Promise<any> {
    let query: Record<string, any> = {
      page: params?.page ?? 1,
      perPage: params?.perPage ?? 20
    };
    if (params?.search) query.search = params.search;
    if (params?.status) query.status = params.status;
    if (params?.sortField) query.sortField = params.sortField;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.tags) query.tags = params.tags;

    let response = await this.axios.get(this.getApiPath('/api/cases/_find'), {
      params: query
    });
    return response.data;
  }

  async getCase(caseId: string, includeComments?: boolean): Promise<any> {
    let query: Record<string, any> = {};
    if (includeComments) query.includeComments = true;

    let response = await this.axios.get(this.getApiPath(`/api/cases/${caseId}`), {
      params: query
    });
    return response.data;
  }

  async createCase(params: {
    title: string;
    description: string;
    tags?: string[];
    connector?: {
      id: string;
      name: string;
      type: string;
      fields: Record<string, any> | null;
    };
    settings?: { syncAlerts: boolean };
    owner: string;
    severity?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      title: params.title,
      description: params.description,
      tags: params.tags ?? [],
      connector: params.connector ?? { id: 'none', name: 'none', type: '.none', fields: null },
      settings: params.settings ?? { syncAlerts: true },
      owner: params.owner
    };
    if (params.severity) body.severity = params.severity;

    let response = await this.axios.post(this.getApiPath('/api/cases'), body);
    return response.data;
  }

  async updateCase(
    caseId: string,
    version: string,
    params: {
      title?: string;
      description?: string;
      tags?: string[];
      status?: string;
      severity?: string;
      connector?: {
        id: string;
        name: string;
        type: string;
        fields: Record<string, any> | null;
      };
      settings?: { syncAlerts: boolean };
    }
  ): Promise<any> {
    let response = await this.axios.patch(this.getApiPath('/api/cases'), {
      cases: [
        {
          id: caseId,
          version,
          ...params
        }
      ]
    });
    return response.data;
  }

  async deleteCases(caseIds: string[]): Promise<void> {
    await this.axios.delete(this.getApiPath('/api/cases'), {
      params: { ids: caseIds }
    });
  }

  async addCaseComment(
    caseId: string,
    params: {
      type: string;
      comment?: string;
      alertId?: string;
      index?: string;
      owner: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      this.getApiPath(`/api/cases/${caseId}/comments`),
      params
    );
    return response.data;
  }

  // ─── SLOs ──────────────────────────────────────────────────────

  async findSLOs(params?: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    kqlQuery?: string;
  }): Promise<any> {
    let query: Record<string, any> = {
      page: params?.page ?? 1,
      perPage: params?.perPage ?? 25
    };
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortDirection) query.sortDirection = params.sortDirection;
    if (params?.kqlQuery) query.kqlQuery = params.kqlQuery;

    let response = await this.axios.get(this.getApiPath('/api/observability/slos'), {
      params: query
    });
    return response.data;
  }

  async getSLO(sloId: string): Promise<any> {
    let response = await this.axios.get(this.getApiPath(`/api/observability/slos/${sloId}`));
    return response.data;
  }

  async createSLO(params: {
    name: string;
    description?: string;
    indicator: Record<string, any>;
    timeWindow: { duration: string; type: string };
    budgetingMethod: string;
    objective: { target: number; timesliceTarget?: number; timesliceWindow?: string };
    settings?: Record<string, any>;
    tags?: string[];
    groupBy?: string;
  }): Promise<any> {
    let response = await this.axios.post(this.getApiPath('/api/observability/slos'), params);
    return response.data;
  }

  async updateSLO(sloId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      this.getApiPath(`/api/observability/slos/${sloId}`),
      params
    );
    return response.data;
  }

  async deleteSLO(sloId: string): Promise<void> {
    await this.axios.delete(this.getApiPath(`/api/observability/slos/${sloId}`));
  }

  // ─── Fleet ─────────────────────────────────────────────────────

  async getAgentPolicies(params?: {
    page?: number;
    perPage?: number;
    kuery?: string;
  }): Promise<any> {
    let query: Record<string, any> = {
      page: params?.page ?? 1,
      perPage: params?.perPage ?? 20
    };
    if (params?.kuery) query.kuery = params.kuery;

    let response = await this.axios.get(this.getApiPath('/api/fleet/agent_policies'), {
      params: query
    });
    return response.data;
  }

  async getAgentPolicy(policyId: string): Promise<any> {
    let response = await this.axios.get(
      this.getApiPath(`/api/fleet/agent_policies/${policyId}`)
    );
    return response.data;
  }

  async createAgentPolicy(params: {
    name: string;
    description?: string;
    namespace?: string;
    monitoringEnabled?: string[];
  }): Promise<any> {
    let response = await this.axios.post(this.getApiPath('/api/fleet/agent_policies'), params);
    return response.data;
  }

  async updateAgentPolicy(policyId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      this.getApiPath(`/api/fleet/agent_policies/${policyId}`),
      params
    );
    return response.data;
  }

  async deleteAgentPolicy(policyId: string): Promise<void> {
    await this.axios.post(this.getApiPath('/api/fleet/agent_policies/delete'), {
      agentPolicyId: policyId
    });
  }

  async getEnrollmentApiKeys(): Promise<any> {
    let response = await this.axios.get(this.getApiPath('/api/fleet/enrollment_api_keys'));
    return response.data;
  }

  async getAgents(params?: {
    page?: number;
    perPage?: number;
    kuery?: string;
    showInactive?: boolean;
  }): Promise<any> {
    let query: Record<string, any> = {
      page: params?.page ?? 1,
      perPage: params?.perPage ?? 20
    };
    if (params?.kuery) query.kuery = params.kuery;
    if (params?.showInactive) query.showInactive = true;

    let response = await this.axios.get(this.getApiPath('/api/fleet/agents'), {
      params: query
    });
    return response.data;
  }

  // ─── Roles ─────────────────────────────────────────────────────

  async getRoles(): Promise<any[]> {
    let response = await this.axios.get('/api/security/role');
    return response.data;
  }

  async getRole(roleName: string): Promise<any> {
    let response = await this.axios.get(`/api/security/role/${encodeURIComponent(roleName)}`);
    return response.data;
  }

  async createOrUpdateRole(
    roleName: string,
    params: {
      elasticsearch?: {
        cluster?: string[];
        indices?: Array<{
          names: string[];
          privileges: string[];
        }>;
        run_as?: string[];
      };
      kibana?: Array<{
        base?: string[];
        feature?: Record<string, string[]>;
        spaces: string[];
      }>;
    }
  ): Promise<void> {
    await this.axios.put(`/api/security/role/${encodeURIComponent(roleName)}`, params);
  }

  async deleteRole(roleName: string): Promise<void> {
    await this.axios.delete(`/api/security/role/${encodeURIComponent(roleName)}`);
  }

  // ─── Status ────────────────────────────────────────────────────

  async getStatus(): Promise<any> {
    let response = await this.axios.get('/api/status');
    return response.data;
  }
}
