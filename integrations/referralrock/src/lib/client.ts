import { createAxios } from 'slates';

let BASE_URL = 'https://api.referralrock.com';

export class ReferralRockClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Basic ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Programs ──

  async listPrograms(params?: {
    programId?: string;
    offset?: number;
    count?: number;
  }): Promise<Record<string, unknown>> {
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
    let response = await this.axios.get('/api/members', { params });
    return response.data;
  }

  async createMember(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/members', body);
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

  async getMemberStats(memberId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/memberstats/getsingle', {
      params: { memberId }
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
    let response = await this.axios.get('/api/referrals', { params });
    return response.data;
  }

  async getReferral(params: {
    referralId?: string;
    email?: string;
    externalIdentifier?: string;
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
    offset?: number;
    count?: number;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/rewards', { params });
    return response.data;
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
    let url = payoutId ? `/api/payouts/${payoutId}` : '/api/payouts';
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
