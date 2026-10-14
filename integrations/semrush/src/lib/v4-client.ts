import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export class SemrushV4Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  private projectPath: string;

  constructor(config: { token: string; authType?: 'api_key' | 'oauth' }) {
    this.projectPath =
      config.authType === 'api_key' ? '/management/v1/projects' : '/apis/v4/projects/v0';
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.semrush.com',
      ...(config.authType === 'api_key'
        ? { params: { key: config.token } }
        : { authHeader: { value: `Bearer ${config.token}` } }),
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Semrush',
          reason: 'upstream_http_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (
        isApiErrorRecord(data) &&
        (data.error || (isApiErrorRecord(data.meta) && data.meta.success === false))
      ) {
        let error = isApiErrorRecord(data.error) ? data.error : data;
        throw createApiServiceError(
          `Semrush API error: ${typeof error.message === 'string' ? error.message : 'The request was unsuccessful.'}`,
          {
            reason: 'upstream_api_error',
            upstreamStatus: response.status,
            upstreamCode: error.code === undefined ? undefined : String(error.code)
          }
        );
      }
      return response;
    });
  }

  // Project Management

  async listProjects(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(this.projectPath);
    let projects: unknown = response.data?.projects ?? response.data?.data ?? response.data;
    if (!Array.isArray(projects) || projects.some(project => !isApiErrorRecord(project))) {
      throw createApiServiceError('Semrush returned an invalid projects list.');
    }
    return projects;
  }

  async getProject(projectId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `${this.projectPath}/${encodeURIComponent(projectId)}`
    );
    let project: unknown = response.data?.data ?? response.data;
    if (!isApiErrorRecord(project))
      throw createApiServiceError('Semrush returned invalid project details.');
    return project;
  }

  async createProject(params: {
    domain: string;
    name?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      this.projectPath,
      pickDefined({
        url: params.domain,
        project_name: params.name
      })
    );
    let project: unknown = response.data?.data ?? response.data;
    if (!isApiErrorRecord(project))
      throw createApiServiceError('Semrush returned invalid project details.');
    return project;
  }

  async updateProject(
    projectId: string,
    params: {
      name?: string;
      domain?: string;
    }
  ): Promise<Record<string, unknown>> {
    if (params.domain !== undefined) {
      throw createApiServiceError(
        'Semrush supports renaming projects; their domain cannot be changed.'
      );
    }
    if (!params.name?.trim()) {
      throw createApiServiceError('projectName is required when renaming a project.');
    }
    if (!/^\d+$/.test(projectId) || !Number.isSafeInteger(Number(projectId))) {
      throw createApiServiceError(
        'Provide the numeric project ID returned by manage_project list.'
      );
    }
    let response = await this.axios.put(this.projectPath, {
      project_id: Number(projectId),
      project_name: params.name
    });
    let project: unknown = response.data?.data ?? response.data;
    if (!isApiErrorRecord(project))
      throw createApiServiceError('Semrush returned invalid project details.');
    return project;
  }

  async deleteProject(projectId: string): Promise<void> {
    let response = await this.axios.delete(
      `${this.projectPath}/${encodeURIComponent(projectId)}`
    );
    if (this.projectPath === '/apis/v4/projects/v0' && response.data?.result !== true) {
      throw createApiServiceError('Semrush did not confirm that the project was deleted.');
    }
  }

  // Position Tracking

  async getPositionTrackingCampaigns(projectId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/management/v1/projects/${encodeURIComponent(projectId)}/position-tracking/campaigns`
    );
    return response.data?.data || response.data || [];
  }

  async createPositionTrackingCampaign(
    projectId: string,
    params: {
      domain: string;
      searchEngine?: string;
      location?: string;
      device?: string;
      keywords?: string[];
      competitors?: string[];
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/management/v1/projects/${encodeURIComponent(projectId)}/position-tracking/campaigns`,
      params
    );
    return response.data?.data || response.data;
  }

  async getPositionTrackingKeywords(
    projectId: string,
    campaignId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/management/v1/projects/${encodeURIComponent(projectId)}/position-tracking/campaigns/${encodeURIComponent(campaignId)}/keywords`,
      { params }
    );
    return response.data?.data || response.data || [];
  }

  async addPositionTrackingKeywords(
    projectId: string,
    campaignId: string,
    keywords: string[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/management/v1/projects/${encodeURIComponent(projectId)}/position-tracking/campaigns/${encodeURIComponent(campaignId)}/keywords`,
      { keywords }
    );
    return response.data?.data || response.data;
  }

  async removePositionTrackingKeywords(
    projectId: string,
    campaignId: string,
    keywords: string[]
  ): Promise<void> {
    await this.axios.delete(
      `/management/v1/projects/${encodeURIComponent(projectId)}/position-tracking/campaigns/${encodeURIComponent(campaignId)}/keywords`,
      { data: { keywords } }
    );
  }

  async getPositionTrackingReport(
    projectId: string,
    campaignId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/management/v1/projects/${encodeURIComponent(projectId)}/position-tracking/campaigns/${encodeURIComponent(campaignId)}/report`,
      { params }
    );
    return response.data?.data || response.data || [];
  }

  // Site Audit

  async enableSiteAudit(
    projectId: string,
    params?: {
      crawlLimit?: number;
      crawlSubdomains?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/management/v1/projects/${encodeURIComponent(projectId)}/site-audit/enable`,
      params
    );
    return response.data?.data || response.data;
  }

  async runSiteAudit(projectId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/management/v1/projects/${encodeURIComponent(projectId)}/site-audit/run`
    );
    return response.data?.data || response.data;
  }

  async getSiteAuditSnapshot(
    projectId: string,
    snapshotId?: string
  ): Promise<Record<string, unknown>> {
    let url = snapshotId
      ? `/management/v1/projects/${encodeURIComponent(projectId)}/site-audit/snapshots/${encodeURIComponent(snapshotId)}`
      : `/management/v1/projects/${encodeURIComponent(projectId)}/site-audit/snapshots/latest`;
    let response = await this.axios.get(url);
    return response.data?.data || response.data;
  }

  async getSiteAuditIssues(
    projectId: string,
    params?: {
      snapshotId?: string;
      limit?: number;
      offset?: number;
      severity?: string;
    }
  ): Promise<Record<string, unknown>[]> {
    let snapshotPath = params?.snapshotId
      ? `/snapshots/${encodeURIComponent(params.snapshotId)}`
      : '/snapshots/latest';
    let response = await this.axios.get(
      `/management/v1/projects/${encodeURIComponent(projectId)}/site-audit${snapshotPath}/issues`,
      {
        params: {
          limit: params?.limit,
          offset: params?.offset,
          severity: params?.severity
        }
      }
    );
    return response.data?.data || response.data || [];
  }

  // Listing Management

  async getLocations(params?: {
    limit?: number;
    offset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/listing-management/v1/locations', {
      params
    });
    return response.data?.data || response.data || [];
  }

  async getLocation(locationId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/listing-management/v1/locations/${encodeURIComponent(locationId)}`
    );
    return response.data?.data || response.data;
  }

  async createLocation(params: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    website?: string;
    categories?: string[];
    hours?: Record<string, unknown>;
    [key: string]: unknown;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/listing-management/v1/locations', params);
    return response.data?.data || response.data;
  }

  async updateLocation(
    locationId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/listing-management/v1/locations/${encodeURIComponent(locationId)}`,
      params
    );
    return response.data?.data || response.data;
  }

  async deleteLocation(locationId: string): Promise<void> {
    await this.axios.delete(
      `/listing-management/v1/locations/${encodeURIComponent(locationId)}`
    );
  }

  // Map Rank Tracker

  async getMapRankTrackerCampaigns(params?: {
    limit?: number;
    offset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/map-rank-tracker/v2/campaigns', {
      params
    });
    return response.data?.data || response.data || [];
  }

  async getMapRankTrackerCampaign(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/map-rank-tracker/v2/campaigns/${encodeURIComponent(campaignId)}`
    );
    return response.data?.data || response.data;
  }

  async getMapRankTrackerKeywords(
    campaignId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/map-rank-tracker/v2/campaigns/${encodeURIComponent(campaignId)}/keywords`,
      {
        params
      }
    );
    return response.data?.data || response.data || [];
  }

  async getMapRankTrackerHeatmap(
    campaignId: string,
    keywordId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/map-rank-tracker/v2/campaigns/${encodeURIComponent(campaignId)}/keywords/${encodeURIComponent(keywordId)}/heatmap`
    );
    return response.data?.data || response.data;
  }

  async getMapRankTrackerCompetitors(
    campaignId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/map-rank-tracker/v2/campaigns/${encodeURIComponent(campaignId)}/competitors`,
      {
        params
      }
    );
    return response.data?.data || response.data || [];
  }
}
