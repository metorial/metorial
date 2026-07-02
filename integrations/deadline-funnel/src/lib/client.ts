import { createAxios } from 'slates';

export interface Campaign {
  campaignId: string;
  name: string;
  campaignType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portal {
  portalId: string;
  name: string;
  createdAt: string;
}

export interface CustomEvent {
  eventId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface FormSubmission {
  submissionId: string;
  portalId: string;
  email: string;
  name: string;
  createdAt: string;
}

export class DeadlineFunnelClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.deadlinefunnel.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Campaigns ----

  async listCampaigns(): Promise<Campaign[]> {
    let response = await this.axios.get('/campaigns');
    let data = response.data;
    let campaigns = Array.isArray(data) ? data : data?.campaigns || data?.data || [];
    return campaigns.map((c: any) => ({
      campaignId: String(c.id || c.campaign_id || ''),
      name: String(c.name || c.title || ''),
      campaignType: String(c.campaign_type || c.type || ''),
      status: String(c.status || 'active'),
      createdAt: String(c.created_at || c.createdAt || ''),
      updatedAt: String(c.updated_at || c.updatedAt || '')
    }));
  }

  // ---- Deadline Tracking ----

  async startDeadline(params: {
    campaignId: string;
    email: string;
    firstName?: string;
  }): Promise<{ success: boolean; email: string; campaignId: string }> {
    await this.axios.post(`/campaigns/${params.campaignId}/deadlines`, {
      email: params.email,
      first_name: params.firstName
    });
    return {
      success: true,
      email: params.email,
      campaignId: params.campaignId
    };
  }

  // ---- Sales Tracking ----

  async trackPurchase(params: {
    campaignId: string;
    email: string;
    amount: number;
    currency: string;
    firstName?: string;
  }): Promise<{
    success: boolean;
    email: string;
    campaignId: string;
    amount: number;
    currency: string;
  }> {
    await this.axios.post(`/campaigns/${params.campaignId}/sales`, {
      email: params.email,
      amount: params.amount,
      currency: params.currency,
      first_name: params.firstName
    });
    return {
      success: true,
      email: params.email,
      campaignId: params.campaignId,
      amount: params.amount,
      currency: params.currency
    };
  }

  // ---- Custom Events ----

  async createCustomEvent(params: {
    eventName: string;
    email: string;
    name?: string;
  }): Promise<{ success: boolean; eventName: string; email: string }> {
    await this.axios.post('/custom-events', {
      event_name: params.eventName,
      email: params.email,
      name: params.name
    });
    return {
      success: true,
      eventName: params.eventName,
      email: params.email
    };
  }

  async listCustomEvents(params?: {
    since?: string;
    page?: number;
    perPage?: number;
  }): Promise<CustomEvent[]> {
    let queryParams: Record<string, string> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.axios.get('/custom-events', { params: queryParams });
    let data = response.data;
    let events = Array.isArray(data)
      ? data
      : data?.events || data?.custom_events || data?.data || [];
    return events.map((e: any) => ({
      eventId: String(e.id || e.event_id || ''),
      name: String(e.name || e.event_name || ''),
      email: String(e.email || ''),
      createdAt: String(e.created_at || e.createdAt || '')
    }));
  }

  // ---- ConvertHub Portals ----

  async listPortals(params?: {
    since?: string;
    page?: number;
    perPage?: number;
  }): Promise<Portal[]> {
    let queryParams: Record<string, string> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.axios.get('/portals', { params: queryParams });
    let data = response.data;
    let portals = Array.isArray(data) ? data : data?.portals || data?.data || [];
    return portals.map((p: any) => ({
      portalId: String(p.id || p.portal_id || ''),
      name: String(p.name || p.title || ''),
      createdAt: String(p.created_at || p.createdAt || '')
    }));
  }

  // ---- ConvertHub Form Submissions ----

  async listFormSubmissions(params?: {
    portalId?: string;
    since?: string;
    page?: number;
    perPage?: number;
  }): Promise<FormSubmission[]> {
    let queryParams: Record<string, string> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let path = params?.portalId ? `/portals/${params.portalId}/submissions` : '/submissions';

    let response = await this.axios.get(path, { params: queryParams });
    let data = response.data;
    let submissions = Array.isArray(data) ? data : data?.submissions || data?.data || [];
    return submissions.map((s: any) => ({
      submissionId: String(s.id || s.submission_id || ''),
      portalId: String(s.portal_id || s.portalId || ''),
      email: String(s.email || ''),
      name: String(s.name || s.first_name || ''),
      createdAt: String(s.created_at || s.createdAt || '')
    }));
  }
}
