import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { createCursorAxios } from './http';

const memberSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  isRemoved: z.boolean()
});
const spendingSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  spendCents: z.number(),
  overallSpendCents: z.number(),
  fastPremiumRequests: z.number(),
  hardLimitOverrideDollars: z.number(),
  monthlyLimitDollars: z.number().nullable(),
  effectivePerUserLimitDollars: z.number()
});
export const teamSpendingResponseSchema = z.object({
  teamMemberSpend: z.array(spendingSchema),
  subscriptionCycleStart: z.number(),
  totalMembers: z.number(),
  totalPages: z.number()
});
export const teamMembersResponseSchema = z.object({ teamMembers: z.array(memberSchema) });
const validateDateRange = (startDate?: number, endDate?: number, maximumDays?: number) => {
  if (
    startDate !== undefined &&
    endDate !== undefined &&
    (endDate < startDate ||
      (maximumDays !== undefined && endDate - startDate > maximumDays * 24 * 60 * 60 * 1000))
  ) {
    throw createApiServiceError(
      maximumDays === undefined
        ? 'Provide an ordered date range.'
        : `Provide an ordered date range of at most ${maximumDays} days.`
    );
  }
};

export class AdminClient {
  private axios: ReturnType<typeof createCursorAxios>;

  constructor(config: { token: string }) {
    this.axios = createCursorAxios(config.token);
  }

  async getTeamMembers(): Promise<{
    teamMembers: TeamMember[];
  }> {
    let response = await this.axios.get('/teams/members');
    if (
      !Array.isArray(response.data?.teamMembers) ||
      response.data.teamMembers.some(
        (member: { id: unknown }) => typeof member.id !== 'number'
      )
    ) {
      throw createApiServiceError(
        'Cursor now returns encoded team member IDs. Use list_team_members to retrieve current members.'
      );
    }
    return response.data;
  }

  async listTeamMembers() {
    const response = await this.axios.get('/teams/members');
    const parsed = teamMembersResponseSchema.safeParse(response.data);
    if (!parsed.success)
      throw createApiServiceError('Cursor returned unexpected team member data.');
    return parsed.data;
  }

  async getTeamSpending(params: {
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: string;
    page?: number;
    pageSize?: number;
  }) {
    const response = await this.axios.post('/teams/spend', params);
    const parsed = teamSpendingResponseSchema.safeParse(response.data);
    if (!parsed.success)
      throw createApiServiceError('Cursor returned unexpected team spending data.');
    return parsed.data;
  }

  async removeMember(params: { userId?: string; email?: string }): Promise<{
    success: boolean;
    userId: string;
    hasBillingCycleUsage: boolean;
  }> {
    if (!!params.userId === !!params.email)
      throw createApiServiceError(
        'Provide exactly one member email or encoded user ID from list_team_members.'
      );
    let response = await this.axios.post('/teams/remove-member', params);
    if (response.data?.success !== true)
      throw createApiServiceError(
        response.data?.error ?? 'Cursor did not confirm member removal.'
      );
    return response.data;
  }

  async setUserSpendLimit(params: {
    userEmail: string;
    spendLimitDollars: number | null;
  }): Promise<{
    outcome: string;
    message: string;
  }> {
    let response = await this.axios.post('/teams/user-spend-limit', params);
    if (response.data?.outcome !== 'success')
      throw createApiServiceError(
        response.data?.message ?? 'Cursor did not confirm the spend limit change.'
      );
    return response.data;
  }

  async getDailyUsage(params: {
    startDate: number;
    endDate: number;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: DailyUsageEntry[];
    pagination?: {
      page: number;
      pageSize: number;
      totalUsers: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    validateDateRange(params.startDate, params.endDate, 30);
    if ((params.page === undefined) !== (params.pageSize === undefined))
      throw createApiServiceError(
        'Provide both page and pageSize to include all team members, or omit both for active users only.'
      );
    let response = await this.axios.post('/teams/daily-usage-data', params);
    if (!Array.isArray(response.data?.data))
      throw createApiServiceError('Cursor returned unexpected daily usage data.');
    return response.data;
  }

  async getSpend(params?: {
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: string;
    page?: number;
    pageSize?: number;
  }): Promise<SpendResponse> {
    let response = await this.axios.post('/teams/spend', params ?? {});
    if (
      !Array.isArray(response.data?.data) ||
      response.data.data.some(
        (member: { userId: unknown }) => typeof member.userId !== 'number'
      )
    ) {
      throw createApiServiceError(
        'Cursor now returns encoded IDs and a new spending envelope. Use get_team_spending for current spending data.'
      );
    }
    return response.data;
  }

  async getUsageEvents(params: {
    startDate?: number;
    endDate?: number;
    userId?: number;
    email?: string;
    page?: number;
    pageSize?: number;
    serviceAccountId?: string;
    cloudAgentId?: string;
    automationId?: string;
    hostingType?: string;
  }): Promise<UsageEventsResponse> {
    validateDateRange(params.startDate, params.endDate);
    let response = await this.axios.post('/teams/filtered-usage-events', params);
    if (!Array.isArray(response.data?.usageEvents) || !response.data.pagination)
      throw createApiServiceError('Cursor returned unexpected usage event data.');
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
      params
    });
    return response.data;
  }

  async getRepoBlocklists(): Promise<{
    repos: RepoBlocklist[];
  }> {
    let response = await this.axios.get('/settings/repo-blocklists/repos');
    return response.data;
  }

  async upsertRepoBlocklists(repos: { url: string; patterns: string[] }[]): Promise<void> {
    await this.axios.post('/settings/repo-blocklists/repos/upsert', { repos });
  }

  async deleteRepoBlocklist(repoId: string): Promise<void> {
    await this.axios.delete(`/settings/repo-blocklists/repos/${encodeURIComponent(repoId)}`);
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
  isActive?: boolean;
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
  tokenUsage?: {
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
  cloudAgentId?: string;
  automationId?: string;
  serviceAccountId?: string;
}

export interface UsageEventsResponse {
  usageEvents: UsageEvent[];
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
  application_type?: string;
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
