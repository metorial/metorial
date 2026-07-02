import { createAxios } from 'slates';

export interface PowerBIClientConfig {
  token: string;
}

export class PowerBIClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: PowerBIClientConfig) {
    this.http = createAxios({
      baseURL: 'https://api.powerbi.com/v1.0/myorg'
    });
    this.http.defaults.headers.common.Authorization = `Bearer ${config.token}`;
  }

  // ─── Workspaces (Groups) ───────────────────────────────────────

  async listWorkspaces(): Promise<any[]> {
    let response = await this.http.get('/groups', {
      params: { $top: 1000 }
    });
    return response.data.value || [];
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    let response = await this.http.get(`/groups/${workspaceId}`);
    return response.data;
  }

  async createWorkspace(name: string): Promise<any> {
    let response = await this.http.post('/groups', { name });
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.http.delete(`/groups/${workspaceId}`);
  }

  async listWorkspaceUsers(workspaceId: string): Promise<any[]> {
    let response = await this.http.get(`/groups/${workspaceId}/users`);
    return response.data.value || [];
  }

  async addWorkspaceUser(
    workspaceId: string,
    emailAddress: string,
    groupUserAccessRight: string
  ): Promise<void> {
    await this.http.post(`/groups/${workspaceId}/users`, {
      emailAddress,
      groupUserAccessRight
    });
  }

  async updateWorkspaceUser(
    workspaceId: string,
    emailAddress: string,
    groupUserAccessRight: string
  ): Promise<void> {
    await this.http.put(`/groups/${workspaceId}/users`, {
      emailAddress,
      groupUserAccessRight
    });
  }

  async deleteWorkspaceUser(workspaceId: string, userId: string): Promise<void> {
    await this.http.delete(`/groups/${workspaceId}/users/${userId}`);
  }

  // ─── Datasets ──────────────────────────────────────────────────

  async listDatasets(workspaceId?: string): Promise<any[]> {
    let path = workspaceId ? `/groups/${workspaceId}/datasets` : '/datasets';
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async getDataset(datasetId: string, workspaceId?: string): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}`
      : `/datasets/${datasetId}`;
    let response = await this.http.get(path);
    return response.data;
  }

  async deleteDataset(datasetId: string, workspaceId?: string): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}`
      : `/datasets/${datasetId}`;
    await this.http.delete(path);
  }

  async refreshDataset(datasetId: string, workspaceId?: string): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/refreshes`
      : `/datasets/${datasetId}/refreshes`;
    await this.http.post(path, {});
  }

  async getRefreshHistory(
    datasetId: string,
    workspaceId?: string,
    top?: number
  ): Promise<any[]> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/refreshes`
      : `/datasets/${datasetId}/refreshes`;
    let response = await this.http.get(path, {
      params: top ? { $top: top } : undefined
    });
    return response.data.value || [];
  }

  async getDatasetParameters(datasetId: string, workspaceId?: string): Promise<any[]> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/parameters`
      : `/datasets/${datasetId}/parameters`;
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async updateDatasetParameters(
    datasetId: string,
    parameters: Array<{ name: string; newValue: string }>,
    workspaceId?: string
  ): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/Default.UpdateParameters`
      : `/datasets/${datasetId}/Default.UpdateParameters`;
    await this.http.post(path, {
      updateDetails: parameters
    });
  }

  async getDatasources(datasetId: string, workspaceId?: string): Promise<any[]> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/datasources`
      : `/datasets/${datasetId}/datasources`;
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async takeOverDataset(datasetId: string, workspaceId?: string): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/Default.TakeOver`
      : `/datasets/${datasetId}/Default.TakeOver`;
    await this.http.post(path, {});
  }

  async getRefreshSchedule(datasetId: string, workspaceId?: string): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/refreshSchedule`
      : `/datasets/${datasetId}/refreshSchedule`;
    let response = await this.http.get(path);
    return response.data;
  }

  async updateRefreshSchedule(
    datasetId: string,
    schedule: any,
    workspaceId?: string
  ): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/refreshSchedule`
      : `/datasets/${datasetId}/refreshSchedule`;
    await this.http.patch(path, { value: schedule });
  }

  // ─── Push Datasets ────────────────────────────────────────────

  async createPushDataset(dataset: any, workspaceId?: string): Promise<any> {
    let path = workspaceId ? `/groups/${workspaceId}/datasets` : '/datasets';
    let response = await this.http.post(path, dataset, {
      params: { defaultRetentionPolicy: 'basicFIFO' }
    });
    return response.data;
  }

  async pushRows(
    datasetId: string,
    tableName: string,
    rows: any[],
    workspaceId?: string
  ): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`
      : `/datasets/${datasetId}/tables/${tableName}/rows`;
    await this.http.post(path, { rows });
  }

  async deleteRows(datasetId: string, tableName: string, workspaceId?: string): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`
      : `/datasets/${datasetId}/tables/${tableName}/rows`;
    await this.http.delete(path);
  }

  async getDatasetTables(datasetId: string, workspaceId?: string): Promise<any[]> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/tables`
      : `/datasets/${datasetId}/tables`;
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  // ─── Reports ───────────────────────────────────────────────────

  async listReports(workspaceId?: string): Promise<any[]> {
    let path = workspaceId ? `/groups/${workspaceId}/reports` : '/reports';
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async getReport(reportId: string, workspaceId?: string): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}`
      : `/reports/${reportId}`;
    let response = await this.http.get(path);
    return response.data;
  }

  async deleteReport(reportId: string, workspaceId?: string): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}`
      : `/reports/${reportId}`;
    await this.http.delete(path);
  }

  async cloneReport(
    reportId: string,
    cloneBody: { name: string; targetWorkspaceId?: string; targetModelId?: string },
    workspaceId?: string
  ): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}/Clone`
      : `/reports/${reportId}/Clone`;
    let response = await this.http.post(path, cloneBody);
    return response.data;
  }

  async rebindReport(
    reportId: string,
    datasetId: string,
    workspaceId?: string
  ): Promise<void> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}/Rebind`
      : `/reports/${reportId}/Rebind`;
    await this.http.post(path, { datasetId });
  }

  async getReportPages(reportId: string, workspaceId?: string): Promise<any[]> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}/pages`
      : `/reports/${reportId}/pages`;
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async exportReport(reportId: string, exportConfig: any, workspaceId?: string): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}/ExportTo`
      : `/reports/${reportId}/ExportTo`;
    let response = await this.http.post(path, exportConfig);
    return response.data;
  }

  async getExportStatus(
    reportId: string,
    exportId: string,
    workspaceId?: string
  ): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}/exports/${exportId}`
      : `/reports/${reportId}/exports/${exportId}`;
    let response = await this.http.get(path);
    return response.data;
  }

  // ─── Dashboards ────────────────────────────────────────────────

  async listDashboards(workspaceId?: string): Promise<any[]> {
    let path = workspaceId ? `/groups/${workspaceId}/dashboards` : '/dashboards';
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async getDashboard(dashboardId: string, workspaceId?: string): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/dashboards/${dashboardId}`
      : `/dashboards/${dashboardId}`;
    let response = await this.http.get(path);
    return response.data;
  }

  async getDashboardTiles(dashboardId: string, workspaceId?: string): Promise<any[]> {
    let path = workspaceId
      ? `/groups/${workspaceId}/dashboards/${dashboardId}/tiles`
      : `/dashboards/${dashboardId}/tiles`;
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async cloneDashboard(
    dashboardId: string,
    name: string,
    targetWorkspaceId?: string
  ): Promise<any> {
    let body: any = { name };
    if (targetWorkspaceId) {
      body.targetWorkspaceId = targetWorkspaceId;
    }
    let response = await this.http.post(`/dashboards/${dashboardId}/Clone`, body);
    return response.data;
  }

  // ─── DAX Query ─────────────────────────────────────────────────

  async executeDaxQuery(datasetId: string, query: string, workspaceId?: string): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/datasets/${datasetId}/executeQueries`
      : `/datasets/${datasetId}/executeQueries`;
    let response = await this.http.post(path, {
      queries: [{ query }],
      serializerSettings: { includeNulls: true }
    });
    return response.data;
  }

  // ─── Embed Tokens ──────────────────────────────────────────────

  async generateEmbedToken(body: any): Promise<any> {
    let response = await this.http.post('/GenerateToken', body);
    return response.data;
  }

  async generateReportEmbedToken(
    reportId: string,
    body: any,
    workspaceId?: string
  ): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/reports/${reportId}/GenerateToken`
      : `/reports/${reportId}/GenerateToken`;
    let response = await this.http.post(path, body);
    return response.data;
  }

  async generateDashboardEmbedToken(
    dashboardId: string,
    body: any,
    workspaceId?: string
  ): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/dashboards/${dashboardId}/GenerateToken`
      : `/dashboards/${dashboardId}/GenerateToken`;
    let response = await this.http.post(path, body);
    return response.data;
  }

  // ─── Imports ───────────────────────────────────────────────────

  async getImports(workspaceId?: string): Promise<any[]> {
    let path = workspaceId ? `/groups/${workspaceId}/imports` : '/imports';
    let response = await this.http.get(path);
    return response.data.value || [];
  }

  async getImport(importId: string, workspaceId?: string): Promise<any> {
    let path = workspaceId
      ? `/groups/${workspaceId}/imports/${importId}`
      : `/imports/${importId}`;
    let response = await this.http.get(path);
    return response.data;
  }

  // ─── Dataflows ─────────────────────────────────────────────────

  async listDataflows(workspaceId: string): Promise<any[]> {
    let response = await this.http.get(`/groups/${workspaceId}/dataflows`);
    return response.data.value || [];
  }

  async getDataflow(workspaceId: string, dataflowId: string): Promise<any> {
    let response = await this.http.get(`/groups/${workspaceId}/dataflows/${dataflowId}`);
    return response.data;
  }

  async refreshDataflow(workspaceId: string, dataflowId: string): Promise<void> {
    await this.http.post(`/groups/${workspaceId}/dataflows/${dataflowId}/refreshes`, {
      notifyOption: 'NoNotification'
    });
  }

  async getDataflowDatasources(workspaceId: string, dataflowId: string): Promise<any[]> {
    let response = await this.http.get(
      `/groups/${workspaceId}/dataflows/${dataflowId}/datasources`
    );
    return response.data.value || [];
  }

  // ─── Deployment Pipelines ──────────────────────────────────────

  async listPipelines(): Promise<any[]> {
    let response = await this.http.get('/pipelines');
    return response.data.value || [];
  }

  async getPipeline(pipelineId: string): Promise<any> {
    let response = await this.http.get(`/pipelines/${pipelineId}`, {
      params: { $expand: 'stages' }
    });
    return response.data;
  }

  async getPipelineStages(pipelineId: string): Promise<any[]> {
    let response = await this.http.get(`/pipelines/${pipelineId}/stages`);
    return response.data.value || [];
  }

  async getPipelineStageArtifacts(pipelineId: string, stageOrder: number): Promise<any> {
    let response = await this.http.get(
      `/pipelines/${pipelineId}/stages/${stageOrder}/artifacts`
    );
    return response.data;
  }

  async deployPipelineStage(pipelineId: string, body: any): Promise<any> {
    let response = await this.http.post(`/pipelines/${pipelineId}/deployAll`, body);
    let data = response.data;
    if (Array.isArray(data?.value)) {
      return data.value[0] || {};
    }
    return data;
  }

  async getPipelineOperations(pipelineId: string): Promise<any[]> {
    let response = await this.http.get(`/pipelines/${pipelineId}/operations`);
    return response.data.value || [];
  }

  // ─── Gateways ──────────────────────────────────────────────────

  async listGateways(): Promise<any[]> {
    let response = await this.http.get('/gateways');
    return response.data.value || [];
  }

  async getGateway(gatewayId: string): Promise<any> {
    let response = await this.http.get(`/gateways/${gatewayId}`);
    return response.data;
  }

  async getGatewayDatasources(gatewayId: string): Promise<any[]> {
    let response = await this.http.get(`/gateways/${gatewayId}/datasources`);
    return response.data.value || [];
  }

  // ─── Apps ──────────────────────────────────────────────────────

  async listApps(): Promise<any[]> {
    let response = await this.http.get('/apps');
    return response.data.value || [];
  }

  async getApp(appId: string): Promise<any> {
    let response = await this.http.get(`/apps/${appId}`);
    return response.data;
  }

  async getAppReports(appId: string): Promise<any[]> {
    let response = await this.http.get(`/apps/${appId}/reports`);
    return response.data.value || [];
  }

  async getAppDashboards(appId: string): Promise<any[]> {
    let response = await this.http.get(`/apps/${appId}/dashboards`);
    return response.data.value || [];
  }

  // ─── Capacities ────────────────────────────────────────────────

  async listCapacities(): Promise<any[]> {
    let response = await this.http.get('/capacities');
    return response.data.value || [];
  }

  async assignWorkspaceToCapacity(workspaceId: string, capacityId: string): Promise<void> {
    await this.http.post(`/groups/${workspaceId}/AssignToCapacity`, {
      capacityId
    });
  }

  async unassignWorkspaceFromCapacity(workspaceId: string): Promise<void> {
    await this.http.post(`/groups/${workspaceId}/AssignToCapacity`, {
      capacityId: '00000000-0000-0000-0000-000000000000'
    });
  }

  // ─── Admin ─────────────────────────────────────────────────────

  async adminGetGroups(top?: number, filter?: string): Promise<any> {
    let params: any = {};
    if (top) params.$top = top;
    if (filter) params.$filter = filter;
    let response = await this.http.get('/admin/groups', { params });
    return response.data;
  }

  async adminGetDatasets(): Promise<any[]> {
    let response = await this.http.get('/admin/datasets');
    return response.data.value || [];
  }

  async adminGetReports(): Promise<any[]> {
    let response = await this.http.get('/admin/reports');
    return response.data.value || [];
  }

  async adminGetDashboards(): Promise<any[]> {
    let response = await this.http.get('/admin/dashboards');
    return response.data.value || [];
  }

  async adminScanWorkspaces(workspaceIds: string[]): Promise<any> {
    let response = await this.http.post(
      '/admin/workspaces/getInfo',
      {
        workspaces: workspaceIds
      },
      {
        params: {
          lineageInfo: true,
          datasourceDetails: true,
          datasetSchema: false,
          datasetExpressions: false
        }
      }
    );
    return response.data;
  }

  async adminGetScanStatus(scanId: string): Promise<any> {
    let response = await this.http.get(`/admin/workspaces/scanStatus/${scanId}`);
    return response.data;
  }

  async adminGetScanResult(scanId: string): Promise<any> {
    let response = await this.http.get(`/admin/workspaces/scanResult/${scanId}`);
    return response.data;
  }
}
