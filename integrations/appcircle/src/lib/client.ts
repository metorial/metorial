import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;
  private apiBaseUrl: string;

  constructor(config: { token: string; apiBaseUrl: string }) {
    this.apiBaseUrl = config.apiBaseUrl;
    this.http = createAxios({
      baseURL: config.apiBaseUrl,
      headers: {
        Authorization: config.token,
        Accept: 'application/json'
      }
    });
  }

  // ─── Build Profiles ──────────────────────────────────────

  async listBuildProfiles(params?: { search?: string; page?: number; size?: number }) {
    let response = await this.http.get('/build/v2/profiles', { params });
    return response.data;
  }

  async getBuildProfile(profileId: string) {
    let response = await this.http.get(`/build/v2/profiles/${profileId}`);
    return response.data;
  }

  async updateBuildProfile(profileId: string, data: { name?: string; pinned?: boolean }) {
    let response = await this.http.patch(`/build/v2/profiles/${profileId}`, data);
    return response.data;
  }

  async deleteBuildProfile(profileId: string) {
    let response = await this.http.delete(`/build/v2/profiles/${profileId}`);
    return response.data;
  }

  // ─── Branches & Commits ──────────────────────────────────

  async listCommits(
    profileId: string,
    branchId: string,
    params?: { page?: number; size?: number }
  ) {
    let response = await this.http.get('/build/v2/commits', {
      params: { profileId, branchId, ...params }
    });
    return response.data;
  }

  async getLatestCommit(profileId: string, branchId: string) {
    let response = await this.http.get('/build/v2/commits/last-commit', {
      params: { profileId, branchId }
    });
    return response.data;
  }

  // ─── Builds ──────────────────────────────────────────────

  async startBuildByBranchAndWorkflow(
    profileId: string,
    branchId: string,
    workflowId: string,
    configurationId?: string,
    envVars?: Record<string, string>
  ) {
    let response = await this.http.put(
      `/build/v2/profiles/${profileId}/branch/${branchId}/workflow/${workflowId}`,
      envVars ?? {},
      {
        params: {
          action: 'build',
          ...(configurationId ? { configurationId } : {})
        }
      }
    );
    return response.data;
  }

  async startBuildByBranchNameAndWorkflow(
    profileId: string,
    workflowId: string,
    branchName: string,
    configurationId?: string,
    envVars?: Record<string, string>
  ) {
    let response = await this.http.put(
      `/build/v2/profiles/${profileId}/workflow/${workflowId}`,
      envVars ?? {},
      {
        params: {
          branchName,
          ...(configurationId ? { configurationId } : {})
        }
      }
    );
    return response.data;
  }

  async startBuildByCommitHash(
    commitHash: string,
    profileId: string,
    branchId: string,
    workflowId?: string,
    configurationId?: string
  ) {
    let body: Record<string, string> = { profileId, branchId };
    if (workflowId) body.workflowId = workflowId;
    if (configurationId) body.configurationId = configurationId;

    let response = await this.http.post(`/build/v2/commits/${commitHash}`, body, {
      params: { action: 'build' }
    });
    return response.data;
  }

  async getBuildStatus(commitId: string, buildId: string) {
    let response = await this.http.get(
      `/build/v2/commits/${commitId}/builds/${buildId}/status`
    );
    return response.data;
  }

  async cancelBuild(taskId: string) {
    let response = await this.http.get(`/build/v1/queue/${taskId}`, {
      params: { action: 'cancel' }
    });
    return response.data;
  }

  async downloadBuildArtifacts(commitId: string, buildId: string) {
    let response = await this.http.get(`/build/v2/commits/${commitId}/builds/${buildId}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async getBuildLogs(commitId: string, buildId: string) {
    let response = await this.http.get(`/build/v2/commits/${commitId}/builds/${buildId}/logs`);
    return response.data;
  }

  // ─── Workflows ───────────────────────────────────────────

  async listWorkflows(profileId: string) {
    let response = await this.http.get(`/build/v2/profiles/${profileId}/workflows`);
    return response.data;
  }

  // ─── Configurations ──────────────────────────────────────

  async listConfigurations(profileId: string, branchId?: string) {
    let response = await this.http.get(`/build/v2/profiles/${profileId}/configurations`, {
      params: branchId ? { branchId } : undefined
    });
    return response.data;
  }

  async getConfiguration(profileId: string, configurationId: string) {
    let response = await this.http.get(
      `/build/v2/profiles/${profileId}/configurations/${configurationId}`
    );
    return response.data;
  }

  // ─── Environment Variables ───────────────────────────────

  async listVariableGroups(params?: { page?: number; size?: number }) {
    let response = await this.http.get('/build/v2/variable-groups', { params });
    return response.data;
  }

  async createVariableGroup(data: {
    name: string;
    variables?: Array<{ key: string; value: string; isSecret?: boolean }>;
  }) {
    let response = await this.http.post('/build/v2/variable-groups', data);
    return response.data;
  }

  async deleteVariableGroup(variableGroupId: string) {
    let response = await this.http.delete(`/build/v2/variable-groups/${variableGroupId}`);
    return response.data;
  }

  async renameVariableGroup(variableGroupId: string, name: string) {
    let response = await this.http.patch(
      `/build/v2/variable-groups/${variableGroupId}`,
      null,
      {
        params: { name }
      }
    );
    return response.data;
  }

  async listVariables(variableGroupId: string) {
    let response = await this.http.get(
      `/build/v2/variable-groups/${variableGroupId}/variables`
    );
    return response.data;
  }

  async addVariable(
    variableGroupId: string,
    data: { key: string; value: string; isSecret?: boolean }
  ) {
    let response = await this.http.post(
      `/build/v2/variable-groups/${variableGroupId}/variables`,
      data
    );
    return response.data;
  }

  async updateVariable(variableGroupId: string, data: { key: string; value: string }) {
    let response = await this.http.patch(
      `/build/v2/variable-groups/${variableGroupId}/variables`,
      data
    );
    return response.data;
  }

  async deleteVariables(variableGroupId: string, keys: string[]) {
    let response = await this.http.delete(
      `/build/v2/variable-groups/${variableGroupId}/variables`,
      {
        data: keys
      }
    );
    return response.data;
  }

  // ─── Distribution Profiles ──────────────────────────────

  async listDistributionProfiles(params?: { search?: string; page?: number; size?: number }) {
    let response = await this.http.get('/distribution/v2/profiles', { params });
    return response.data;
  }

  async createDistributionProfile(data: Record<string, unknown>) {
    let response = await this.http.post('/distribution/v2/profiles', data);
    return response.data;
  }

  async getDistributionProfile(profileId: string, params?: { page?: number; size?: number }) {
    let response = await this.http.get(`/distribution/v2/profiles/${profileId}`, { params });
    return response.data;
  }

  async updateDistributionProfile(profileId: string, data: Record<string, unknown>) {
    let response = await this.http.patch(`/distribution/v2/profiles/${profileId}`, data);
    return response.data;
  }

  async deleteDistributionProfile(profileId: string) {
    let response = await this.http.delete(`/distribution/v2/profiles/${profileId}`);
    return response.data;
  }

  // ─── Distribution App Versions ──────────────────────────

  async listDistributionAppVersions(
    profileId: string,
    params?: { page?: number; size?: number; platform?: string }
  ) {
    let response = await this.http.get(`/distribution/v2/profiles/${profileId}/app-versions`, {
      params
    });
    return response.data;
  }

  async getDistributionAppVersion(profileId: string, appVersionId: string) {
    let response = await this.http.get(
      `/distribution/v2/profiles/${profileId}/app-versions/${appVersionId}`
    );
    return response.data;
  }

  async deleteDistributionAppVersion(profileId: string, appVersionId: string) {
    let response = await this.http.delete(
      `/distribution/v2/profiles/${profileId}/app-versions/${appVersionId}`
    );
    return response.data;
  }

  async sendToTesting(
    profileId: string,
    appVersionId: string,
    testingData: Record<string, unknown>
  ) {
    let response = await this.http.post(
      `/distribution/v2/profiles/${profileId}/app-versions/${appVersionId}`,
      testingData,
      { params: { action: 'sendToTesting' } }
    );
    return response.data;
  }

  async getDistributionDownloadLink(profileId: string, appVersionId: string) {
    let response = await this.http.get(
      `/distribution/v2/profiles/${profileId}/app-versions/${appVersionId}/download`
    );
    return response.data;
  }

  // ─── Testing Groups ─────────────────────────────────────

  async listTestingGroups(params?: { page?: number; size?: number }) {
    let response = await this.http.get('/distribution/v2/testing-groups', { params });
    return response.data;
  }

  async createTestingGroup(data: Record<string, unknown>) {
    let response = await this.http.post('/distribution/v2/testing-groups', data);
    return response.data;
  }

  async getTestingGroup(groupId: string) {
    let response = await this.http.get(`/distribution/v2/testing-groups/${groupId}`);
    return response.data;
  }

  async deleteTestingGroup(groupId: string) {
    let response = await this.http.delete(`/distribution/v2/testing-groups/${groupId}`);
    return response.data;
  }

  async addTestersToGroup(groupId: string, emails: string[]) {
    let response = await this.http.post(
      `/distribution/v2/testing-groups/${groupId}/testers`,
      emails
    );
    return response.data;
  }

  async removeTestersFromGroup(groupId: string, emails: string[]) {
    let response = await this.http.delete(
      `/distribution/v2/testing-groups/${groupId}/testers`,
      {
        data: emails
      }
    );
    return response.data;
  }

  // ─── Signing Identities ─────────────────────────────────

  async listCertificates() {
    let response = await this.http.get('/signing-identity/v2/certificates');
    return response.data;
  }

  async getCertificate(certificateId: string) {
    let response = await this.http.get(`/signing-identity/v2/certificates/${certificateId}`);
    return response.data;
  }

  async deleteCertificate(certificateId: string) {
    let response = await this.http.delete(
      `/signing-identity/v2/certificates/${certificateId}`
    );
    return response.data;
  }

  async listKeystores() {
    let response = await this.http.get('/signing-identity/v2/keystores');
    return response.data;
  }

  async getKeystore(keystoreId: string) {
    let response = await this.http.get(`/signing-identity/v2/keystores/${keystoreId}`);
    return response.data;
  }

  async deleteKeystore(keystoreId: string) {
    let response = await this.http.delete(`/signing-identity/v2/keystores/${keystoreId}`);
    return response.data;
  }

  async listProvisioningProfiles() {
    let response = await this.http.get('/signing-identity/v2/provisioning-profiles');
    return response.data;
  }

  async getProvisioningProfile(profileId: string) {
    let response = await this.http.get(
      `/signing-identity/v2/provisioning-profiles/${profileId}`
    );
    return response.data;
  }

  // ─── Publish Profiles ───────────────────────────────────

  async listPublishProfiles(platformType: string, params?: { page?: number; size?: number }) {
    let response = await this.http.get(`/publish/v2/profiles/${platformType}`, { params });
    return response.data;
  }

  async getPublishProfile(
    platformType: string,
    profileId: string,
    params?: { page?: number; size?: number }
  ) {
    let response = await this.http.get(`/publish/v2/profiles/${platformType}/${profileId}`, {
      params
    });
    return response.data;
  }

  async deletePublishProfile(platformType: string, profileId: string) {
    let response = await this.http.delete(`/publish/v2/profiles/${platformType}/${profileId}`);
    return response.data;
  }

  async listPublishAppVersions(
    platformType: string,
    profileId: string,
    params?: { page?: number; size?: number }
  ) {
    let response = await this.http.get(
      `/publish/v2/profiles/${platformType}/${profileId}/app-versions`,
      { params }
    );
    return response.data;
  }

  async getPublishDetails(platformType: string, profileId: string, appVersionId: string) {
    let response = await this.http.get(
      `/publish/v2/profiles/${platformType}/${profileId}/app-versions/${appVersionId}/publish`
    );
    return response.data;
  }

  async startPublish(
    platformType: string,
    profileId: string,
    publishId: string,
    stepId?: string
  ) {
    let response = await this.http.post(
      `/publish/v2/profiles/${platformType}/${profileId}/publish/${publishId}`,
      undefined,
      { params: { action: 'start', ...(stepId ? { stepId } : {}) } }
    );
    return response.data;
  }

  async cancelPublish(platformType: string, profileId: string, publishId: string) {
    let response = await this.http.post(
      `/publish/v2/profiles/${platformType}/${profileId}/publish/${publishId}`,
      undefined,
      { params: { action: 'cancel' } }
    );
    return response.data;
  }

  async restartPublish(platformType: string, profileId: string, publishId: string) {
    let response = await this.http.post(
      `/publish/v2/profiles/${platformType}/${profileId}/publish/${publishId}`,
      undefined,
      { params: { action: 'restart' } }
    );
    return response.data;
  }

  async listPublishFlows(platformType: string, profileId: string) {
    let response = await this.http.get(
      `/publish/v2/profiles/${platformType}/${profileId}/publishflows`
    );
    return response.data;
  }

  async getPublishFlow(platformType: string, profileId: string, publishFlowId: string) {
    let response = await this.http.get(
      `/publish/v2/profiles/${platformType}/${profileId}/publishflows/${publishFlowId}`
    );
    return response.data;
  }

  // ─── Enterprise App Store ───────────────────────────────

  async listEnterpriseStoreProfiles(params?: { page?: number; size?: number }) {
    let response = await this.http.get('/store/v2/profiles', { params });
    return response.data;
  }

  async getEnterpriseStoreProfile(
    profileId: string,
    params?: { page?: number; size?: number }
  ) {
    let response = await this.http.get(`/store/v2/profiles/${profileId}`, { params });
    return response.data;
  }

  async listEnterpriseStoreAppVersions(
    profileId: string,
    params?: { page?: number; size?: number }
  ) {
    let response = await this.http.get(`/store/v2/profiles/${profileId}/app-versions`, {
      params
    });
    return response.data;
  }

  async getEnterpriseStoreAppVersion(profileId: string, appVersionId: string) {
    let response = await this.http.get(
      `/store/v2/profiles/${profileId}/app-versions/${appVersionId}`
    );
    return response.data;
  }

  async publishEnterpriseStoreAppVersion(
    profileId: string,
    appVersionId: string,
    data: { publishType?: string; summary?: string; releaseNotes?: string }
  ) {
    let response = await this.http.patch(
      `/store/v2/profiles/${profileId}/app-versions/${appVersionId}/publish`,
      data
    );
    return response.data;
  }

  async unpublishEnterpriseStoreAppVersion(profileId: string, appVersionId: string) {
    let response = await this.http.patch(
      `/store/v2/profiles/${profileId}/app-versions/${appVersionId}/unpublish`
    );
    return response.data;
  }

  async deleteEnterpriseStoreAppVersion(profileId: string, appVersionId: string) {
    let response = await this.http.delete(
      `/store/v2/profiles/${profileId}/app-versions/${appVersionId}`
    );
    return response.data;
  }

  async getEnterpriseStoreDownloadLink(profileId: string, appVersionId: string) {
    let response = await this.http.get(
      `/store/v2/profiles/${profileId}/app-versions/${appVersionId}/download-link`
    );
    return response.data;
  }

  // ─── Organizations ──────────────────────────────────────

  async listOrganizations(params?: { page?: number; perPage?: number; search?: string }) {
    let response = await this.http.get('/identity/v1/organizations', { params });
    return response.data;
  }

  // ─── Webhooks ───────────────────────────────────────────

  async listWebhookModules() {
    let response = await this.http.get('/webhook/v2/webhooks/modules');
    return response.data;
  }

  async listWebhooks(params?: { page?: number; size?: number }) {
    let response = await this.http.get('/webhook/v2/webhooks', { params });
    return response.data;
  }

  async createWebhook(data: {
    name?: string;
    postUrl: string;
    actions: string[];
    enabled?: boolean;
    module?: string;
    secretKey?: string;
    profileId?: string;
  }) {
    let response = await this.http.post('/webhook/v2/webhooks', data);
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/webhook/v2/webhooks/${webhookId}`);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      name?: string;
      postUrl?: string;
      actions?: string[];
      enabled?: boolean;
      module?: string;
      secretKey?: string;
      profileId?: string;
    }
  ) {
    let response = await this.http.patch(`/webhook/v2/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.http.delete(`/webhook/v2/webhooks/${webhookId}`);
    return response.data;
  }

  async getWebhookHistory(webhookId?: string, params?: { page?: number; size?: number }) {
    let url = webhookId
      ? `/webhook/v2/webhooks/history/${webhookId}`
      : '/webhook/v2/webhooks/history';
    let response = await this.http.get(url, { params });
    return response.data;
  }

  // ─── Connections ────────────────────────────────────────

  async listConnections() {
    let response = await this.http.get('/build/v1/connection');
    return response.data;
  }
}
