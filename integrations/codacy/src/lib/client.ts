import { createAxios } from 'slates';

export interface CodacyClientConfig {
  token: string;
  baseUrl: string;
  provider: string;
  organization: string;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    cursor?: string;
    limit?: number;
    total?: number;
  };
}

export class CodacyClient {
  private axios: ReturnType<typeof createAxios>;
  private provider: string;
  private organization: string;

  constructor(config: CodacyClientConfig) {
    this.provider = config.provider;
    this.organization = config.organization;
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'api-token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private orgPath(): string {
    return `/organizations/${this.provider}/${this.organization}`;
  }

  private analysisOrgPath(): string {
    return `/analysis/organizations/${this.provider}/${this.organization}`;
  }

  // ─── Organizations ──────────────────────────────────────────────

  async listUserOrganizations(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/user/organizations', { params });
    return response.data;
  }

  async getOrganization(): Promise<any> {
    let response = await this.axios.get(this.orgPath());
    return response.data;
  }

  // ─── Repositories ──────────────────────────────────────────────

  async listOrganizationRepositories(
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`${this.orgPath()}/repositories`, { params });
    return response.data;
  }

  async listRepositoriesWithAnalysis(
    params?: PaginationParams & { search?: string; sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`${this.analysisOrgPath()}/repositories`, { params });
    return response.data;
  }

  async searchRepositoriesWithAnalysis(
    body: any,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.post(
      `/search/analysis/organizations/${this.provider}/${this.organization}/repositories`,
      body,
      { params }
    );
    return response.data;
  }

  async getRepositoryWithAnalysis(repositoryName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}`
    );
    return response.data;
  }

  async addRepository(provider: string, repositoryFullPath: string): Promise<any> {
    let response = await this.axios.post('/repositories', { provider, repositoryFullPath });
    return response.data;
  }

  async getAnalysisProgress(repositoryName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/analysis-progress`
    );
    return response.data;
  }

  // ─── Issues ─────────────────────────────────────────────────────

  async searchRepositoryIssues(
    repositoryName: string,
    body: any,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.post(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/issues/search`,
      body,
      { params }
    );
    return response.data;
  }

  async getIssue(repositoryName: string, issueId: string): Promise<any> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/issues/${issueId}`
    );
    return response.data;
  }

  async issuesOverview(repositoryName: string, body: any): Promise<any> {
    let response = await this.axios.post(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/issues/overview`,
      body
    );
    return response.data;
  }

  // ─── Pull Requests ──────────────────────────────────────────────

  async listRepositoryPullRequests(
    repositoryName: string,
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/pull-requests`,
      { params }
    );
    return response.data;
  }

  async getPullRequestWithAnalysis(
    repositoryName: string,
    pullRequestNumber: number
  ): Promise<any> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/pull-requests/${pullRequestNumber}`
    );
    return response.data;
  }

  async listPullRequestIssues(
    repositoryName: string,
    pullRequestNumber: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/pull-requests/${pullRequestNumber}/issues`,
      { params }
    );
    return response.data;
  }

  async listPullRequestFiles(
    repositoryName: string,
    pullRequestNumber: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/pull-requests/${pullRequestNumber}/files`,
      { params }
    );
    return response.data;
  }

  // ─── Commits ────────────────────────────────────────────────────

  async listRepositoryCommits(
    repositoryName: string,
    params?: PaginationParams & { branchName?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/commits`,
      { params }
    );
    return response.data;
  }

  async getCommitWithAnalysis(repositoryName: string, commitUuid: string): Promise<any> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/commits/${commitUuid}`
    );
    return response.data;
  }

  // ─── Coverage ───────────────────────────────────────────────────

  async getRepositoryPullRequestCoverage(
    repositoryName: string,
    pullRequestNumber: number
  ): Promise<any> {
    let response = await this.axios.get(
      `/coverage/organizations/${this.provider}/${this.organization}/repositories/${repositoryName}/pull-requests/${pullRequestNumber}`
    );
    return response.data;
  }

  async getRepositoryPullRequestFilesCoverage(
    repositoryName: string,
    pullRequestNumber: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `/coverage/organizations/${this.provider}/${this.organization}/repositories/${repositoryName}/pull-requests/${pullRequestNumber}/files`,
      { params }
    );
    return response.data;
  }

  // ─── Files ──────────────────────────────────────────────────────

  async listFiles(
    repositoryName: string,
    params?: PaginationParams & { branchName?: string; search?: string; sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/files`,
      { params }
    );
    return response.data;
  }

  // ─── Tools & Patterns ──────────────────────────────────────────

  async listAllTools(): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/tools');
    return response.data;
  }

  async listRepositoryTools(repositoryName: string): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/tools`
    );
    return response.data;
  }

  async configureAnalysisTool(
    repositoryName: string,
    toolUuid: string,
    body: any
  ): Promise<any> {
    let response = await this.axios.patch(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/tools/${toolUuid}`,
      body
    );
    return response.data;
  }

  async listRepositoryToolPatterns(
    repositoryName: string,
    toolUuid: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/tools/${toolUuid}/patterns`,
      { params }
    );
    return response.data;
  }

  // ─── Coding Standards ──────────────────────────────────────────

  async listCodingStandards(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`${this.orgPath()}/coding-standards`, { params });
    return response.data;
  }

  async getCodingStandard(codingStandardId: string): Promise<any> {
    let response = await this.axios.get(
      `${this.orgPath()}/coding-standards/${codingStandardId}`
    );
    return response.data;
  }

  async createCodingStandard(body: { name: string; languages?: string[] }): Promise<any> {
    let response = await this.axios.post(`${this.orgPath()}/coding-standards`, body);
    return response.data;
  }

  async deleteCodingStandard(codingStandardId: string): Promise<void> {
    await this.axios.delete(`${this.orgPath()}/coding-standards/${codingStandardId}`);
  }

  async promoteCodingStandard(codingStandardId: string): Promise<any> {
    let response = await this.axios.post(
      `${this.orgPath()}/coding-standards/${codingStandardId}/promote`
    );
    return response.data;
  }

  async setDefaultCodingStandard(codingStandardId: string): Promise<any> {
    let response = await this.axios.post(
      `${this.orgPath()}/coding-standards/${codingStandardId}/setDefault`
    );
    return response.data;
  }

  // ─── Gate Policies ─────────────────────────────────────────────

  async listGatePolicies(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`${this.orgPath()}/gate-policies`, { params });
    return response.data;
  }

  async getGatePolicy(gatePolicyId: string): Promise<any> {
    let response = await this.axios.get(`${this.orgPath()}/gate-policies/${gatePolicyId}`);
    return response.data;
  }

  async createGatePolicy(body: any): Promise<any> {
    let response = await this.axios.post(`${this.orgPath()}/gate-policies`, body);
    return response.data;
  }

  async updateGatePolicy(gatePolicyId: string, body: any): Promise<any> {
    let response = await this.axios.patch(
      `${this.orgPath()}/gate-policies/${gatePolicyId}`,
      body
    );
    return response.data;
  }

  async deleteGatePolicy(gatePolicyId: string): Promise<void> {
    await this.axios.delete(`${this.orgPath()}/gate-policies/${gatePolicyId}`);
  }

  // ─── Security / SRM ────────────────────────────────────────────

  async searchSecurityItems(
    body: any,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.post(`${this.orgPath()}/security/items/search`, body, {
      params
    });
    return response.data;
  }

  async getSecurityItem(srmItemId: string): Promise<any> {
    let response = await this.axios.get(`${this.orgPath()}/security/items/${srmItemId}`);
    return response.data;
  }

  async ignoreSecurityItem(srmItemId: string, body?: { reason?: string }): Promise<any> {
    let response = await this.axios.post(
      `${this.orgPath()}/security/items/${srmItemId}/ignore`,
      body ?? {}
    );
    return response.data;
  }

  async unignoreSecurityItem(srmItemId: string): Promise<any> {
    let response = await this.axios.post(
      `${this.orgPath()}/security/items/${srmItemId}/unignore`
    );
    return response.data;
  }

  // ─── DAST ──────────────────────────────────────────────────────

  async listDastTargets(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`${this.orgPath()}/dast/targets`, { params });
    return response.data;
  }

  async createDastTarget(body: {
    url: string;
    targetType: string;
    apiDefinitionUrl?: string;
    apiAuthHeaders?: Record<string, string>;
  }): Promise<any> {
    let response = await this.axios.post(`${this.orgPath()}/dast/targets`, body);
    return response.data;
  }

  async deleteDastTarget(dastTargetId: number): Promise<void> {
    await this.axios.delete(`${this.orgPath()}/dast/targets/${dastTargetId}`);
  }

  async analyzeDastTarget(dastTargetId: number): Promise<any> {
    let response = await this.axios.post(
      `${this.orgPath()}/dast/targets/${dastTargetId}/analyze`
    );
    return response.data;
  }

  // ─── SBOM ──────────────────────────────────────────────────────

  async searchSbomDependencies(
    body: any,
    params?: PaginationParams & { sortColumn?: string; columnOrder?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.post(`${this.orgPath()}/sbom/dependencies/search`, body, {
      params
    });
    return response.data;
  }

  async searchSbomRepositories(
    body: any,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.post(`${this.orgPath()}/sbom/repositories/search`, body, {
      params
    });
    return response.data;
  }

  // ─── People ────────────────────────────────────────────────────

  async listPeople(
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`${this.orgPath()}/people`, { params });
    return response.data;
  }

  // ─── Tokens ────────────────────────────────────────────────────

  async listRepositoryTokens(repositoryName: string): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.orgPath()}/repositories/${repositoryName}/tokens`
    );
    return response.data;
  }

  async createRepositoryToken(repositoryName: string): Promise<any> {
    let response = await this.axios.post(
      `${this.orgPath()}/repositories/${repositoryName}/tokens`
    );
    return response.data;
  }

  async deleteRepositoryToken(repositoryName: string, tokenId: string): Promise<void> {
    await this.axios.delete(
      `${this.orgPath()}/repositories/${repositoryName}/tokens/${tokenId}`
    );
  }

  // ─── Branches ──────────────────────────────────────────────────

  async listBranches(
    repositoryName: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(
      `${this.analysisOrgPath()}/repositories/${repositoryName}/branches`,
      { params }
    );
    return response.data;
  }
}
