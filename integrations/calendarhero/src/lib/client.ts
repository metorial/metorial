import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.calendarhero.com',
      headers: {
        Authorization: token
      }
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
    contacts: Array<{ email: string; name?: string }>;
    subject?: string;
    dateStart: string;
    dateEnd: string;
    meetingLength?: number;
    type?: string;
    locations?: string[];
    capacity?: number;
  }): Promise<any> {
    let response = await this.axios.post('/meeting/tasks', data);
    return response.data;
  }

  async deleteMeetingRequest(requestId: string): Promise<any> {
    let response = await this.axios.delete(`/meeting/tasks/${requestId}`);
    return response.data;
  }

  async sendMeetingReminder(requestId: string): Promise<any> {
    let response = await this.axios.put(`/meeting/tasks/${requestId}/remind`);
    return response.data;
  }

  // ── Contacts ──────────────────────────────────────────

  async searchContacts(params?: {
    search?: string;
    filter?: string;
    all?: boolean;
    includeTeams?: boolean;
  }): Promise<any> {
    let response = await this.axios.get('/contact', { params });
    return response.data;
  }

  async createContact(data: {
    name: string;
    title?: string;
    organization?: string;
    email?: string[];
    telephone?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/contact', data);
    return response.data;
  }

  async getContact(contactId: string, params?: { basic?: boolean }): Promise<any> {
    let response = await this.axios.get(`/contact/${contactId}`, { params });
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      name?: string;
      title?: string;
      organization?: string;
      email?: string[];
      telephone?: string[];
      providerId?: string;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/contact/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<any> {
    let response = await this.axios.delete(`/contact/${contactId}`);
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
