import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.mavrck.co/v1/reporting-api'
});

export interface InstanceInfo {
  communityId: string;
  communityName: string;
  [key: string]: unknown;
}

export interface Campaign {
  campaignId: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  description: string;
  [key: string]: unknown;
}

export interface ReportingGroup {
  reportingGroupId: string;
  name: string;
  campaignIds: string[];
  [key: string]: unknown;
}

export interface NetworkMetrics {
  posts: number;
  stories: number;
  reels: number;
  lives: number;
  impressions: number;
  engagements: number;
  [key: string]: unknown;
}

export interface PerformanceReportEntry {
  period: string;
  contentTotals: number;
  impressions: number;
  engagements: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  networkBreakdown: Record<string, NetworkMetrics>;
  [key: string]: unknown;
}

export interface PerformanceReport {
  campaignId?: string;
  reportingGroupId?: string;
  entries: PerformanceReportEntry[];
  [key: string]: unknown;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  async getInstance(): Promise<InstanceInfo> {
    let response = await http.get('/instance', {
      headers: this.headers()
    });
    return response.data;
  }

  async getCampaigns(params?: { campaignId?: string }): Promise<Campaign[]> {
    let queryParams: Record<string, string> = {};
    if (params?.campaignId) {
      queryParams.campaignId = params.campaignId;
    }

    let response = await http.get('/campaigns', {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getReportingGroups(params?: {
    reportingGroupId?: string;
    campaignId?: string;
  }): Promise<ReportingGroup[]> {
    let queryParams: Record<string, string> = {};
    if (params?.reportingGroupId) {
      queryParams.reportingGroupId = params.reportingGroupId;
    }
    if (params?.campaignId) {
      queryParams.campaignId = params.campaignId;
    }

    let response = await http.get('/reporting-groups', {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getPerformanceReport(params: {
    campaignId?: string;
    reportingGroupId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }): Promise<PerformanceReport> {
    let queryParams: Record<string, string> = {};
    if (params.campaignId) {
      queryParams.campaignId = params.campaignId;
    }
    if (params.reportingGroupId) {
      queryParams.reportingGroupId = params.reportingGroupId;
    }
    if (params.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params.groupBy) {
      queryParams.groupBy = params.groupBy;
    }

    let response = await http.get('/report', {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }
}
