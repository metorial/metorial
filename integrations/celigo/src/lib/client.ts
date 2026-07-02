import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.integrator.io/v1',
  eu: 'https://api.eu.integrator.io/v1'
};

export class Client {
  private token: string;
  private region: string;

  constructor(config: { token: string; region: string }) {
    this.token = config.token;
    this.region = config.region;
  }

  private getAxios() {
    return createAxios({
      baseURL: BASE_URLS[this.region] || BASE_URLS.us,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Token Info ----

  async getTokenInfo(): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/tokenInfo');
    return response.data;
  }

  // ---- Connections ----

  async listConnections(): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/connections');
    return response.data;
  }

  async getConnection(connectionId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/connections/${connectionId}`);
    return response.data;
  }

  async createConnection(connectionData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/connections', connectionData);
    return response.data;
  }

  async updateConnection(
    connectionId: string,
    connectionData: Record<string, any>
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/connections/${connectionId}`, connectionData);
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/connections/${connectionId}`);
  }

  async pingConnection(connectionId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/connections/${connectionId}/ping`);
    return response.data;
  }

  // ---- Flows ----

  async listFlows(): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/flows');
    return response.data;
  }

  async getFlow(flowId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/flows/${flowId}`);
    return response.data;
  }

  async createFlow(flowData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/flows', flowData);
    return response.data;
  }

  async updateFlow(flowId: string, flowData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/flows/${flowId}`, flowData);
    return response.data;
  }

  async deleteFlow(flowId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/flows/${flowId}`);
  }

  async runFlow(flowId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/flows/${flowId}/run`);
    return response.data;
  }

  async cloneFlow(flowId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/flows/${flowId}/clone`);
    return response.data;
  }

  async getFlowDependencies(flowId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/flows/${flowId}/dependencies`);
    return response.data;
  }

  async enableFlow(flowId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/flows/${flowId}`, { disabled: false });
    return response.data;
  }

  async disableFlow(flowId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/flows/${flowId}`, { disabled: true });
    return response.data;
  }

  // ---- Exports ----

  async listExports(): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/exports');
    return response.data;
  }

  async getExport(exportId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/exports/${exportId}`);
    return response.data;
  }

  async createExport(exportData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/exports', exportData);
    return response.data;
  }

  async updateExport(exportId: string, exportData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/exports/${exportId}`, exportData);
    return response.data;
  }

  async deleteExport(exportId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/exports/${exportId}`);
  }

  async cloneExport(exportId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/exports/${exportId}/clone`);
    return response.data;
  }

  // ---- Imports ----

  async listImports(): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/imports');
    return response.data;
  }

  async getImport(importId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/imports/${importId}`);
    return response.data;
  }

  async createImport(importData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/imports', importData);
    return response.data;
  }

  async updateImport(importId: string, importData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/imports/${importId}`, importData);
    return response.data;
  }

  async deleteImport(importId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/imports/${importId}`);
  }

  async cloneImport(importId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/imports/${importId}/clone`);
    return response.data;
  }

  // ---- Integrations ----

  async listIntegrations(): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/integrations');
    return response.data;
  }

  async getIntegration(integrationId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/integrations/${integrationId}`);
    return response.data;
  }

  async createIntegration(integrationData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/integrations', integrationData);
    return response.data;
  }

  async updateIntegration(
    integrationId: string,
    integrationData: Record<string, any>
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/integrations/${integrationId}`, integrationData);
    return response.data;
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/integrations/${integrationId}`);
  }

  async cloneIntegration(integrationId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/integrations/${integrationId}/clone`);
    return response.data;
  }

  // ---- Errors ----

  async getFlowErrors(
    flowId: string,
    processorId: string,
    params?: Record<string, string>
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/flows/${flowId}/${processorId}/errors`, { params });
    return response.data;
  }

  async resolveErrors(flowId: string, processorId: string, errorIds: string[]): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/flows/${flowId}/${processorId}/resolved`, {
      errors: errorIds
    });
    return response.data;
  }

  async retryErrors(
    flowId: string,
    processorId: string,
    retryDataKeys: string[]
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/flows/${flowId}/${processorId}/retry`, { retryDataKeys });
    return response.data;
  }

  // ---- Jobs ----

  async listJobs(params?: Record<string, string>): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/jobs', { params });
    return response.data;
  }

  async getJob(jobId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/jobs/${jobId}`);
    return response.data;
  }

  async getJobErrors(jobId: string): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get(`/jobs/${jobId}/joberrors`);
    return response.data;
  }

  // ---- Users ----

  async listUsers(): Promise<any[]> {
    let ax = this.getAxios();
    let response = await ax.get('/users');
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/users/${userId}`);
    return response.data;
  }

  async inviteUser(userData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/users/${userId}`);
  }

  // ---- State ----

  async listGlobalStateKeys(): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/state');
    return response.data;
  }

  async getGlobalState(key: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/state/${key}`);
    return response.data;
  }

  async setGlobalState(key: string, value: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/state/${key}`, value);
    return response.data;
  }

  async deleteGlobalState(key: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/state/${key}`);
  }

  async deleteAllGlobalState(): Promise<void> {
    let ax = this.getAxios();
    await ax.delete('/state');
  }

  async getResourceState(resourceType: string, resourceId: string, key: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/${resourceType}/${resourceId}/state/${key}`);
    return response.data;
  }

  async setResourceState(
    resourceType: string,
    resourceId: string,
    key: string,
    value: Record<string, any>
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/${resourceType}/${resourceId}/state/${key}`, value);
    return response.data;
  }

  async deleteResourceState(
    resourceType: string,
    resourceId: string,
    key: string
  ): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/${resourceType}/${resourceId}/state/${key}`);
  }

  async listResourceStateKeys(resourceType: string, resourceId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/${resourceType}/${resourceId}/state`);
    return response.data;
  }

  // ---- Audit Log ----

  async getAuditLog(params?: Record<string, string>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/audit', { params });
    return response.data;
  }
}
