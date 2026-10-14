import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.calendarhero.com',
      authHeader: { value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CalendarHero',
          reason: 'calendarhero_api'
        })
    });
  }

  // ── User ──────────────────────────────────────────────

  async getUser(): Promise<any> {
    let response = await this.axios.get('/user');
    return response.data;
  }

  // ── Meeting Types ─────────────────────────────────────

  async listMeetingTypes(params?: { onlyTypes?: boolean }): Promise<any> {
    let response = await this.axios.get('/user/meeting', { params });
    return response.data;
  }

  async createMeetingType(type: string): Promise<any> {
    let response = await this.axios.post(`/user/meeting/${encodeURIComponent(type)}`);
    return response.data;
  }

  async deleteMeetingType(type: string): Promise<any> {
    let response = await this.axios.delete(`/user/meeting/${encodeURIComponent(type)}`);
    return response.data;
  }

  // ── Meetings ──────────────────────────────────────────

  async listMeetings(params: { start: string; end: string }): Promise<any> {
    let response = await this.axios.get('/meeting', { params });
    return response.data;
  }

  async getMeetingCategories(params: { month: string }): Promise<any> {
    let response = await this.axios.get('/meeting/categories', { params });
    return response.data;
  }

  // ── Meeting Requests / Tasks ──────────────────────────

  async listMeetingRequests(params?: {
    state?: string;
    tally?: boolean;
    skip?: number;
    take?: number;
    type?: string;
  }): Promise<any> {
    let response = await this.axios.get('/meeting/tasks', { params });
    return response.data;
  }

  async createMeetingRequest(data: {
    contacts?: { id: string }[];
    contactEmails?: string[];
    subject: string;
    dateStart: string;
    dateEnd: string;
    meetingLength?: number;
    type?: string;
    locations?: { name: string }[];
    capacity?: number;
    description?: string;
  }): Promise<any> {
    let response = await this.axios.post('/meeting/tasks', data);
    return response.data;
  }

  async deleteMeetingRequest(requestId: string): Promise<any> {
    let response = await this.axios.delete(`/meeting/tasks/${encodeURIComponent(requestId)}`);
    return response.data;
  }

  async sendMeetingReminder(requestId: string): Promise<any> {
    let response = await this.axios.put(
      `/meeting/tasks/${encodeURIComponent(requestId)}/remind`
    );
    return response.data;
  }

  // ── Contacts ──────────────────────────────────────────

  async searchContacts(params?: {
    search?: string;
    filter?: string;
    all?: number;
    includeTeams?: number;
  }): Promise<any> {
    let response = await this.axios.get('/contact', { params });
    return response.data;
  }

  async createContact(data: {
    name?: string;
    title?: string;
    organization?: string;
    email: string[];
    defaultEmail?: string;
    telephone?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/contact', data);
    return response.data;
  }

  async getContact(contactId: string, params?: { basic?: boolean }): Promise<any> {
    let response = await this.axios.get(`/contact/${encodeURIComponent(contactId)}`, {
      params
    });
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      name?: string;
      title?: string;
      organization?: string;
      email: string[];
      defaultEmail?: string;
      telephone?: string[];
      providerId?: string[];
    }
  ): Promise<any> {
    let response = await this.axios.put(`/contact/${encodeURIComponent(contactId)}`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<any> {
    let response = await this.axios.delete(`/contact/${encodeURIComponent(contactId)}`);
    return response.data;
  }

  async getContactCount(): Promise<any> {
    let response = await this.axios.get('/contact/count');
    return response.data;
  }

  // ── Webhooks ──────────────────────────────────────────

  async getWebhook(event: string): Promise<any> {
    let response = await this.axios.get(`/webhook/${event}`);
    return response.data;
  }

  async createWebhook(event: string, hookUrl: string): Promise<any> {
    let response = await this.axios.post(`/webhook/${event}`, { hookUrl });
    return response.data;
  }

  async deleteWebhook(event: string): Promise<any> {
    let response = await this.axios.delete(`/webhook/${event}`);
    return response.data;
  }
}
