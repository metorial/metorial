import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.referralrock.com';

export class ReferralRockClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'Referral Rock API credentials are missing. Reconnect with your API keys.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      authHeader: { value: `Basic ${config.token}` },
      errorMapping: {
        mapAxiosError: error => {
          let details: string[] = [];
          collectApiErrorDetails(error.response?.data, details, {
            detailKeys: [
              'message',
              'Message',
              'ExceptionMessage',
              'error',
              'error_description'
            ],
            nestedKeys: ['resultInfo', 'errors']
          });
          let data = error.response?.data;
          if (isApiErrorRecord(data) && isApiErrorRecord(data.ModelState)) {
            for (let value of Object.values(data.ModelState)) {
              collectApiErrorDetails(value, details);
            }
          }
          return details.length > 0 ? { message: details.join(' - ') } : undefined;
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Referral Rock',
          reason: 'referralrock_api_error'
        })
    });
  }

  // ── Programs ──

  async listPrograms(params?: {
    programId?: string;
    offset?: number;
    count?: number;
  }): Promise<Record<string, unknown>> {
    validatePagination(params);
    let response = await this.axios.get('/api/programs', { params });
    return response.data;
  }

  async getProgramByName(programName: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/program/getsingle', {
      params: { programName }
    });
    return response.data;
  }

  // ── Members ──

  async listMembers(params?: {
    programId?: string;
    query?: string;
    showDisabled?: boolean;
    sort?: string;
    dateFrom?: string;
    dateTo?: string;
    offset?: number;
    count?: number;
  }): Promise<Record<string, unknown>> {
    validatePagination(params);
    let response = await this.axios.get('/api/members', { params });
    return response.data;
  }

  async createMember(
    body: Record<string, unknown>,
    shouldSendEmail?: boolean
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/members', body, {
      params: { shouldSendEmail }
    });
    return response.data;
  }

  async updateMembers(members: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/members/update', members);
    return response.data;
  }

  async removeMembers(members: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/members/remove', members);
    return response.data;
  }

  async getMemberStats(query: string, timePeriod: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/memberstats/getsingle', {
      params: { query, timePeriod }
    });
    return response.data;
  }

  // ── Referrals ──

  async listReferrals(params?: {
    programId?: string;
    query?: string;
    memberId?: string;
    sort?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    offset?: number;
    count?: number;
  }): Promise<Record<string, unknown>> {
    validatePagination(params);
    let response = await this.axios.get('/api/referrals', { params });
    return response.data;
  }

  async getReferral(params: {
    referralId?: string;
    email?: string;
    externalId?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/referral/single', { params });
    return response.data;
  }

  async createReferral(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/referrals', body);
    return response.data;
  }

  async updateReferrals(
    referrals: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/referral/update', referrals);
    return response.data;
  }

  async removeReferrals(
    referrals: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/referral/remove', referrals);
    return response.data;
  }

  // ── Referral Actions ──

  async createReferralAction(body: {
    amount: number;
    referralQuery: string;
    programQuery?: string;
    name?: string;
    externalIdentifier?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/referralaction', body);
    return response.data;
  }

  // ── Rewards ──

  async listRewards(params?: {
    programId?: string;
    memberId?: string;
    referralId?: string;
    query?: string;
    status?: string;
    sort?: string;
    dateFrom?: string;
    dateTo?: string;
    offset?: number;
    count?: number;
  }): Promise<Record<string, unknown>> {
    validatePagination(params);
    let { referralId, ...queryParams } = params ?? {};
    let response = await this.axios.get('/api/rewards', {
      params: referralId ? { ...queryParams, offset: 0, count: 2_147_483_647 } : queryParams
    });
    if (!referralId) return response.data;

    // The rewards endpoint has no referralId query parameter; filter before pagination.
    let data = response.data as Record<string, unknown>;
    let rewards = getResponseRecords(data.rewards, 'reward list').filter(
      reward => reward.referralId === referralId
    );
    let offset = params?.offset ?? 0;
    return {
      ...data,
      rewards: rewards.slice(
        offset,
        params?.count === undefined ? undefined : offset + params.count
      ),
      offset,
      total: rewards.length
    };
  }

  async createRewards(rewards: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/rewards', rewards);
    return response.data;
  }

  async updateRewards(rewards: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/rewards/update', rewards);
    return response.data;
  }

  async issueReward(
    body: {
      rewardId: string;
      recipientInfo?: string;
      note?: string;
    },
    overrideIneligible?: boolean
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/rewards/issue', body, {
      params: overrideIneligible ? { overrideIneligible: true } : undefined
    });
    return response.data;
  }

  async removeRewards(rewardIds: string[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/rewards/remove', rewardIds);
    return response.data;
  }

  // ── Reward Rules ──

  async getRewardRules(programId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/rewardrules', {
      params: { programId }
    });
    return response.data;
  }

  // ── Payouts ──

  async listPayouts(payoutId?: string): Promise<Record<string, unknown>> {
    let url = payoutId ? `/api/payouts/${encodeURIComponent(payoutId)}` : '/api/payouts';
    let response = await this.axios.get(url);
    return response.data;
  }

  async getPendingPayouts(params?: {
    memberId?: string;
    recipientId?: string;
    includeIneligible?: boolean;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/payouts/pending', { params });
    return response.data;
  }

  async getPayoutTransactions(params?: {
    recipientId?: string;
    transactionId?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/payouts/transactions', { params });
    return response.data;
  }

  async processPayoutTransaction(
    body: {
      memberId?: string;
      recipientId?: string;
      payoutId: string;
      note?: string;
    },
    overrideIneligible?: boolean
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/payouts/transactions', body, {
      params: overrideIneligible ? { overrideIneligible: true } : undefined
    });
    return response.data;
  }

  // ── Email Management ──

  async unsubscribeEmail(email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/email/unsubscribe', JSON.stringify(email), {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async removeUnsubscribe(email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      '/api/email/removeunsubscribe',
      JSON.stringify(email),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async getUnsubscribedEmails(email?: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/email/getunsubscribed', {
      params: email ? { email } : undefined
    });
    return response.data;
  }

  // ── Invite Feeds ──

  async sendInviteFeedBatch(
    contacts: Array<{
      firstName: string;
      lastName?: string;
      email: string;
      contactType?: string;
    }>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/invitefeeds', contacts);
    return response.data;
  }

  async sendInviteFeedSingle(contact: {
    firstName: string;
    lastName?: string;
    email: string;
    contactType?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/invitefeed', contact);
    return response.data;
  }

  async submitCustomerFeed(
    customers: Record<string, unknown>[]
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.post('/api/customerfeeds', customers);
    return getResponseRecords(response.data, 'customer feed outcomes');
  }

  // ── Member Access URLs ──

  async getMemberAccessUrls(body: {
    memberId?: string;
    referralCode?: string;
    emailAddress?: string;
    externalId?: string;
    expireInMinutes?: number;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/memberaccessurls', body);
    return response.data;
  }

  // ── Webhooks ──

  async registerWebhook(targetUrl: string, event: string): Promise<{ web_hook_id: string }> {
    let response = await this.axios.post('/api/hooks', {
      target_url: targetUrl,
      event
    });
    return response.data;
  }

  async unregisterWebhook(webhookId: string): Promise<void> {
    await this.axios.delete('/api/hooks', {
      data: { web_hook_id: webhookId }
    });
  }
}

let validatePagination = (params?: { offset?: number; count?: number }) => {
  for (let key of ['offset', 'count'] as const) {
    let value = params?.[key];
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 0 || value > 2_147_483_647)
    ) {
      throw createApiServiceError(`${key} must be a whole number between 0 and 2147483647.`);
    }
  }
};

export let getResponseRecords = (value: unknown, label: string): Record<string, unknown>[] => {
  if (!Array.isArray(value) || !value.every(isApiErrorRecord)) {
    throw createApiServiceError(`Referral Rock returned an invalid ${label} response.`, {
      reason: 'referralrock_invalid_response'
    });
  }
  return value;
};

export let getFirstResult = (value: unknown): Record<string, unknown> => {
  let first = Array.isArray(value) ? value[0] : value;
  if (!isApiErrorRecord(first)) {
    throw createApiServiceError('Referral Rock did not return an operation result.', {
      reason: 'referralrock_invalid_response'
    });
  }
  return first;
};

export let getResponseEntity = (result: Record<string, unknown>, key: string) => {
  let entity = result[key];
  if (!isApiErrorRecord(entity) || typeof entity.id !== 'string' || !entity.id) {
    let info = isApiErrorRecord(result.resultInfo) ? result.resultInfo : {};
    let message = info.Message ?? result.message;
    throw createApiServiceError(
      typeof message === 'string' && message.trim()
        ? `Referral Rock: ${message}`
        : `Referral Rock did not return the ${key} for this operation.`,
      { reason: 'referralrock_operation_failed' }
    );
  }
  return entity;
};
