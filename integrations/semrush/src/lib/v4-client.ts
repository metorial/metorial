import { createAxios } from 'slates';

export class SemrushV4Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.semrush.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Project Management

  async listProjects(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/management/v1/projects');
    return response.data?.data || response.data || [];
  }

  async getProject(projectId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/management/v1/projects/${projectId}`);
    return response.data?.data || response.data;
  }

  async createProject(params: {
    domain: string;
    name?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/management/v1/projects', {
      domain: params.domain,
      name: params.name
    });
    return response.data?.data || response.data;
  }

  async updateProject(
    projectId: string,
    params: {
      name?: string;
      domain?: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/management/v1/projects/${projectId}`, params);
    return response.data?.data || response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/management/v1/projects/${projectId}`);
  }

  // Position Tracking

  async getPositionTrackingCampaigns(projectId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/management/v1/projects/${projectId}/position-tracking/campaigns`
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
      `/management/v1/projects/${projectId}/position-tracking/campaigns`,
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
      `/management/v1/projects/${projectId}/position-tracking/campaigns/${campaignId}/keywords`,
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
      `/management/v1/projects/${projectId}/position-tracking/campaigns/${campaignId}/keywords`,
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
      `/management/v1/projects/${projectId}/position-tracking/campaigns/${campaignId}/keywords`,
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
      `/management/v1/projects/${projectId}/position-tracking/campaigns/${campaignId}/report`,
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
      `/management/v1/projects/${projectId}/site-audit/enable`,
      params
    );
    return response.data?.data || response.data;
  }

  async runSiteAudit(projectId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/management/v1/projects/${projectId}/site-audit/run`
    );
    return response.data?.data || response.data;
  }

  async getSiteAuditSnapshot(
    projectId: string,
    snapshotId?: string
  ): Promise<Record<string, unknown>> {
    let url = snapshotId
      ? `/management/v1/projects/${projectId}/site-audit/snapshots/${snapshotId}`
      : `/management/v1/projects/${projectId}/site-audit/snapshots/latest`;
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
      ? `/snapshots/${params.snapshotId}`
      : '/snapshots/latest';
    let response = await this.axios.get(
      `/management/v1/projects/${projectId}/site-audit${snapshotPath}/issues`,
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
    let response = await this.axios.get(`/listing-management/v1/locations/${locationId}`);
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
      `/listing-management/v1/locations/${locationId}`,
      params
    );
    return response.data?.data || response.data;
  }

  async deleteLocation(locationId: string): Promise<void> {
    await this.axios.delete(`/listing-management/v1/locations/${locationId}`);
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
    let response = await this.axios.get(`/map-rank-tracker/v2/campaigns/${campaignId}`);
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
      `/map-rank-tracker/v2/campaigns/${campaignId}/keywords`,
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
      `/map-rank-tracker/v2/campaigns/${campaignId}/keywords/${keywordId}/heatmap`
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
      `/map-rank-tracker/v2/campaigns/${campaignId}/competitors`,
      {
        params
      }
    );
    return response.data?.data || response.data || [];
  }
}
