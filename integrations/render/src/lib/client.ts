import { createAxios } from 'slates';
import { renderApiError } from './errors';

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

    this.axios.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(renderApiError(error))
    );
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── User ───────────────────────────────────────────

  async getUser() {
    let response = await this.axios.get('/users', {
      headers: this.headers
    });
    return response.data;
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
      `/services/${serviceId}/rollback`,
      { deployId },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Custom Domains ──────────────────────────────────

  async listCustomDomains(serviceId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/services/${serviceId}/custom-domains`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async addCustomDomain(serviceId: string, name: string) {
    let response = await this.axios.post(
      `/services/${serviceId}/custom-domains`,
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getCustomDomain(serviceId: string, domainIdOrName: string) {
    let response = await this.axios.get(
      `/services/${serviceId}/custom-domains/${domainIdOrName}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteCustomDomain(serviceId: string, domainIdOrName: string) {
    let response = await this.axios.delete(
      `/services/${serviceId}/custom-domains/${domainIdOrName}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async verifyCustomDomain(serviceId: string, domainIdOrName: string) {
    let response = await this.axios.post(
      `/services/${serviceId}/custom-domains/${domainIdOrName}/verify`,
      null,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async listServiceEvents(serviceId: string, params?: PaginationParams & Record<string, any>) {
    let response = await this.axios.get(`/services/${serviceId}/events`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async listServiceInstances(serviceId: string) {
    let response = await this.axios.get(`/services/${serviceId}/instances`, {
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
    let response = await this.axios.get(`/postgres/${postgresId}/export`, {
      headers: this.headers
    });
    return response.data;
  }

  async createPostgresExport(postgresId: string) {
    let response = await this.axios.post(`/postgres/${postgresId}/export`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async getPostgresRecoveryInfo(postgresId: string) {
    let response = await this.axios.get(`/postgres/${postgresId}/recovery`, {
      headers: this.headers
    });
    return response.data;
  }

  async recoverPostgres(postgresId: string, body: Record<string, any>) {
    let response = await this.axios.post(`/postgres/${postgresId}/recovery`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async listPostgresUsers(postgresId: string) {
    let response = await this.axios.get(`/postgres/${postgresId}/credentials`, {
      headers: this.headers
    });
    return response.data;
  }

  async createPostgresUser(postgresId: string, username: string) {
    let response = await this.axios.post(
      `/postgres/${postgresId}/credentials`,
      { username },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deletePostgresUser(postgresId: string, username: string) {
    let response = await this.axios.delete(`/postgres/${postgresId}/credentials/${username}`, {
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

  async restoreDiskSnapshot(diskId: string, snapshotKey: string) {
    let response = await this.axios.post(
      `/disks/${diskId}/snapshots/restore`,
      { snapshotKey },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Cron Jobs & One-Off Jobs ────────────────────────

  async triggerCronJobRun(cronJobId: string) {
    let response = await this.axios.post(`/cron-jobs/${cronJobId}/runs`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelCronJobRun(cronJobId: string) {
    let response = await this.axios.delete(`/cron-jobs/${cronJobId}/runs`, {
      headers: this.headers
    });
    return response.data;
  }

  async listJobs(
    serviceId: string,
    params?: { status?: string[] } & PaginationParams & Record<string, any>
  ) {
    let response = await this.axios.get(`/services/${serviceId}/jobs`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createJob(serviceId: string, body: Record<string, any>) {
    let response = await this.axios.post(`/services/${serviceId}/jobs`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async getJob(serviceId: string, jobId: string) {
    let response = await this.axios.get(`/services/${serviceId}/jobs/${jobId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelJob(serviceId: string, jobId: string) {
    let response = await this.axios.post(`/services/${serviceId}/jobs/${jobId}/cancel`, null, {
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

  async getEnvGroupSecretFile(envGroupId: string, name: string) {
    let response = await this.axios.get(`/env-groups/${envGroupId}/secret-files/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  async setEnvGroupSecretFile(envGroupId: string, name: string, content: string) {
    let response = await this.axios.put(
      `/env-groups/${envGroupId}/secret-files/${name}`,
      { content },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteEnvGroupSecretFile(envGroupId: string, name: string) {
    let response = await this.axios.delete(`/env-groups/${envGroupId}/secret-files/${name}`, {
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
    let response = await this.axios.get('/environments', {
      headers: this.headers,
      params: { ...params, projectId: [projectId] }
    });
    return response.data;
  }

  async createEnvironment(projectId: string, body: Record<string, any>) {
    let response = await this.axios.post(
      '/environments',
      { ...body, projectId },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getEnvironment(environmentId: string) {
    let response = await this.axios.get(`/environments/${environmentId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateEnvironment(environmentId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/environments/${environmentId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteEnvironment(environmentId: string) {
    let response = await this.axios.delete(`/environments/${environmentId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async addResourcesToEnvironment(environmentId: string, resourceIds: string[]) {
    let response = await this.axios.post(
      `/environments/${environmentId}/resources`,
      { resourceIds },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async removeResourcesFromEnvironment(environmentId: string, resourceIds: string[]) {
    let response = await this.axios.delete(`/environments/${environmentId}/resources`, {
      headers: this.headers,
      params: { resourceIds }
    });
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
    let response = await this.axios.get('/owners', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/owners/${workspaceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listWorkspaceMembers(workspaceId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/owners/${workspaceId}/members`, {
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
    let response = await this.axios.get('/registrycredentials', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createRegistryCredential(body: Record<string, any>) {
    let response = await this.axios.post('/registrycredentials', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getRegistryCredential(credentialId: string) {
    let response = await this.axios.get(`/registrycredentials/${credentialId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateRegistryCredential(credentialId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/registrycredentials/${credentialId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteRegistryCredential(credentialId: string) {
    let response = await this.axios.delete(`/registrycredentials/${credentialId}`, {
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

  async listMaintenance(params?: {
    resourceId?: string[];
    ownerId?: string[];
    state?: string[];
  }) {
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

  async updateMaintenanceRun(maintenanceId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/maintenance/${maintenanceId}`, body, {
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

  // ─── Secret Files ────────────────────────────────────

  async listServiceSecretFiles(serviceId: string, params?: PaginationParams) {
    let response = await this.axios.get(`/services/${serviceId}/secret-files`, {
      headers: this.headers,
      params
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

  async getServiceSecretFile(serviceId: string, name: string) {
    let response = await this.axios.get(`/services/${serviceId}/secret-files/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  async setServiceSecretFile(serviceId: string, name: string, content: string) {
    let response = await this.axios.put(
      `/services/${serviceId}/secret-files/${name}`,
      { content },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteServiceSecretFile(serviceId: string, name: string) {
    let response = await this.axios.delete(`/services/${serviceId}/secret-files/${name}`, {
      headers: this.headers
    });
    return response.data;
  }
}
