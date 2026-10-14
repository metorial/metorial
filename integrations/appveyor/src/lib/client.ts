import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export class AppVeyorClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private baseUrl: string;

  constructor(config: { token: string; accountName?: string }) {
    this.baseUrl = config.accountName
      ? `https://ci.appveyor.com/api/account/${encodeURIComponent(config.accountName)}`
      : 'https://ci.appveyor.com/api';
    this.axios = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'AppVeyor',
          reason: 'appveyor_api_error'
        })
    });
  }

  async downloadFile(url: string): Promise<{ bytes: Buffer; text: string }> {
    let response = await this.axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      headers: { 'Content-Type': undefined }
    });
    let bytes = Buffer.from(response.data);
    // Preserve the former Axios UTF-8 text response, including its BOM removal.
    let text = bytes.toString('utf8').replace(/^\uFEFF/, '');
    return { bytes, text };
  }

  // --- Projects ---

  async listProjects(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/projects');
    return response.data;
  }

  async getProject(
    accountName: string,
    projectSlug: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}`
    );
    return response.data;
  }

  async getProjectBranch(
    accountName: string,
    projectSlug: string,
    branch: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/branch/${encodeURIComponent(branch)}`
    );
    return response.data;
  }

  async getProjectBuildByVersion(
    accountName: string,
    projectSlug: string,
    buildVersion: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/build/${encodeURIComponent(buildVersion)}`
    );
    return response.data;
  }

  async getProjectHistory(
    accountName: string,
    projectSlug: string,
    params?: {
      recordsNumber?: number;
      startBuildId?: number;
      branch?: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/history`,
      {
        params: { ...params, recordsNumber: params?.recordsNumber ?? 20 }
      }
    );
    return response.data;
  }

  async getProjectDeployments(
    accountName: string,
    projectSlug: string,
    params?: { recordsNumber?: number; startDeploymentId?: number }
  ): Promise<{ project?: Record<string, unknown>; deployments?: Record<string, unknown>[] }> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/deployments`,
      { params }
    );
    return response.data;
  }

  async getProjectSettings(
    accountName: string,
    projectSlug: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/settings`
    );
    return response.data;
  }

  async getProjectEnvironmentVariables(
    accountName: string,
    projectSlug: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/settings/environment-variables`
    );
    return response.data;
  }

  getProjectSettingsYamlUrl(accountName: string, projectSlug: string): string {
    return `${this.baseUrl}/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/settings/yaml`;
  }

  async addProject(body: {
    repositoryProvider: string;
    repositoryName: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/projects', body);
    return response.data;
  }

  async updateProject(body: Record<string, unknown>): Promise<void> {
    await this.axios.put('/projects', body);
  }

  async updateProjectSettingsYaml(
    accountName: string,
    projectSlug: string,
    yaml: string
  ): Promise<void> {
    await this.axios.put(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/settings/yaml`,
      yaml,
      {
        headers: { 'Content-Type': 'text/plain' }
      }
    );
  }

  async updateProjectEnvironmentVariables(
    accountName: string,
    projectSlug: string,
    variables: { name: string; value: string; isEncrypted?: boolean }[]
  ): Promise<void> {
    await this.axios.put(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/settings/environment-variables`,
      variables.map(variable => ({
        name: variable.name,
        value: { value: variable.value, isEncrypted: variable.isEncrypted ?? false }
      }))
    );
  }

  async updateProjectBuildNumber(
    accountName: string,
    projectSlug: string,
    nextBuildNumber: number
  ): Promise<void> {
    await this.axios.put(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/settings/build-number`,
      {
        nextBuildNumber
      }
    );
  }

  async deleteProject(accountName: string, projectSlug: string): Promise<void> {
    await this.axios.delete(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}`
    );
  }

  async deleteProjectBuildCache(accountName: string, projectSlug: string): Promise<void> {
    await this.axios.delete(
      `/projects/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/buildcache`
    );
  }

  // --- Builds ---

  async startBuild(body: {
    accountName: string;
    projectSlug: string;
    branch?: string;
    commitId?: string;
    pullRequestId?: number;
    environmentVariables?: Record<string, string>;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/builds', body);
    return response.data;
  }

  async reRunBuild(body: {
    buildId: number;
    reRunIncomplete?: boolean;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/builds', body);
    return response.data;
  }

  async cancelBuild(
    accountName: string,
    projectSlug: string,
    buildVersion: string
  ): Promise<void> {
    await this.axios.delete(
      `/builds/${encodeURIComponent(accountName)}/${encodeURIComponent(projectSlug)}/${encodeURIComponent(buildVersion)}`
    );
  }

  async deleteBuild(buildId: number): Promise<void> {
    await this.axios.delete(`/builds/${buildId}`);
  }

  // --- Build Jobs ---

  getBuildJobLogUrl(jobId: string): string {
    return `${this.baseUrl}/buildjobs/${encodeURIComponent(jobId)}/log`;
  }

  async listBuildJobArtifacts(jobId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/buildjobs/${encodeURIComponent(jobId)}/artifacts`);
    return response.data;
  }

  getBuildJobArtifactUrl(jobId: string, artifactFileName: string): string {
    return `${this.baseUrl}/buildjobs/${encodeURIComponent(jobId)}/artifacts/${encodeURIComponent(artifactFileName)}`;
  }

  // --- Environments ---

  async listEnvironments(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/environments');
    return response.data;
  }

  async getEnvironmentSettings(environmentId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/environments/${environmentId}/settings`);
    return response.data;
  }

  async getEnvironmentDeployments(environmentId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/environments/${environmentId}/deployments`);
    return response.data;
  }

  async addEnvironment(body: {
    name: string;
    provider: string;
    settings?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/environments', body);
    return response.data;
  }

  async updateEnvironment(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/environments', body);
    return response.data;
  }

  async deleteEnvironment(environmentId: number): Promise<void> {
    await this.axios.delete(`/environments/${environmentId}`);
  }

  // --- Deployments ---

  async getDeployment(deploymentId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/deployments/${deploymentId}`);
    return response.data;
  }

  async startDeployment(body: {
    environmentName: string;
    accountName: string;
    projectSlug: string;
    buildVersion: string;
    buildJobId?: string;
    environmentVariables?: Record<string, string>;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/deployments', body);
    return response.data;
  }

  async cancelDeployment(deploymentId: number): Promise<void> {
    await this.axios.put('/deployments/stop', { deploymentId });
  }

  // --- Users ---

  async listUsers(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/users');
    return response.data;
  }

  async getUser(userId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  async createUser(body: {
    fullName: string;
    email: string;
    roleId: number;
    generatePassword?: boolean;
    password?: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.axios.post('/users', body);
  }

  async updateUser(body: Record<string, unknown>): Promise<void> {
    await this.axios.put('/users', body);
  }

  async deleteUser(userId: number): Promise<void> {
    await this.axios.delete(`/users/${userId}`);
  }

  // --- Collaborators ---

  async listCollaborators(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/collaborators');
    return response.data;
  }

  async getCollaborator(userId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/collaborators/${userId}`);
    return response.data;
  }

  async addCollaborator(body: { email: string; roleId: number }): Promise<void> {
    await this.axios.post('/collaborators', body);
  }

  async updateCollaborator(body: { userId: number; roleId: number }): Promise<void> {
    await this.axios.put('/collaborators', body);
  }

  async deleteCollaborator(userId: number): Promise<void> {
    await this.axios.delete(`/collaborators/${userId}`);
  }

  // --- Roles ---

  async listRoles(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/roles');
    return response.data;
  }

  async getRole(roleId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/roles/${roleId}`);
    return response.data;
  }

  async createRole(body: { name: string }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/roles', body);
    return response.data;
  }

  async updateRole(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/roles', body);
    return response.data;
  }

  async deleteRole(roleId: number): Promise<void> {
    await this.axios.delete(`/roles/${roleId}`);
  }

  // --- Encryption ---

  async encryptValue(plainValue: string): Promise<string> {
    let response = await this.axios.post('/account/encrypt', { plainValue });
    return response.data;
  }
}
