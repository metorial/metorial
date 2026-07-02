import { createAxios } from 'slates';

let BASE_URL = 'https://api.cursor.com';

export class AdminClient {
  private authHeader: string;

  constructor(config: { token: string }) {
    this.authHeader = `Basic ${Buffer.from(`${config.token}:`).toString('base64')}`;
  }

  private get axios() {
    return createAxios({ baseURL: BASE_URL });
  }

  private get headers() {
    return { Authorization: this.authHeader };
  }

  async getTeamMembers(): Promise<{
    teamMembers: TeamMember[];
  }> {
    let response = await this.axios.get('/teams/members', {
      headers: this.headers
    });
    return response.data;
  }

  async removeMember(params: { userId?: string; email?: string }): Promise<{
    success: boolean;
    userId: string;
    hasBillingCycleUsage: boolean;
  }> {
    let response = await this.axios.post('/teams/remove-member', params, {
      headers: this.headers
    });
    return response.data;
  }

  async setUserSpendLimit(params: {
    userEmail: string;
    spendLimitDollars: number | null;
  }): Promise<{
    outcome: string;
    message: string;
  }> {
    let response = await this.axios.post('/teams/user-spend-limit', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getDailyUsage(params: {
    startDate: number;
    endDate: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: DailyUsageEntry[] }> {
    let response = await this.axios.post('/teams/daily-usage-data', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getSpend(params?: {
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: string;
    page?: number;
    pageSize?: number;
  }): Promise<SpendResponse> {
    let response = await this.axios.post('/teams/spend', params ?? {}, {
      headers: this.headers
    });
    return response.data;
  }

  async getUsageEvents(params: {
    startDate: number;
    endDate: number;
    userId?: number;
    email?: string;
    page?: number;
    pageSize?: number;
  }): Promise<UsageEventsResponse> {
    let response = await this.axios.post('/teams/filtered-usage-events', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getAuditLogs(params?: {
    startTime?: string;
    endTime?: string;
    eventTypes?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    users?: string;
  }): Promise<AuditLogsResponse> {
    let response = await this.axios.get('/teams/audit-logs', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getRepoBlocklists(): Promise<{
    repos: RepoBlocklist[];
  }> {
    let response = await this.axios.get('/settings/repo-blocklists/repos', {
      headers: this.headers
    });
    return response.data;
  }

  async upsertRepoBlocklists(repos: { url: string; patterns: string[] }[]): Promise<void> {
    await this.axios.post(
      '/settings/repo-blocklists/repos/upsert',
      { repos },
      {
        headers: this.headers
      }
    );
  }

  async deleteRepoBlocklist(repoId: string): Promise<void> {
    await this.axios.delete(`/settings/repo-blocklists/repos/${repoId}`, {
      headers: this.headers
    });
  }
}

export interface TeamMember {
  id: number;
  email: string;
  name: string;
  role: string;
  isRemoved: boolean;
}

export interface DailyUsageEntry {
  userId: number;
  day: string;
  date: number;
  email: string;
  isActive: boolean;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  acceptedLinesAdded: number;
  acceptedLinesDeleted: number;
  totalApplies: number;
  totalAccepts: number;
  totalRejects: number;
  totalTabsShown: number;
  totalTabsAccepted: number;
  composerRequests: number;
  chatRequests: number;
  agentRequests: number;
  cmdkUsages: number;
  subscriptionIncludedReqs: number;
  apiKeyReqs: number;
  usageBasedReqs: number;
  bugbotUsages: number;
  mostUsedModel: string | null;
  applyMostUsedExtension: string | null;
  tabMostUsedExtension: string | null;
  clientVersion: string | null;
}

export interface SpendEntry {
  userId: number;
  name: string;
  email: string;
  role: string;
  spendCents: number;
  fastPremiumRequests: number;
  hardLimitOverrideDollars: number;
  monthlyLimitDollars: number | null;
}

export interface SpendResponse {
  data: SpendEntry[];
  subscriptionCycleStart: string;
  totalMembers: number;
  totalPages: number;
}

export interface UsageEvent {
  timestamp: string;
  userEmail: string;
  model: string;
  kind: string;
  maxMode: boolean;
  requestsCosts: number;
  isTokenBasedCall: boolean;
  isChargeable: boolean;
  isHeadless: boolean;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
    totalCents: number;
    discountPercentOff?: number;
  };
  chargedCents: number;
  cursorTokenFee?: number;
  isFreeBugbot: boolean;
}

export interface UsageEventsResponse {
  data: UsageEvent[];
  totalUsageEventsCount: number;
  pagination: {
    numPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface AuditLogEvent {
  event_id: string;
  timestamp: string;
  ip_address: string;
  user_email: string;
  event_type: string;
  event_data: Record<string, unknown>;
}

export interface AuditLogsResponse {
  events: AuditLogEvent[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface RepoBlocklist {
  id: string;
  url: string;
  patterns: string[];
}
