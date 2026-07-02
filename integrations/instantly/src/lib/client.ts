import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.instantly.ai/api/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Campaigns ──────────────────────────────────────────────

  async listCampaigns(
    params: {
      limit?: number;
      startingAfter?: string;
      search?: string;
      status?: number;
      tagIds?: string;
    } = {}
  ) {
    let res = await this.axios.get('/campaigns', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter,
        search: params.search,
        status: params.status,
        tag_ids: params.tagIds
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async getCampaign(campaignId: string) {
    let res = await this.axios.get(`/campaigns/${campaignId}`);
    return res.data;
  }

  async createCampaign(data: { name: string; campaignSchedule?: any; sequences?: any[] }) {
    let res = await this.axios.post('/campaigns', {
      name: data.name,
      campaign_schedule: data.campaignSchedule,
      sequences: data.sequences
    });
    return res.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, any>) {
    let res = await this.axios.patch(`/campaigns/${campaignId}`, data);
    return res.data;
  }

  async deleteCampaign(campaignId: string) {
    let res = await this.axios.delete(`/campaigns/${campaignId}`);
    return res.data;
  }

  async activateCampaign(campaignId: string) {
    let res = await this.axios.post(`/campaigns/${campaignId}/activate`);
    return res.data;
  }

  async pauseCampaign(campaignId: string) {
    let res = await this.axios.post(`/campaigns/${campaignId}/pause`);
    return res.data;
  }

  // ─── Campaign Analytics ─────────────────────────────────────

  async getCampaignAnalytics(
    params: {
      campaignId?: string;
      campaignIds?: string[];
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    let res = await this.axios.get('/campaigns/analytics', {
      params: {
        id: params.campaignId,
        ids: params.campaignIds,
        start_date: params.startDate,
        end_date: params.endDate
      }
    });
    return res.data;
  }

  async getCampaignAnalyticsOverview(
    params: {
      campaignId?: string;
      campaignIds?: string[];
      startDate?: string;
      endDate?: string;
      campaignStatus?: number;
    } = {}
  ) {
    let res = await this.axios.get('/campaigns/analytics/overview', {
      params: {
        id: params.campaignId,
        ids: params.campaignIds,
        start_date: params.startDate,
        end_date: params.endDate,
        campaign_status: params.campaignStatus
      }
    });
    return res.data;
  }

  async getDailyCampaignAnalytics(
    params: {
      campaignId?: string;
      startDate?: string;
      endDate?: string;
      campaignStatus?: number;
    } = {}
  ) {
    let res = await this.axios.get('/campaigns/analytics/daily', {
      params: {
        campaign_id: params.campaignId,
        start_date: params.startDate,
        end_date: params.endDate,
        campaign_status: params.campaignStatus
      }
    });
    return res.data;
  }

  async getStepAnalytics(
    params: {
      campaignId?: string;
      startDate?: string;
      endDate?: string;
      includeOpportunitiesCount?: boolean;
    } = {}
  ) {
    let res = await this.axios.get('/campaigns/analytics/steps', {
      params: {
        campaign_id: params.campaignId,
        start_date: params.startDate,
        end_date: params.endDate,
        include_opportunities_count: params.includeOpportunitiesCount
      }
    });
    return res.data;
  }

  // ─── Leads ──────────────────────────────────────────────────

  async listLeads(
    params: {
      campaignId?: string;
      listId?: string;
      interestStatus?: number;
      startingAfter?: string;
      limit?: number;
    } = {}
  ) {
    let res = await this.axios.post('/leads/list', {
      campaign_id: params.campaignId,
      list_id: params.listId,
      interest_status: params.interestStatus,
      starting_after: params.startingAfter,
      limit: params.limit
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async getLead(leadId: string) {
    let res = await this.axios.get(`/leads/${leadId}`);
    return res.data;
  }

  async createLead(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    website?: string;
    phone?: string;
    personalization?: string;
    campaignId?: string;
    listId?: string;
    interestStatus?: number;
    skipIfInWorkspace?: boolean;
    skipIfInCampaign?: boolean;
    customVariables?: Record<string, any>;
  }) {
    let res = await this.axios.post('/leads', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
      website: data.website,
      phone: data.phone,
      personalization: data.personalization,
      campaign: data.campaignId,
      list_id: data.listId,
      lt_interest_status: data.interestStatus,
      skip_if_in_workspace: data.skipIfInWorkspace,
      skip_if_in_campaign: data.skipIfInCampaign,
      custom_variables: data.customVariables
    });
    return res.data;
  }

  async updateLead(leadId: string, data: Record<string, any>) {
    let res = await this.axios.patch(`/leads/${leadId}`, data);
    return res.data;
  }

  async deleteLead(leadId: string) {
    let res = await this.axios.delete(`/leads/${leadId}`);
    return res.data;
  }

  async updateLeadInterestStatus(data: {
    leadEmail: string;
    interestValue: number | null;
    campaignId?: string;
    listId?: string;
  }) {
    let res = await this.axios.post('/leads/update-interest-status', {
      lead_email: data.leadEmail,
      interest_value: data.interestValue,
      campaign_id: data.campaignId,
      list_id: data.listId
    });
    return res.data;
  }

  async moveLeads(data: {
    leadIds?: string[];
    fromCampaignId?: string;
    toCampaignId?: string;
    fromListId?: string;
    toListId?: string;
  }) {
    let res = await this.axios.post('/leads/move', {
      lead_ids: data.leadIds,
      from_campaign_id: data.fromCampaignId,
      to_campaign_id: data.toCampaignId,
      from_list_id: data.fromListId,
      to_list_id: data.toListId
    });
    return res.data;
  }

  // ─── Email Accounts ─────────────────────────────────────────

  async listAccounts(
    params: {
      limit?: number;
      startingAfter?: string;
      search?: string;
      status?: number;
      tagIds?: string;
    } = {}
  ) {
    let res = await this.axios.get('/accounts', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter,
        search: params.search,
        status: params.status,
        tag_ids: params.tagIds
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async getAccount(email: string) {
    let res = await this.axios.get(`/accounts/${encodeURIComponent(email)}`);
    return res.data;
  }

  async updateAccount(email: string, data: Record<string, any>) {
    let res = await this.axios.patch(`/accounts/${encodeURIComponent(email)}`, data);
    return res.data;
  }

  async deleteAccount(email: string) {
    let res = await this.axios.delete(`/accounts/${encodeURIComponent(email)}`);
    return res.data;
  }

  async pauseAccount(email: string) {
    let res = await this.axios.post(`/accounts/${encodeURIComponent(email)}/pause`);
    return res.data;
  }

  async resumeAccount(email: string) {
    let res = await this.axios.post(`/accounts/${encodeURIComponent(email)}/resume`);
    return res.data;
  }

  // ─── Emails ─────────────────────────────────────────────────

  async listEmails(
    params: {
      limit?: number;
      startingAfter?: string;
      campaignId?: string;
      listId?: string;
      eaccount?: string;
      lead?: string;
      search?: string;
      isUnread?: boolean;
      emailType?: string;
      previewOnly?: boolean;
    } = {}
  ) {
    let res = await this.axios.get('/emails', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter,
        campaign_id: params.campaignId,
        list_id: params.listId,
        eaccount: params.eaccount,
        lead: params.lead,
        search: params.search,
        is_unread: params.isUnread,
        email_type: params.emailType,
        preview_only: params.previewOnly
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async getEmail(emailId: string) {
    let res = await this.axios.get(`/emails/${emailId}`);
    return res.data;
  }

  async getUnreadCount() {
    let res = await this.axios.get('/emails/unread/count');
    return res.data;
  }

  async replyToEmail(data: {
    replyToEmailId: string;
    from: string;
    to: string;
    body: string;
    cc?: string[];
    bcc?: string[];
  }) {
    let res = await this.axios.post('/emails/reply', {
      reply_to_uuid: data.replyToEmailId,
      from: data.from,
      to: data.to,
      body: data.body,
      cc: data.cc,
      bcc: data.bcc
    });
    return res.data;
  }

  // ─── Email Verification ─────────────────────────────────────

  async verifyEmail(email: string) {
    let res = await this.axios.post('/email-verification', { email });
    return res.data;
  }

  async getVerificationStatus(email: string) {
    let res = await this.axios.get(`/email-verification/${encodeURIComponent(email)}`);
    return res.data;
  }

  // ─── Lead Lists ─────────────────────────────────────────────

  async listLeadLists(
    params: { limit?: number; startingAfter?: string; search?: string } = {}
  ) {
    let res = await this.axios.get('/lead-lists', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter,
        search: params.search
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async getLeadList(listId: string) {
    let res = await this.axios.get(`/lead-lists/${listId}`);
    return res.data;
  }

  async createLeadList(name: string) {
    let res = await this.axios.post('/lead-lists', { name });
    return res.data;
  }

  async updateLeadList(listId: string, name: string) {
    let res = await this.axios.patch(`/lead-lists/${listId}`, { name });
    return res.data;
  }

  async deleteLeadList(listId: string) {
    let res = await this.axios.delete(`/lead-lists/${listId}`);
    return res.data;
  }

  // ─── Lead Labels ────────────────────────────────────────────

  async listLeadLabels(params: { limit?: number; startingAfter?: string } = {}) {
    let res = await this.axios.get('/lead-labels', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async getLeadLabel(labelId: string) {
    let res = await this.axios.get(`/lead-labels/${labelId}`);
    return res.data;
  }

  async createLeadLabel(data: { name: string; color?: string }) {
    let res = await this.axios.post('/lead-labels', data);
    return res.data;
  }

  async updateLeadLabel(labelId: string, data: { name?: string; color?: string }) {
    let res = await this.axios.patch(`/lead-labels/${labelId}`, data);
    return res.data;
  }

  async deleteLeadLabel(labelId: string) {
    let res = await this.axios.delete(`/lead-labels/${labelId}`);
    return res.data;
  }

  // ─── Block List Entries ─────────────────────────────────────

  async listBlockListEntries(params: { limit?: number; startingAfter?: string } = {}) {
    let res = await this.axios.get('/block-lists-entries', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async createBlockListEntry(data: { entry: string; entry_type?: string }) {
    let res = await this.axios.post('/block-lists-entries', data);
    return res.data;
  }

  async deleteBlockListEntry(entryId: string) {
    let res = await this.axios.delete(`/block-lists-entries/${entryId}`);
    return res.data;
  }

  // ─── Custom Tags ────────────────────────────────────────────

  async listCustomTags(
    params: { limit?: number; startingAfter?: string; search?: string } = {}
  ) {
    let res = await this.axios.get('/custom-tags', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter,
        search: params.search
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async createCustomTag(data: { name: string }) {
    let res = await this.axios.post('/custom-tags', data);
    return res.data;
  }

  async deleteCustomTag(tagId: string) {
    let res = await this.axios.delete(`/custom-tags/${tagId}`);
    return res.data;
  }

  async toggleTagResource(data: { tagId: string; resourceIds: string[]; assign: boolean }) {
    let res = await this.axios.post('/custom-tags/toggle-resource', {
      tag_id: data.tagId,
      resource_ids: data.resourceIds,
      assign: data.assign
    });
    return res.data;
  }

  // ─── Webhooks ───────────────────────────────────────────────

  async listWebhooks(
    params: {
      limit?: number;
      startingAfter?: string;
      campaign?: string;
      eventType?: string;
    } = {}
  ) {
    let res = await this.axios.get('/webhooks', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter,
        campaign: params.campaign,
        event_type: params.eventType
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async createWebhook(data: {
    targetHookUrl: string;
    eventType: string;
    campaignId?: string;
    name?: string;
    headers?: Record<string, string>;
  }) {
    let res = await this.axios.post('/webhooks', {
      target_hook_url: data.targetHookUrl,
      event_type: data.eventType,
      campaign: data.campaignId,
      name: data.name,
      headers: data.headers
    });
    return res.data;
  }

  async getWebhook(webhookId: string) {
    let res = await this.axios.get(`/webhooks/${webhookId}`);
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }

  // ─── Account-Campaign Mappings ──────────────────────────────

  async listAccountCampaignMappings(
    params: { limit?: number; startingAfter?: string; campaignId?: string } = {}
  ) {
    let res = await this.axios.get('/account-campaign-mappings', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter,
        campaign_id: params.campaignId
      }
    });
    return res.data as { items: any[]; next_starting_after: string | null };
  }

  async createAccountCampaignMapping(data: { campaignId: string; accountEmail: string }) {
    let res = await this.axios.post('/account-campaign-mappings', {
      campaign_id: data.campaignId,
      email: data.accountEmail
    });
    return res.data;
  }

  async deleteAccountCampaignMapping(mappingId: string) {
    let res = await this.axios.delete(`/account-campaign-mappings/${mappingId}`);
    return res.data;
  }
}
