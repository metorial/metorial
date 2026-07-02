import { createAxios } from 'slates';

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export class RenderClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.render.com/v1'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Services ────────────────────────────────────────

  async listServices(
    params?: {
      ownerId?: string[];
      name?: string[];
      type?: string[];
      createdBefore?: string;
      createdAfter?: string;
      updatedBefore?: string;
      updatedAfter?: string;
    } & PaginationParams
  ) {
    let response = await this.axios.get('/services', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getService(serviceId: string) {
    let response = await this.axios.get(`/services/${serviceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createService(body: Record<string, any>) {
    let response = await this.axios.post('/services', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateService(serviceId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/services/${serviceId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteService(serviceId: string) {
    let response = await this.axios.delete(`/services/${serviceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async suspendService(serviceId: string) {
    let response = await this.axios.post(`/services/${serviceId}/suspend`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async resumeService(serviceId: string) {
    let response = await this.axios.post(`/services/${serviceId}/resume`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async restartService(serviceId: string) {
    let response = await this.axios.post(`/services/${serviceId}/restart`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async scaleService(serviceId: string, numInstances: number) {
    let response = await this.axios.post(
      `/services/${serviceId}/scale`,
      { numInstances },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateAutoscaling(serviceId: string, config: Record<string, any>) {
    let response = await this.axios.put(`/services/${serviceId}/autoscaling`, config, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteAutoscaling(serviceId: string) {
    let response = await this.axios.delete(`/services/${serviceId}/autoscaling`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Environment Variables ───────────────────────────

  async listServiceEnvVars(serviceId: string) {
    let response = await this.axios.get(`/services/${serviceId}/env-vars`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateServiceEnvVars(
    serviceId: string,
    envVars: Array<{ key: string; value: string }>
  ) {
    let response = await this.axios.put(`/services/${serviceId}/env-vars`, envVars, {
      headers: this.headers
    });
    return response.data;
  }

  async getServiceEnvVar(serviceId: string, name: string) {
    let response = await this.axios.get(`/services/${serviceId}/env-vars/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  async setServiceEnvVar(serviceId: string, name: string, value: string) {
    let response = await this.axios.put(
      `/services/${serviceId}/env-vars/${name}`,
      { value },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteServiceEnvVar(serviceId: string, name: string) {
    let response = await this.axios.delete(`/services/${serviceId}/env-vars/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Deployments ─────────────────────────────────────

  async listDeploys(serviceId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/services/${serviceId}/deploys`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async triggerDeploy(
    serviceId: string,
    body?: { clearCache?: string; commitId?: string; imageUrl?: string }
  ) {
    let response = await this.axios.post(`/services/${serviceId}/deploys`, body || {}, {
      headers: this.headers
    });
    return response.data;
  }

  async getDeploy(serviceId: string, deployId: string) {
    let response = await this.axios.get(`/services/${serviceId}/deploys/${deployId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelDeploy(serviceId: string, deployId: string) {
    let response = await this.axios.post(
      `/services/${serviceId}/deploys/${deployId}/cancel`,
      null,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async rollbackDeploy(serviceId: string, deployId: string) {
    let response = await this.axios.post(
      `/services/${serviceId}/deploys/${deployId}/rollback`,
      null,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Custom Domains ──────────────────────────────────

  async listCustomDomains(serviceId: string, params?: PaginationParams) {
    let response = await this.axios.get('/custom-domains', {
      headers: this.headers,
      params: { ...params, serviceId: [serviceId] }
    });
    return response.data;
  }

  async addCustomDomain(serviceId: string, name: string) {
    let response = await this.axios.post(
      '/custom-domains',
      { serviceId, name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getCustomDomain(domainId: string) {
    let response = await this.axios.get(`/custom-domains/${domainId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCustomDomain(domainId: string) {
    let response = await this.axios.delete(`/custom-domains/${domainId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async verifyCustomDomain(domainId: string) {
    let response = await this.axios.post(`/custom-domains/${domainId}/verify`, null, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Postgres ────────────────────────────────────────

  async listPostgres(params?: { ownerId?: string[] } & PaginationParams) {
    let response = await this.axios.get('/postgres', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createPostgres(body: Record<string, any>) {
    let response = await this.axios.post('/postgres', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getPostgres(postgresId: string) {
    let response = await this.axios.get(`/postgres/${postgresId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updatePostgres(postgresId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/postgres/${postgresId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePostgres(postgresId: string) {
    let response = await this.axios.delete(`/postgres/${postgresId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getPostgresConnectionInfo(postgresId: string) {
    let response = await this.axios.get(`/postgres/${postgresId}/connection-info`, {
      headers: this.headers
    });
    return response.data;
  }

  async suspendPostgres(postgresId: string) {
    let response = await this.axios.post(`/postgres/${postgresId}/suspend`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async resumePostgres(postgresId: string) {
    let response = await this.axios.post(`/postgres/${postgresId}/resume`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async restartPostgres(postgresId: string) {
    let response = await this.axios.post(`/postgres/${postgresId}/restart`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async triggerPostgresFailover(postgresId: string) {
    let response = await this.axios.post(`/postgres/${postgresId}/failover`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async listPostgresExports(postgresId: string) {
    let response = await this.axios.get(`/postgres/${postgresId}/exports`, {
      headers: this.headers
    });
    return response.data;
  }

  async createPostgresExport(postgresId: string) {
    let response = await this.axios.post(`/postgres/${postgresId}/exports`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async getPostgresRecoveryInfo(postgresId: string) {
    let response = await this.axios.get(`/postgres/${postgresId}/recovery-info`, {
      headers: this.headers
    });
    return response.data;
  }

  async recoverPostgres(postgresId: string, body: Record<string, any>) {
    let response = await this.axios.post(`/postgres/${postgresId}/recover`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async listPostgresUsers(postgresId: string) {
    let response = await this.axios.get(`/postgres/${postgresId}/users`, {
      headers: this.headers
    });
    return response.data;
  }

  async createPostgresUser(postgresId: string, username: string) {
    let response = await this.axios.post(
      `/postgres/${postgresId}/users`,
      { username },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deletePostgresUser(postgresId: string, username: string) {
    let response = await this.axios.delete(`/postgres/${postgresId}/users/${username}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Key Value (Redis) ───────────────────────────────

  async listKeyValue(params?: { ownerId?: string[] } & PaginationParams) {
    let response = await this.axios.get('/key-value', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createKeyValue(body: Record<string, any>) {
    let response = await this.axios.post('/key-value', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getKeyValue(keyValueId: string) {
    let response = await this.axios.get(`/key-value/${keyValueId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getKeyValueConnectionInfo(keyValueId: string) {
    let response = await this.axios.get(`/key-value/${keyValueId}/connection-info`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateKeyValue(keyValueId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/key-value/${keyValueId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteKeyValue(keyValueId: string) {
    let response = await this.axios.delete(`/key-value/${keyValueId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async suspendKeyValue(keyValueId: string) {
    let response = await this.axios.post(`/key-value/${keyValueId}/suspend`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async resumeKeyValue(keyValueId: string) {
    let response = await this.axios.post(`/key-value/${keyValueId}/resume`, null, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Disks ───────────────────────────────────────────

  async listDisks(serviceId: string, params?: PaginationParams) {
    let response = await this.axios.get('/disks', {
      headers: this.headers,
      params: { ...params, serviceId: [serviceId] }
    });
    return response.data;
  }

  async addDisk(body: Record<string, any>) {
    let response = await this.axios.post('/disks', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getDisk(diskId: string) {
    let response = await this.axios.get(`/disks/${diskId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateDisk(diskId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/disks/${diskId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteDisk(diskId: string) {
    let response = await this.axios.delete(`/disks/${diskId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listDiskSnapshots(diskId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/disks/${diskId}/snapshots`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async restoreDiskSnapshot(diskId: string, snapshotId: string) {
    let response = await this.axios.post(
      `/disks/${diskId}/snapshots/${snapshotId}/restore`,
      null,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Cron Jobs & One-Off Jobs ────────────────────────

  async triggerCronJobRun(serviceId: string) {
    let response = await this.axios.post(`/services/${serviceId}/cron-jobs/run`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelCronJobRun(serviceId: string, runId: string) {
    let response = await this.axios.delete(`/services/${serviceId}/cron-jobs/runs/${runId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listJobs(params?: { serviceId?: string; status?: string } & PaginationParams) {
    let response = await this.axios.get('/jobs', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createJob(body: Record<string, any>) {
    let response = await this.axios.post('/jobs', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.axios.get(`/jobs/${jobId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelJob(jobId: string) {
    let response = await this.axios.post(`/jobs/${jobId}/cancel`, null, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Environment Groups ──────────────────────────────

  async listEnvGroups(params?: { ownerId?: string[] } & PaginationParams) {
    let response = await this.axios.get('/env-groups', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createEnvGroup(body: Record<string, any>) {
    let response = await this.axios.post('/env-groups', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getEnvGroup(envGroupId: string) {
    let response = await this.axios.get(`/env-groups/${envGroupId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateEnvGroup(envGroupId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/env-groups/${envGroupId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteEnvGroup(envGroupId: string) {
    let response = await this.axios.delete(`/env-groups/${envGroupId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async linkServiceToEnvGroup(envGroupId: string, serviceId: string) {
    let response = await this.axios.post(
      `/env-groups/${envGroupId}/services`,
      { serviceId },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async unlinkServiceFromEnvGroup(envGroupId: string, serviceId: string) {
    let response = await this.axios.delete(`/env-groups/${envGroupId}/services/${serviceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getEnvGroupVar(envGroupId: string, name: string) {
    let response = await this.axios.get(`/env-groups/${envGroupId}/env-vars/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  async setEnvGroupVar(envGroupId: string, name: string, value: string) {
    let response = await this.axios.put(
      `/env-groups/${envGroupId}/env-vars/${name}`,
      { value },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteEnvGroupVar(envGroupId: string, name: string) {
    let response = await this.axios.delete(`/env-groups/${envGroupId}/env-vars/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Projects & Environments ─────────────────────────

  async listProjects(params?: { ownerId?: string[] } & PaginationParams) {
    let response = await this.axios.get('/projects', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createProject(body: Record<string, any>) {
    let response = await this.axios.post('/projects', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateProject(projectId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/projects/${projectId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.axios.delete(`/projects/${projectId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listEnvironments(projectId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/projects/${projectId}/environments`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createEnvironment(projectId: string, body: Record<string, any>) {
    let response = await this.axios.post(`/projects/${projectId}/environments`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async getEnvironment(projectId: string, environmentId: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/environments/${environmentId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateEnvironment(
    projectId: string,
    environmentId: string,
    body: Record<string, any>
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/environments/${environmentId}`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteEnvironment(projectId: string, environmentId: string) {
    let response = await this.axios.delete(
      `/projects/${projectId}/environments/${environmentId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Logs ────────────────────────────────────────────

  async queryLogs(params: Record<string, any>) {
    let response = await this.axios.get('/logs', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Metrics ─────────────────────────────────────────

  async getMetrics(metricType: string, params: Record<string, any>) {
    let response = await this.axios.get(`/metrics/${metricType}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Webhooks ────────────────────────────────────────

  async listWebhooks(params?: { ownerId?: string[] } & PaginationParams) {
    let response = await this.axios.get('/webhooks', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createWebhook(body: Record<string, any>) {
    let response = await this.axios.post('/webhooks', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${webhookId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateWebhook(webhookId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/webhooks/${webhookId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listWebhookEvents(webhookId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/webhooks/${webhookId}/events`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Workspaces ──────────────────────────────────────

  async listWorkspaces(params?: PaginationParams) {
    let response = await this.axios.get('/workspaces', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listWorkspaceMembers(workspaceId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/workspaces/${workspaceId}/members`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Blueprints ──────────────────────────────────────

  async listBlueprints(params?: { ownerId?: string[] } & PaginationParams) {
    let response = await this.axios.get('/blueprints', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getBlueprint(blueprintId: string) {
    let response = await this.axios.get(`/blueprints/${blueprintId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listBlueprintSyncs(blueprintId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/blueprints/${blueprintId}/syncs`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Registry Credentials ───────────────────────────

  async listRegistryCredentials(params?: PaginationParams) {
    let response = await this.axios.get('/registry-credentials', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createRegistryCredential(body: Record<string, any>) {
    let response = await this.axios.post('/registry-credentials', body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteRegistryCredential(credentialId: string) {
    let response = await this.axios.delete(`/registry-credentials/${credentialId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Events ──────────────────────────────────────────

  async getEvent(eventId: string) {
    let response = await this.axios.get(`/events/${eventId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Maintenance ─────────────────────────────────────

  async listMaintenance(params?: { serviceId?: string } & PaginationParams) {
    let response = await this.axios.get('/maintenance', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getMaintenanceRun(maintenanceId: string) {
    let response = await this.axios.get(`/maintenance/${maintenanceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async triggerMaintenanceRun(maintenanceId: string) {
    let response = await this.axios.post(`/maintenance/${maintenanceId}/trigger`, null, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Service Instances ───────────────────────────────

  async listServiceInstances(serviceId: string) {
    let response = await this.axios.get(`/services/${serviceId}/instances`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Secret Files ────────────────────────────────────

  async listServiceSecretFiles(serviceId: string) {
    let response = await this.axios.get(`/services/${serviceId}/secret-files`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateServiceSecretFiles(
    serviceId: string,
    secretFiles: Array<{ name: string; content: string }>
  ) {
    let response = await this.axios.put(`/services/${serviceId}/secret-files`, secretFiles, {
      headers: this.headers
    });
    return response.data;
  }
}
