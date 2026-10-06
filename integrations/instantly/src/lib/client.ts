import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let invalid = (message: string) => createApiServiceError(message);

export let apiError = (error: unknown) => {
  let rawStatus = getApiErrorStatus(error);
  let status =
    typeof rawStatus === 'number' && Number.isInteger(rawStatus)
      ? rawStatus
      : typeof rawStatus === 'string' && /^\d{3}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  if (status !== undefined && (status < 100 || status > 599)) status = undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Instantly',
      reason: 'instantly_api_error',
      extractResponse: () => ({ status }),
      extractMessage: () =>
        status === 401 || status === 403
          ? 'Check that the API key is a V2 key with the required resource permissions.'
          : status === 404
            ? 'The requested resource was not found in this workspace.'
            : status === 429
              ? 'The workspace rate limit was reached. Wait before retrying.'
              : 'The request could not be confirmed. Read back before retrying a mutation.',
      parent: {}
    }
  );
};

export let pathId = (value: string) => {
  if (!value.trim() || /[\r\n]/.test(value))
    throw invalid('Provide a non-empty resource identifier.');
  return encodeURIComponent(value);
};

export let page = (value: unknown) => {
  if (
    !isApiErrorRecord(value) ||
    !Array.isArray(value.items) ||
    !value.items.every(isApiErrorRecord)
  ) {
    throw invalid('Instantly returned an invalid list response.');
  }
  let cursor = value.next_starting_after;
  if (cursor !== undefined && cursor !== null && typeof cursor !== 'string') {
    throw invalid('Instantly returned an invalid pagination cursor.');
  }
  return { items: value.items as Record<string, any>[], next_starting_after: cursor ?? null };
};

export let entity = (value: unknown): Record<string, any> => {
  if (!isApiErrorRecord(value))
    throw invalid('Instantly returned an invalid resource response.');
  if (value.success === false || value.status === 'error')
    throw invalid('Instantly did not confirm this operation. Read back before retrying.');
  return value;
};

export let validateVariables = (values: Record<string, unknown> | undefined) => {
  if (
    values &&
    Object.values(values).some(
      value =>
        (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) ||
        (typeof value === 'number' && !Number.isFinite(value))
    )
  ) {
    throw invalid(
      'Custom variable values must be strings, finite numbers, booleans, or null.'
    );
  }
};

export let emailAddresses = (value: unknown): string[] | undefined => {
  if (typeof value === 'string')
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value;
  return undefined;
};

export let leadVerificationStatus = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  let labels: Record<number, string> = {
    1: 'verified',
    11: 'pending',
    12: 'pending_verification_job',
    '-1': 'invalid',
    '-2': 'risky',
    '-3': 'catch_all',
    '-4': 'job_change'
  };
  return typeof value === 'number' ? (labels[value] ?? String(value)) : String(value);
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token)) {
      throw invalid('Provide an Instantly V2 API key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.instantly.ai/api/v2',
      timeout: 30_000,
      maxRedirects: 0,
      paramsSerializer: { indexes: null },
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: apiError
    });
    let redactor = new AuthConfigSecretRedactor(config);
    this.axios.interceptors.response.use(response => {
      response.data = redactor.redactEmbedded(response.data);
      return response;
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
    return page(res.data);
  }

  async getCampaign(campaignId: string) {
    let res = await this.axios.get(`/campaigns/${pathId(campaignId)}`);
    return entity(res.data);
  }

  async createCampaign(data: { name: string; campaignSchedule?: any; sequences?: any[] }) {
    let res = await this.axios.post('/campaigns', {
      name: data.name,
      campaign_schedule: data.campaignSchedule,
      sequences: data.sequences
    });
    return entity(res.data);
  }

  async updateCampaign(campaignId: string, data: Record<string, any>) {
    let res = await this.axios.patch(`/campaigns/${pathId(campaignId)}`, data);
    return entity(res.data);
  }

  async deleteCampaign(campaignId: string) {
    let res = await this.axios.delete(`/campaigns/${pathId(campaignId)}`);
    return entity(res.data);
  }

  async activateCampaign(campaignId: string) {
    let res = await this.axios.post(`/campaigns/${pathId(campaignId)}/activate`);
    return entity(res.data);
  }

  async pauseCampaign(campaignId: string) {
    let res = await this.axios.post(`/campaigns/${pathId(campaignId)}/pause`);
    return entity(res.data);
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
      campaign: params.campaignId,
      list_id: params.listId,
      starting_after: params.startingAfter,
      limit: params.limit
    });
    let result = page(res.data);
    if (params.interestStatus !== undefined) {
      result.items = result.items.filter(
        lead => lead.lt_interest_status === params.interestStatus
      );
    }
    return result;
  }

  async getLead(leadId: string) {
    let res = await this.axios.get(`/leads/${pathId(leadId)}`);
    return entity(res.data);
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
    return entity(res.data);
  }

  async updateLead(leadId: string, data: Record<string, any>) {
    let res = await this.axios.patch(`/leads/${pathId(leadId)}`, data);
    return entity(res.data);
  }

  async deleteLead(leadId: string) {
    let res = await this.axios.delete(`/leads/${pathId(leadId)}`);
    return entity(res.data);
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
    return { accepted: true, asynchronous: res.status === 202 };
  }

  async moveLeads(data: {
    leadIds?: string[];
    fromCampaignId?: string;
    toCampaignId?: string;
    fromListId?: string;
    toListId?: string;
  }) {
    let res = await this.axios.post('/leads/move', {
      ids: data.leadIds,
      campaign: data.fromCampaignId,
      to_campaign_id: data.toCampaignId,
      list_id: data.fromListId,
      to_list_id: data.toListId
    });
    return entity(res.data);
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
    return page(res.data);
  }

  async getAccount(email: string) {
    let res = await this.axios.get(`/accounts/${pathId(email)}`);
    return entity(res.data);
  }

  async updateAccount(email: string, data: Record<string, any>) {
    let res = await this.axios.patch(`/accounts/${pathId(email)}`, data);
    return entity(res.data);
  }

  async deleteAccount(email: string) {
    let res = await this.axios.delete(`/accounts/${pathId(email)}`);
    return entity(res.data);
  }

  async pauseAccount(email: string) {
    let res = await this.axios.post(`/accounts/${pathId(email)}/pause`);
    return entity(res.data);
  }

  async resumeAccount(email: string) {
    let res = await this.axios.post(`/accounts/${pathId(email)}/resume`);
    return entity(res.data);
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
    return page(res.data);
  }

  async getEmail(emailId: string) {
    let res = await this.axios.get(`/emails/${pathId(emailId)}`);
    return entity(res.data);
  }

  async getUnreadCount() {
    let res = await this.axios.get('/emails/unread/count');
    return entity(res.data);
  }

  async replyToEmail(data: {
    replyToEmailId: string;
    from: string;
    to: string;
    body: string;
    subject: string;
    cc?: string[];
    bcc?: string[];
  }) {
    let res = await this.axios.post('/emails/reply', {
      reply_to_uuid: data.replyToEmailId,
      eaccount: data.from,
      subject: data.subject,
      body: { html: data.body },
      cc_address_email_list: data.cc?.join(','),
      bcc_address_email_list: data.bcc?.join(',')
    });
    return entity(res.data);
  }

  // ─── Email Verification ─────────────────────────────────────

  async verifyEmail(email: string) {
    let res = await this.axios.post('/email-verification', { email });
    return entity(res.data);
  }

  async getVerificationStatus(email: string) {
    let res = await this.axios.get(`/email-verification/${pathId(email)}`);
    return entity(res.data);
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
    return page(res.data);
  }

  async getLeadList(listId: string) {
    let res = await this.axios.get(`/lead-lists/${pathId(listId)}`);
    return entity(res.data);
  }

  async createLeadList(name: string) {
    let res = await this.axios.post('/lead-lists', { name });
    return entity(res.data);
  }

  async updateLeadList(listId: string, name: string) {
    let res = await this.axios.patch(`/lead-lists/${pathId(listId)}`, { name });
    return entity(res.data);
  }

  async deleteLeadList(listId: string) {
    let res = await this.axios.delete(`/lead-lists/${pathId(listId)}`);
    return entity(res.data);
  }

  // ─── Lead Labels ────────────────────────────────────────────

  async listLeadLabels(params: { limit?: number; startingAfter?: string } = {}) {
    let res = await this.axios.get('/lead-labels', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter
      }
    });
    return page(res.data);
  }

  async getLeadLabel(labelId: string) {
    let res = await this.axios.get(`/lead-labels/${pathId(labelId)}`);
    return entity(res.data);
  }

  async createLeadLabel(data: {
    name: string;
    interestStatusLabel: string;
    description?: string;
  }) {
    let res = await this.axios.post(
      '/lead-labels',
      pickDefined({
        label: data.name,
        interest_status_label: data.interestStatusLabel,
        description: data.description
      })
    );
    return entity(res.data);
  }

  async updateLeadLabel(
    labelId: string,
    data: { name?: string; interestStatusLabel?: string; description?: string }
  ) {
    let res = await this.axios.patch(
      `/lead-labels/${pathId(labelId)}`,
      pickDefined({
        label: data.name,
        interest_status_label: data.interestStatusLabel,
        description: data.description
      })
    );
    return entity(res.data);
  }

  async deleteLeadLabel(labelId: string) {
    let res = await this.axios.delete(`/lead-labels/${pathId(labelId)}`);
    return entity(res.data);
  }

  // ─── Block List Entries ─────────────────────────────────────

  async listBlockListEntries(params: { limit?: number; startingAfter?: string } = {}) {
    let res = await this.axios.get('/block-lists-entries', {
      params: {
        limit: params.limit,
        starting_after: params.startingAfter
      }
    });
    return page(res.data);
  }

  async createBlockListEntry(data: { entry: string; entry_type?: string }) {
    let res = await this.axios.post('/block-lists-entries', { bl_value: data.entry });
    return entity(res.data);
  }

  async deleteBlockListEntry(entryId: string) {
    let res = await this.axios.delete(`/block-lists-entries/${pathId(entryId)}`);
    return entity(res.data);
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
    return page(res.data);
  }

  async createCustomTag(data: { name: string }) {
    let res = await this.axios.post('/custom-tags', { label: data.name });
    return entity(res.data);
  }

  async deleteCustomTag(tagId: string) {
    let res = await this.axios.delete(`/custom-tags/${pathId(tagId)}`);
    return entity(res.data);
  }

  async toggleTagResource(data: {
    tagId: string;
    resourceIds: string[];
    assign: boolean;
    resourceType: 'account' | 'campaign';
  }) {
    let res = await this.axios.post('/custom-tags/toggle-resource', {
      tag_ids: [data.tagId],
      resource_type: data.resourceType === 'account' ? 1 : 2,
      resource_ids: data.resourceIds,
      assign: data.assign
    });
    return entity(res.data);
  }

  // ─── Account-Campaign Mappings ──────────────────────────────

  async listAccountCampaignMappings(
    email: string,
    params: { limit?: number; startingAfter?: string } = {}
  ) {
    let res = await this.axios.get(`/account-campaign-mappings/${pathId(email)}`, {
      params: { limit: params.limit, starting_after: params.startingAfter }
    });
    return page(res.data);
  }

  async getCurrentWorkspace() {
    let res = await this.axios.get('/workspaces/current');
    return entity(res.data);
  }

  async getBackgroundJob(jobId: string) {
    let res = await this.axios.get(`/background-jobs/${pathId(jobId)}`, {
      params: { data_fields: 'success_count,failed_count,total_to_process' }
    });
    return entity(res.data);
  }
}
