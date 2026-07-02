import { createAxios } from 'slates';

export class MakeClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; zoneUrl: string }) {
    let baseURL = `https://${config.zoneUrl}/api/v2`;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Scenarios ──────────────────────────────────────────────────

  async listScenarios(
    params: {
      teamId?: number;
      organizationId?: number;
      folderId?: number;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.teamId !== undefined) query.teamId = params.teamId;
    if (params.organizationId !== undefined) query.organizationId = params.organizationId;
    if (params.folderId !== undefined) query.folderId = params.folderId;
    if (params.isActive !== undefined) query.isActive = params.isActive;
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get('/scenarios', { params: query });
    return response.data;
  }

  async getScenario(scenarioId: number) {
    let response = await this.http.get(`/scenarios/${scenarioId}`);
    return response.data;
  }

  async createScenario(data: {
    teamId: number;
    name?: string;
    blueprint?: string;
    scheduling?: Record<string, any>;
    folderId?: number;
  }) {
    let response = await this.http.post('/scenarios', data);
    return response.data;
  }

  async updateScenario(
    scenarioId: number,
    data: {
      name?: string;
      blueprint?: string;
      scheduling?: Record<string, any>;
      folderId?: number;
      isEnabled?: boolean;
    }
  ) {
    let response = await this.http.patch(`/scenarios/${scenarioId}`, data);
    return response.data;
  }

  async deleteScenario(scenarioId: number) {
    let response = await this.http.delete(`/scenarios/${scenarioId}`);
    return response.data;
  }

  async activateScenario(scenarioId: number) {
    let response = await this.http.post(`/scenarios/${scenarioId}/start`);
    return response.data;
  }

  async deactivateScenario(scenarioId: number) {
    let response = await this.http.post(`/scenarios/${scenarioId}/stop`);
    return response.data;
  }

  async runScenario(scenarioId: number, data?: Record<string, any>) {
    let response = await this.http.post(`/scenarios/${scenarioId}/run`, data ?? {});
    return response.data;
  }

  async cloneScenario(
    scenarioId: number,
    data: {
      targetTeamId: number;
      name?: string;
      notAnalyze?: boolean;
    }
  ) {
    let response = await this.http.post(`/scenarios/${scenarioId}/clone`, data);
    return response.data;
  }

  async getScenarioBlueprint(scenarioId: number) {
    let response = await this.http.get(`/scenarios/${scenarioId}/blueprint`);
    return response.data;
  }

  async getScenarioUsage(scenarioId: number) {
    let response = await this.http.get(`/scenarios/${scenarioId}/usage`);
    return response.data;
  }

  async getScenarioLogs(
    scenarioId: number,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get(`/scenarios/${scenarioId}/logs`, { params: query });
    return response.data;
  }

  // ─── Connections ────────────────────────────────────────────────

  async listConnections(
    teamId: number,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = { teamId };
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get('/connections', { params: query });
    return response.data;
  }

  async getConnection(connectionId: number) {
    let response = await this.http.get(`/connections/${connectionId}`);
    return response.data;
  }

  async createConnection(
    teamId: number,
    data: {
      accountName: string;
      accountType: string;
      scopes?: string[];
    }
  ) {
    let response = await this.http.post('/connections', data, {
      params: { teamId }
    });
    return response.data;
  }

  async renameConnection(connectionId: number, name: string) {
    let response = await this.http.patch(`/connections/${connectionId}`, { name });
    return response.data;
  }

  async deleteConnection(connectionId: number, confirmed?: boolean) {
    let params: Record<string, any> = {};
    if (confirmed !== undefined) params.confirmed = confirmed;

    let response = await this.http.delete(`/connections/${connectionId}`, { params });
    return response.data;
  }

  async verifyConnection(connectionId: number) {
    let response = await this.http.post(`/connections/${connectionId}/test`);
    return response.data;
  }

  // ─── Data Stores ────────────────────────────────────────────────

  async listDataStores(
    teamId: number,
    params: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortDir?: string;
    } = {}
  ) {
    let query: Record<string, any> = { teamId };
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;
    if (params.sortBy !== undefined) query['pg[sortBy]'] = params.sortBy;
    if (params.sortDir !== undefined) query['pg[sortDir]'] = params.sortDir;

    let response = await this.http.get('/data-stores', { params: query });
    return response.data;
  }

  async getDataStore(dataStoreId: number) {
    let response = await this.http.get(`/data-stores/${dataStoreId}`);
    return response.data;
  }

  async createDataStore(data: {
    name: string;
    teamId: number;
    datastructureId: number;
    maxSizeMB: number;
  }) {
    let response = await this.http.post('/data-stores', data);
    return response.data;
  }

  async updateDataStore(
    dataStoreId: number,
    data: {
      name?: string;
      datastructureId?: number;
      maxSizeMB?: number;
    }
  ) {
    let response = await this.http.patch(`/data-stores/${dataStoreId}`, data);
    return response.data;
  }

  async deleteDataStore(dataStoreId: number, teamId: number, confirmed?: boolean) {
    let params: Record<string, any> = { teamId };
    if (confirmed !== undefined) params.confirmed = confirmed;

    let response = await this.http.delete('/data-stores', {
      params,
      data: { ids: [dataStoreId] }
    });
    return response.data;
  }

  async listDataStoreRecords(
    dataStoreId: number,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get(`/data-stores/${dataStoreId}/data`, { params: query });
    return response.data;
  }

  async getDataStoreRecord(dataStoreId: number, recordKey: string) {
    let response = await this.http.get(`/data-stores/${dataStoreId}/data/${recordKey}`);
    return response.data;
  }

  async createDataStoreRecord(dataStoreId: number, data: Record<string, any>) {
    let response = await this.http.post(`/data-stores/${dataStoreId}/data`, data);
    return response.data;
  }

  async updateDataStoreRecord(
    dataStoreId: number,
    recordKey: string,
    data: Record<string, any>
  ) {
    let response = await this.http.put(`/data-stores/${dataStoreId}/data/${recordKey}`, data);
    return response.data;
  }

  async deleteDataStoreRecord(dataStoreId: number, recordKey: string) {
    let response = await this.http.delete(`/data-stores/${dataStoreId}/data/${recordKey}`);
    return response.data;
  }

  // ─── Hooks (Webhooks) ──────────────────────────────────────────

  async listHooks(
    teamId: number,
    params: {
      typeName?: string;
      assigned?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = { teamId };
    if (params.typeName !== undefined) query.typeName = params.typeName;
    if (params.assigned !== undefined) query.assigned = params.assigned;
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get('/hooks', { params: query });
    return response.data;
  }

  async getHook(hookId: number) {
    let response = await this.http.get(`/hooks/${hookId}`);
    return response.data;
  }

  async createHook(data: {
    name: string;
    teamId: number;
    typeName: string;
    method?: string;
    headers?: string;
    stringify?: boolean;
  }) {
    let response = await this.http.post('/hooks', data);
    return response.data;
  }

  async updateHook(hookId: number, data: { name: string }) {
    let response = await this.http.patch(`/hooks/${hookId}`, data);
    return response.data;
  }

  async deleteHook(hookId: number) {
    let response = await this.http.delete(`/hooks/${hookId}`);
    return response.data;
  }

  async enableHook(hookId: number) {
    let response = await this.http.post(`/hooks/${hookId}/enable`);
    return response.data;
  }

  async disableHook(hookId: number) {
    let response = await this.http.post(`/hooks/${hookId}/disable`);
    return response.data;
  }

  async pingHook(hookId: number) {
    let response = await this.http.get(`/hooks/${hookId}/ping`);
    return response.data;
  }

  // ─── Organizations ─────────────────────────────────────────────

  async listOrganizations() {
    let response = await this.http.get('/organizations');
    return response.data;
  }

  async getOrganization(organizationId: number) {
    let response = await this.http.get(`/organizations/${organizationId}`);
    return response.data;
  }

  async updateOrganization(
    organizationId: number,
    data: {
      name?: string;
      timezoneId?: number;
      countryId?: number;
    }
  ) {
    let response = await this.http.patch(`/organizations/${organizationId}`, data);
    return response.data;
  }

  // ─── Teams ─────────────────────────────────────────────────────

  async listTeams(
    organizationId: number,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = { organizationId };
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get('/teams', { params: query });
    return response.data;
  }

  async getTeam(teamId: number) {
    let response = await this.http.get(`/teams/${teamId}`);
    return response.data;
  }

  async createTeam(data: { name: string; organizationId: number; operationsLimit?: number }) {
    let response = await this.http.post('/teams', data);
    return response.data;
  }

  async deleteTeam(teamId: number, confirmed?: boolean) {
    let params: Record<string, any> = {};
    if (confirmed !== undefined) params.confirmed = confirmed;

    let response = await this.http.delete(`/teams/${teamId}`, { params });
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────────

  async listUsers(params: {
    organizationId?: number;
    teamId?: number;
    limit?: number;
    offset?: number;
  }) {
    let query: Record<string, any> = {};
    if (params.organizationId !== undefined) query.organizationId = params.organizationId;
    if (params.teamId !== undefined) query.teamId = params.teamId;
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get('/users', { params: query });
    return response.data;
  }

  // ─── Incomplete Executions (DLQs) ──────────────────────────────

  async listIncompleteExecutions(
    scenarioId: number,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get(`/scenarios/${scenarioId}/dlqs`, { params: query });
    return response.data;
  }

  // ─── Data Structures ────────────────────────────────────────────

  async listDataStructures(
    teamId: number,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = { teamId };
    if (params.limit !== undefined) query['pg[limit]'] = params.limit;
    if (params.offset !== undefined) query['pg[offset]'] = params.offset;

    let response = await this.http.get('/data-structures', { params: query });
    return response.data;
  }

  async getDataStructure(dataStructureId: number) {
    let response = await this.http.get(`/data-structures/${dataStructureId}`);
    return response.data;
  }

  async createDataStructure(data: {
    name: string;
    teamId: number;
    spec: Record<string, any>[];
    strict?: boolean;
  }) {
    let response = await this.http.post('/data-structures', data);
    return response.data;
  }

  async updateDataStructure(
    dataStructureId: number,
    data: {
      name?: string;
      spec?: Record<string, any>[];
      strict?: boolean;
    }
  ) {
    let response = await this.http.patch(`/data-structures/${dataStructureId}`, data);
    return response.data;
  }

  async deleteDataStructure(dataStructureId: number) {
    let response = await this.http.delete(`/data-structures/${dataStructureId}`);
    return response.data;
  }

  // ─── Team Variables ─────────────────────────────────────────────

  async listTeamVariables(teamId: number) {
    let response = await this.http.get(`/teams/${teamId}/variables`);
    return response.data;
  }

  async createTeamVariable(
    teamId: number,
    data: {
      name: string;
      value: string;
      typeId: number;
    }
  ) {
    let response = await this.http.post(`/teams/${teamId}/variables`, data);
    return response.data;
  }

  async updateTeamVariable(
    teamId: number,
    variableName: string,
    data: {
      value?: string;
      typeId?: number;
    }
  ) {
    let response = await this.http.patch(`/teams/${teamId}/variables/${variableName}`, data);
    return response.data;
  }

  async deleteTeamVariable(teamId: number, variableName: string, confirmed?: boolean) {
    let params: Record<string, any> = {};
    if (confirmed !== undefined) params.confirmed = confirmed;

    let response = await this.http.delete(`/teams/${teamId}/variables/${variableName}`, {
      params
    });
    return response.data;
  }

  // ─── Organization Usage ─────────────────────────────────────────

  async getOrganizationUsage(organizationId: number) {
    let response = await this.http.get(`/organizations/${organizationId}/usage`);
    return response.data;
  }

  async getTeamUsage(teamId: number) {
    let response = await this.http.get(`/teams/${teamId}/usage`);
    return response.data;
  }
}
