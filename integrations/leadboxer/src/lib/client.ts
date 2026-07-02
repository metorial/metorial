import { createAxios } from 'slates';

export interface LeadFilters {
  search?: string;
  limit?: number;
  period?: string;
  sortBy?: string;
  email?: string;
}

export interface TrackEventParams {
  title: string;
  email?: string;
  userId?: string;
  sessionId?: string;
  leadboxerUserId?: string;
  url?: string;
  referrer?: string;
  ip?: string;
  proxy?: boolean;
  customProperties?: Record<string, string>;
}

export interface TagUpdateParams {
  leadboxerUserId: string;
  tags: string;
  action?: 'add' | 'remove';
}

export class LeadBoxerClient {
  private dataApi: ReturnType<typeof createAxios>;
  private legacyApi: ReturnType<typeof createAxios>;
  private trackingApi: ReturnType<typeof createAxios>;

  constructor(
    private config: {
      token: string;
      datasetId: string;
    }
  ) {
    this.dataApi = createAxios({
      baseURL: 'https://data.leadboxer.com',
      headers: {
        'x-api-key': config.token
      }
    });

    this.legacyApi = createAxios({
      baseURL: 'https://kibana.leadboxer.com'
    });

    this.trackingApi = createAxios({
      baseURL: 'https://log.leadboxer.com'
    });
  }

  async getLeads(filters: LeadFilters = {}): Promise<any[]> {
    let params: Record<string, string> = {
      apiKey: this.config.token,
      site: this.config.datasetId,
      dataType: 'json',
      noShortenEmail: 'true'
    };

    if (filters.search) params.search = filters.search;
    else params.search = '*';

    if (filters.limit) params.limit = String(filters.limit);
    if (filters.period) params.period = filters.period;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.email) params.email = filters.email;

    let response = await this.legacyApi.get('/api/views/c_view_leads', { params });
    return response.data;
  }

  async getLeadDetail(leadId: string): Promise<any> {
    let params: Record<string, string> = {
      leadId,
      site: this.config.datasetId
    };

    let response = await this.legacyApi.get('/api/views/lead_detail', { params });
    return response.data;
  }

  async getLeadSessions(leadId: string): Promise<any> {
    let response = await this.dataApi.get(`/v1/leads/${encodeURIComponent(leadId)}/sessions`, {
      params: { site: this.config.datasetId }
    });
    return response.data;
  }

  async getLeadEvents(leadId: string): Promise<any> {
    let response = await this.dataApi.get(`/v1/leads/${encodeURIComponent(leadId)}/events`, {
      params: { site: this.config.datasetId }
    });
    return response.data;
  }

  async lookupIp(ipAddress: string): Promise<any> {
    let response = await this.dataApi.get('/api/ip-lookup', {
      params: {
        ip: ipAddress,
        apiKey: this.config.token
      }
    });
    return response.data;
  }

  async lookupDomain(domain: string): Promise<any> {
    let response = await this.dataApi.get('/v1/domain-lookup', {
      params: {
        domain
      }
    });
    return response.data;
  }

  async trackEvent(params: TrackEventParams): Promise<any> {
    let queryParams: Record<string, string> = {
      si: this.config.datasetId,
      ti: params.title,
      json: 'true'
    };

    if (params.email) queryParams.email = params.email;
    if (params.userId) queryParams.userId = params.userId;
    if (params.sessionId) queryParams.sid = params.sessionId;
    if (params.leadboxerUserId) queryParams.uid = params.leadboxerUserId;
    if (params.url) queryParams.lc = params.url;
    if (params.referrer) queryParams.ref = params.referrer;
    if (params.ip) queryParams.ip = params.ip;
    if (params.proxy) queryParams.proxy = 'true';

    if (params.customProperties) {
      for (let [key, value] of Object.entries(params.customProperties)) {
        queryParams[key] = value;
      }
    }

    let response = await this.trackingApi.get('/', { params: queryParams });
    return response.data;
  }

  async updateLeadTags(params: TagUpdateParams): Promise<any> {
    let queryParams: Record<string, string> = {
      userId: params.leadboxerUserId,
      leadTags: params.tags
    };

    if (params.action) queryParams.action = params.action;

    let response = await this.legacyApi.get('/api/management/update_lead_tags', {
      params: queryParams
    });
    return response.data;
  }
}
