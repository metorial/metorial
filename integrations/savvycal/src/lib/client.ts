import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  after?: string;
  before?: string;
}

export interface PaginatedResponse<T> {
  entries: T[];
  metadata: {
    before: string | null;
    after: string | null;
    limit: number;
  };
}

export interface CreateEventParams {
  displayName: string;
  email: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  phoneNumber?: string;
  metadata?: Record<string, string>;
  fields?: Array<{ fieldId: string; value: string }>;
}

export interface CancelEventParams {
  cancelReason?: string;
}

export interface CreateLinkParams {
  name: string;
  slug?: string;
  privateName?: string;
  description?: string;
  defaultDuration?: number;
  durations?: number[];
  increment?: number;
  state?: 'active' | 'pending' | 'disabled';
}

export interface UpdateLinkParams {
  name?: string;
  slug?: string;
  privateName?: string;
  description?: string;
  defaultDuration?: number;
  durations?: number[];
  increment?: number;
  state?: 'active' | 'pending' | 'disabled';
}

export interface CreateWebhookParams {
  url: string;
}

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.savvycal.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Events ---

  async listEvents(
    params?: PaginationParams & {
      state?: string;
      period?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;
    if (params?.state) query.state = params.state;
    if (params?.period) query.period = params.period;

    let response = await this.api.get('/events', { params: query });
    return response.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let response = await this.api.get(`/events/${eventId}`);
    return response.data;
  }

  async createEvent(linkId: string, params: CreateEventParams): Promise<any> {
    let body: Record<string, any> = {
      display_name: params.displayName,
      email: params.email,
      start_at: params.startAt,
      end_at: params.endAt,
      time_zone: params.timeZone
    };

    if (params.phoneNumber) body.phone_number = params.phoneNumber;
    if (params.metadata) body.metadata = params.metadata;
    if (params.fields) {
      body.fields = params.fields.map(f => ({
        id: f.fieldId,
        value: f.value
      }));
    }

    let response = await this.api.post(`/links/${linkId}/events`, body);
    return response.data;
  }

  async cancelEvent(eventId: string, params?: CancelEventParams): Promise<any> {
    let body: Record<string, any> = {};
    if (params?.cancelReason) body.cancel_reason = params.cancelReason;

    let response = await this.api.post(`/events/${eventId}/cancel`, body);
    return response.data;
  }

  // --- Scheduling Links ---

  async listLinks(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;

    let response = await this.api.get('/links', { params: query });
    return response.data;
  }

  async getLink(linkId: string): Promise<any> {
    let response = await this.api.get(`/links/${linkId}`);
    return response.data;
  }

  async createLink(params: CreateLinkParams): Promise<any> {
    let body: Record<string, any> = {
      name: params.name
    };

    if (params.slug) body.slug = params.slug;
    if (params.privateName) body.private_name = params.privateName;
    if (params.description) body.description = params.description;
    if (params.defaultDuration) body.default_duration = params.defaultDuration;
    if (params.durations) body.durations = params.durations;
    if (params.increment) body.increment = params.increment;
    if (params.state) body.state = params.state;

    let response = await this.api.post('/links', body);
    return response.data;
  }

  async updateLink(linkId: string, params: UpdateLinkParams): Promise<any> {
    let body: Record<string, any> = {};

    if (params.name !== undefined) body.name = params.name;
    if (params.slug !== undefined) body.slug = params.slug;
    if (params.privateName !== undefined) body.private_name = params.privateName;
    if (params.description !== undefined) body.description = params.description;
    if (params.defaultDuration !== undefined) body.default_duration = params.defaultDuration;
    if (params.durations !== undefined) body.durations = params.durations;
    if (params.increment !== undefined) body.increment = params.increment;
    if (params.state !== undefined) body.state = params.state;

    let response = await this.api.patch(`/links/${linkId}`, body);
    return response.data;
  }

  async deleteLink(linkId: string): Promise<void> {
    await this.api.delete(`/links/${linkId}`);
  }

  async duplicateLink(linkId: string): Promise<any> {
    let response = await this.api.post(`/links/${linkId}/duplicate`);
    return response.data;
  }

  async getLinkSlots(linkId: string): Promise<any> {
    let response = await this.api.get(`/links/${linkId}/slots`);
    return response.data;
  }

  // --- Users ---

  async getMe(): Promise<any> {
    let response = await this.api.get('/me');
    return response.data;
  }

  // --- Workflows ---

  async listWorkflows(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;

    let response = await this.api.get('/workflows', { params: query });
    return response.data;
  }

  async listWorkflowRules(workflowId: string): Promise<any> {
    let response = await this.api.get(`/workflows/${workflowId}/rules`);
    return response.data;
  }

  // --- Webhooks ---

  async listWebhooks(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.after) query.after = params.after;
    if (params?.before) query.before = params.before;

    let response = await this.api.get('/webhooks', { params: query });
    return response.data;
  }

  async createWebhook(params: CreateWebhookParams): Promise<any> {
    let response = await this.api.post('/webhooks', { url: params.url });
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.api.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.api.delete(`/webhooks/${webhookId}`);
  }

  // --- Time Zones ---

  async listTimeZones(): Promise<any> {
    let response = await this.api.get('/time_zones');
    return response.data;
  }
}
