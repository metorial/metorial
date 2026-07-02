import { createAxios } from 'slates';

export class AppVeyorClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; accountName?: string }) {
    this.axios = createAxios({
      baseURL: 'https://ci.appveyor.com/api',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
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
    let response = await this.axios.get(`/projects/${accountName}/${projectSlug}`);
    return response.data;
  }

  async getProjectBranch(
    accountName: string,
    projectSlug: string,
    branch: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${accountName}/${projectSlug}/branch/${encodeURIComponent(branch)}`
    );
    return response.data;
  }

  async getProjectBuildByVersion(
    accountName: string,
    projectSlug: string,
    buildVersion: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${accountName}/${projectSlug}/build/${buildVersion}`
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
    let response = await this.axios.get(`/projects/${accountName}/${projectSlug}/history`, {
      params
    });
    return response.data;
  }

  async getProjectDeployments(
    accountName: string,
    projectSlug: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/projects/${accountName}/${projectSlug}/deployments`);
    return response.data;
  }

  async getProjectSettings(
    accountName: string,
    projectSlug: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/projects/${accountName}/${projectSlug}/settings`);
    return response.data;
  }

  async getProjectSettingsYaml(accountName: string, projectSlug: string): Promise<string> {
    let response = await this.axios.get(
      `/projects/${accountName}/${projectSlug}/settings/yaml`
    );
    return response.data;
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
    await this.axios.put(`/projects/${accountName}/${projectSlug}/settings/yaml`, yaml, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  async updateProjectEnvironmentVariables(
    accountName: string,
    projectSlug: string,
    variables: Record<string, unknown>[]
  ): Promise<void> {
    await this.axios.put(
      `/projects/${accountName}/${projectSlug}/settings/environment-variables`,
      variables
    );
  }

  async updateProjectBuildNumber(
    accountName: string,
    projectSlug: string,
    nextBuildNumber: number
  ): Promise<void> {
    await this.axios.put(`/projects/${accountName}/${projectSlug}/settings/build-number`, {
      nextBuildNumber
    });
  }

  async deleteProject(accountName: string, projectSlug: string): Promise<void> {
    await this.axios.delete(`/projects/${accountName}/${projectSlug}`);
  }

  async deleteProjectBuildCache(accountName: string, projectSlug: string): Promise<void> {
    await this.axios.delete(`/projects/${accountName}/${projectSlug}/buildcache`);
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
    await this.axios.delete(`/builds/${accountName}/${projectSlug}/${buildVersion}`);
  }

  async deleteBuild(buildId: number): Promise<void> {
    await this.axios.delete(`/builds/${buildId}`);
  }

  // --- Build Jobs ---

  async getBuildJobLog(jobId: string): Promise<string> {
    let response = await this.axios.get(`/buildjobs/${jobId}/log`, {
      responseType: 'text',
      headers: { Accept: 'text/plain' }
    });
    return response.data;
  }

  async listBuildJobArtifacts(jobId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/buildjobs/${jobId}/artifacts`);
    return response.data;
  }

  async downloadBuildJobArtifact(jobId: string, artifactFileName: string): Promise<string> {
    let response = await this.axios.get(`/buildjobs/${jobId}/artifacts/${artifactFileName}`, {
      responseType: 'text'
    });
    return response.data;
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
