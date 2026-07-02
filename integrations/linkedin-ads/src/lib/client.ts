import { createAxios } from 'slates';

let API_VERSION = '202501';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.linkedin.com'
    });

    this.axios.interceptors.request.use((reqConfig: any) => {
      reqConfig.headers = reqConfig.headers || {};
      reqConfig.headers.Authorization = `Bearer ${config.token}`;
      reqConfig.headers['LinkedIn-Version'] = API_VERSION;
      reqConfig.headers['X-Restli-Protocol-Version'] = '2.0.0';
      return reqConfig;
    });
  }

  // ── Ad Accounts ──────────────────────────────────────────────────────

  async getAdAccounts(params?: {
    search?: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<LinkedInPagedResponse<AdAccount>> {
    let queryParams: Record<string, string> = {
      q: 'search'
    };
    if (params?.search) {
      queryParams['search.name.values[0]'] = params.search;
    }
    if (params?.pageSize) {
      queryParams.pageSize = String(params.pageSize);
    }
    if (params?.pageToken) {
      queryParams.pageToken = params.pageToken;
    }

    let response = await this.axios.get('/rest/adAccounts', { params: queryParams });
    return response.data as LinkedInPagedResponse<AdAccount>;
  }

  async getAdAccount(accountId: string): Promise<AdAccount> {
    let response = await this.axios.get(`/rest/adAccounts/${accountId}`);
    return response.data as AdAccount;
  }

  async updateAdAccount(accountId: string, updates: Partial<AdAccount>): Promise<void> {
    await this.axios.post(`/rest/adAccounts/${accountId}`, updates, {
      headers: { 'X-RestLi-Method': 'PARTIAL_UPDATE' }
    });
  }

  // ── Campaign Groups ──────────────────────────────────────────────────

  async getCampaignGroups(
    accountId: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<LinkedInPagedResponse<CampaignGroup>> {
    let queryParams: Record<string, string> = {
      q: 'search',
      'search.account.values[0]': `urn:li:sponsoredAccount:${accountId}`
    };
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await this.axios.get('/rest/adCampaignGroups', { params: queryParams });
    return response.data as LinkedInPagedResponse<CampaignGroup>;
  }

  async getCampaignGroup(campaignGroupId: string): Promise<CampaignGroup> {
    let response = await this.axios.get(`/rest/adCampaignGroups/${campaignGroupId}`);
    return response.data as CampaignGroup;
  }

  async createCampaignGroup(data: {
    account: string;
    name: string;
    status: string;
    runSchedule?: { start?: string; end?: string };
    totalBudget?: { amount: string; currencyCode: string };
  }): Promise<string> {
    let response = await this.axios.post('/rest/adCampaignGroups', data);
    let location = response.headers['x-restli-id'] || response.headers['x-linkedin-id'];
    return String(location);
  }

  async updateCampaignGroup(
    campaignGroupId: string,
    updates: Record<string, any>
  ): Promise<void> {
    await this.axios.post(`/rest/adCampaignGroups/${campaignGroupId}`, updates, {
      headers: { 'X-RestLi-Method': 'PARTIAL_UPDATE' }
    });
  }

  // ── Campaigns ────────────────────────────────────────────────────────

  async getCampaigns(
    accountId: string,
    params?: {
      campaignGroupId?: string;
      status?: string[];
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<LinkedInPagedResponse<Campaign>> {
    let queryParams: Record<string, string> = {
      q: 'search',
      'search.account.values[0]': `urn:li:sponsoredAccount:${accountId}`
    };
    if (params?.campaignGroupId) {
      queryParams['search.campaignGroup.values[0]'] =
        `urn:li:sponsoredCampaignGroup:${params.campaignGroupId}`;
    }
    if (params?.status) {
      params.status.forEach((s, i) => {
        queryParams[`search.status.values[${i}]`] = s;
      });
    }
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await this.axios.get('/rest/adCampaigns', { params: queryParams });
    return response.data as LinkedInPagedResponse<Campaign>;
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    let response = await this.axios.get(`/rest/adCampaigns/${campaignId}`);
    return response.data as Campaign;
  }

  async createCampaign(data: Record<string, any>): Promise<string> {
    let response = await this.axios.post('/rest/adCampaigns', data);
    let location = response.headers['x-restli-id'] || response.headers['x-linkedin-id'];
    return String(location);
  }

  async updateCampaign(campaignId: string, updates: Record<string, any>): Promise<void> {
    await this.axios.post(`/rest/adCampaigns/${campaignId}`, updates, {
      headers: { 'X-RestLi-Method': 'PARTIAL_UPDATE' }
    });
  }

  // ── Creatives ────────────────────────────────────────────────────────

  async getCreatives(
    campaignId: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<LinkedInPagedResponse<Creative>> {
    let queryParams: Record<string, string> = {
      q: 'search',
      'search.campaign.values[0]': `urn:li:sponsoredCampaign:${campaignId}`
    };
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await this.axios.get('/rest/creatives', { params: queryParams });
    return response.data as LinkedInPagedResponse<Creative>;
  }

  async getCreative(creativeId: string): Promise<Creative> {
    // creativeId is the full URN-encoded ID
    let response = await this.axios.get(`/rest/creatives/${encodeURIComponent(creativeId)}`);
    return response.data as Creative;
  }

  async createCreative(data: Record<string, any>): Promise<string> {
    let response = await this.axios.post('/rest/creatives', data);
    let location = response.headers['x-restli-id'] || response.headers['x-linkedin-id'];
    return String(location);
  }

  async updateCreative(creativeId: string, updates: Record<string, any>): Promise<void> {
    await this.axios.post(`/rest/creatives/${encodeURIComponent(creativeId)}`, updates, {
      headers: { 'X-RestLi-Method': 'PARTIAL_UPDATE' }
    });
  }

  // ── Ad Analytics ─────────────────────────────────────────────────────

  async getAdAnalytics(params: {
    pivot: string;
    dateRange: {
      start: { year: number; month: number; day: number };
      end: { year: number; month: number; day: number };
    };
    timeGranularity: string;
    accounts?: string[];
    campaigns?: string[];
    creatives?: string[];
    campaignGroups?: string[];
    fields?: string[];
  }): Promise<LinkedInPagedResponse<Record<string, any>>> {
    let queryParams: Record<string, string> = {
      q: 'analytics',
      pivot: params.pivot,
      'dateRange.start.day': String(params.dateRange.start.day),
      'dateRange.start.month': String(params.dateRange.start.month),
      'dateRange.start.year': String(params.dateRange.start.year),
      'dateRange.end.day': String(params.dateRange.end.day),
      'dateRange.end.month': String(params.dateRange.end.month),
      'dateRange.end.year': String(params.dateRange.end.year),
      timeGranularity: params.timeGranularity
    };

    if (params.fields && params.fields.length > 0) {
      queryParams.fields = params.fields.join(',');
    }

    if (params.accounts) {
      params.accounts.forEach((a, i) => {
        queryParams[`accounts[${i}]`] = a.startsWith('urn:')
          ? a
          : `urn:li:sponsoredAccount:${a}`;
      });
    }
    if (params.campaigns) {
      params.campaigns.forEach((c, i) => {
        queryParams[`campaigns[${i}]`] = c.startsWith('urn:')
          ? c
          : `urn:li:sponsoredCampaign:${c}`;
      });
    }
    if (params.creatives) {
      params.creatives.forEach((c, i) => {
        queryParams[`creatives[${i}]`] = c;
      });
    }
    if (params.campaignGroups) {
      params.campaignGroups.forEach((g, i) => {
        queryParams[`campaignGroups[${i}]`] = g.startsWith('urn:')
          ? g
          : `urn:li:sponsoredCampaignGroup:${g}`;
      });
    }

    let response = await this.axios.get('/rest/adAnalytics', { params: queryParams });
    return response.data as LinkedInPagedResponse<Record<string, any>>;
  }

  // ── Conversions ──────────────────────────────────────────────────────

  async getConversionRules(
    accountId: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<LinkedInPagedResponse<ConversionRule>> {
    let queryParams: Record<string, string> = {
      q: 'account',
      account: `urn:li:sponsoredAccount:${accountId}`
    };
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await this.axios.get('/rest/conversions', { params: queryParams });
    return response.data as LinkedInPagedResponse<ConversionRule>;
  }

  async createConversionRule(data: {
    name: string;
    account: string;
    conversionMethod: string;
    postClickAttributionWindowSize?: number;
    viewThroughAttributionWindowSize?: number;
    attributionType?: string;
    type: string;
  }): Promise<string> {
    let response = await this.axios.post('/rest/conversions', data);
    let location = response.headers['x-restli-id'] || response.headers['x-linkedin-id'];
    return String(location);
  }

  async sendConversionEvents(
    data: {
      conversion: string;
      conversionHappenedAt: number;
      conversionValue?: { currencyCode: string; amount: string };
      eventId?: string;
      user?: {
        userIds?: Array<{ idType: string; idValue: string }>;
        userInfo?: {
          firstName?: string;
          lastName?: string;
          companyName?: string;
          title?: string;
          countryCode?: string;
        };
      };
    }[]
  ): Promise<void> {
    await this.axios.post('/rest/conversionEvents', {
      elements: data
    });
  }

  // ── Lead Gen Forms ───────────────────────────────────────────────────

  async getLeadForms(
    accountId: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<LinkedInPagedResponse<LeadForm>> {
    let queryParams: Record<string, string> = {
      q: 'owner',
      owner: `urn:li:sponsoredAccount:${accountId}`
    };
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await this.axios.get('/rest/leadForms', { params: queryParams });
    return response.data as LinkedInPagedResponse<LeadForm>;
  }

  async getLeadFormResponses(params: {
    leadFormId?: string;
    accountId?: string;
    startTime?: number;
    endTime?: number;
    pageSize?: number;
    pageToken?: string;
  }): Promise<LinkedInPagedResponse<LeadFormResponse>> {
    let queryParams: Record<string, string> = {};

    if (params.leadFormId) {
      queryParams.q = 'owner';
      queryParams.owner = params.leadFormId.startsWith('urn:')
        ? params.leadFormId
        : `urn:li:leadGenForm:${params.leadFormId}`;
    } else if (params.accountId) {
      queryParams.q = 'account';
      queryParams.account = `urn:li:sponsoredAccount:${params.accountId}`;
    }

    if (params.startTime) queryParams.submittedAtStart = String(params.startTime);
    if (params.endTime) queryParams.submittedAtEnd = String(params.endTime);
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params.pageToken) queryParams.pageToken = params.pageToken;

    let response = await this.axios.get('/rest/leadFormResponses', { params: queryParams });
    return response.data as LinkedInPagedResponse<LeadFormResponse>;
  }

  // ── Images ───────────────────────────────────────────────────────────

  async initializeImageUpload(ownerId: string): Promise<{
    uploadUrl: string;
    image: string;
  }> {
    let response = await this.axios.post('/rest/images?action=initializeUpload', {
      initializeUploadRequest: {
        owner: ownerId
      }
    });
    let data = response.data as { value: { uploadUrl: string; image: string } };
    return data.value;
  }

  // ── Generic helper ───────────────────────────────────────────────────

  async get(path: string, params?: Record<string, string>): Promise<any> {
    let response = await this.axios.get(path, { params });
    return response.data;
  }

  async post(path: string, data?: any, headers?: Record<string, string>): Promise<any> {
    let response = await this.axios.post(path, data, { headers });
    return response.data;
  }
}

// ── Types ────────────────────────────────────────────────────────────────

export interface LinkedInPagedResponse<T> {
  elements: T[];
  paging?: {
    count: number;
    start: number;
    total?: number;
    links?: Array<{ rel: string; href: string }>;
  };
  metadata?: Record<string, any>;
}

export interface AdAccount {
  id: number;
  name: string;
  status: string;
  type: string;
  currency: string;
  reference: string;
  servingStatuses?: string[];
  totalBudget?: { amount: string; currencyCode: string };
  totalBudgetEnds?: number;
  created?: number;
  lastModified?: number;
  notifiedOnCreativeApproval?: boolean;
  notifiedOnCreativeRejection?: boolean;
  notifiedOnEndOfCampaign?: boolean;
  [key: string]: any;
}

export interface CampaignGroup {
  id: number;
  name: string;
  account: string;
  status: string;
  runSchedule?: { start?: number; end?: number };
  totalBudget?: { amount: string; currencyCode: string };
  created?: number;
  lastModified?: number;
  [key: string]: any;
}

export interface Campaign {
  id: number;
  name: string;
  account: string;
  campaignGroup: string;
  status: string;
  objectiveType: string;
  type: string;
  costType: string;
  dailyBudget?: { amount: string; currencyCode: string };
  totalBudget?: { amount: string; currencyCode: string };
  unitCost?: { amount: string; currencyCode: string };
  runSchedule?: { start?: number; end?: number };
  targetingCriteria?: Record<string, any>;
  creativeSelection?: string;
  format?: string;
  locale?: { country: string; language: string };
  optimizationTargetType?: string;
  audienceExpansionEnabled?: boolean;
  offsiteDeliveryEnabled?: boolean;
  created?: number;
  lastModified?: number;
  servingStatuses?: string[];
  [key: string]: any;
}

export interface Creative {
  id: string;
  campaign: string;
  account: string;
  intendedStatus: string;
  content?: Record<string, any>;
  servingStatuses?: string[];
  created?: number;
  lastModified?: number;
  isTest?: boolean;
  [key: string]: any;
}

export interface ConversionRule {
  id: number;
  name: string;
  account: string;
  conversionMethod: string;
  type: string;
  postClickAttributionWindowSize?: number;
  viewThroughAttributionWindowSize?: number;
  attributionType?: string;
  enabled?: boolean;
  created?: number;
  lastModified?: number;
  [key: string]: any;
}

export interface LeadForm {
  id: number;
  name: string;
  account: string;
  status: string;
  headline?: string;
  description?: string;
  privacyPolicyUrl?: string;
  thankYouMessage?: string;
  questions?: Array<{
    predefinedField?: string;
    customQuestionText?: string;
    required?: boolean;
  }>;
  created?: number;
  lastModified?: number;
  [key: string]: any;
}

export interface LeadFormResponse {
  id: string;
  owner: string;
  leadForm: string;
  submittedAt: number;
  formResponse?: {
    answers: Array<{
      questionId?: string;
      answerDetails?: { textQuestionAnswer?: { answer: string } };
    }>;
  };
  associatedEntity?: string;
  versionedLeadGenFormUrn?: string;
  [key: string]: any;
}
