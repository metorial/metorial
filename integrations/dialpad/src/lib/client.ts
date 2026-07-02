import { createAxios } from 'slates';

export interface DialpadClientConfig {
  token: string;
  environment: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor?: string | null;
}

export class DialpadClient {
  private axios;

  constructor(config: DialpadClientConfig) {
    let baseURL =
      config.environment === 'sandbox'
        ? 'https://sandbox.dialpad.com/api/v2'
        : 'https://dialpad.com/api/v2';

    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Users ──────────────────────────────────────────

  async listUsers(params?: { cursor?: string; email?: string; state?: string }) {
    let response = await this.axios.get('/users', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  async createUser(data: {
    email: string;
    first_name?: string;
    last_name?: string;
    office_id?: number;
    license?: string;
  }) {
    let response = await this.axios.post('/users', data);
    return response.data;
  }

  async updateUser(userId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.axios.delete(`/users/${userId}`);
    return response.data;
  }

  async toggleDoNotDisturb(userId: string, enabled: boolean) {
    let response = await this.axios.patch(`/users/${userId}`, { do_not_disturb: enabled });
    return response.data;
  }

  // ── Contacts ───────────────────────────────────────

  async listContacts(params?: { cursor?: string; owner_id?: string }) {
    let response = await this.axios.get('/contacts', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: {
    first_name?: string;
    last_name?: string;
    phones?: string[];
    emails?: string[];
    company_name?: string;
    job_title?: string;
    urls?: string[];
    uid?: string;
  }) {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async createOrUpdateContact(data: {
    uid: string;
    first_name?: string;
    last_name?: string;
    phones?: string[];
    emails?: string[];
    company_name?: string;
    job_title?: string;
    urls?: string[];
  }) {
    let response = await this.axios.put('/contacts', data);
    return response.data;
  }

  // ── SMS ────────────────────────────────────────────

  async sendSms(data: {
    to_numbers: string[];
    text: string;
    user_id?: number;
    infer_country_code?: boolean;
    sender_group_type?: string;
    sender_group_id?: number;
  }) {
    let response = await this.axios.post('/sms', data);
    return response.data;
  }

  // ── Calls ──────────────────────────────────────────

  async initiateCall(
    userId: string,
    data: {
      phone_number?: string;
      user_id?: number;
      group_type?: string;
      group_id?: number;
      custom_data?: string;
    }
  ) {
    let response = await this.axios.post(`/users/${userId}/initiate_call`, data);
    return response.data;
  }

  async getCall(callId: string) {
    let response = await this.axios.get(`/calls/${callId}`);
    return response.data;
  }

  async listCalls(params?: {
    cursor?: string;
    started_after?: string;
    started_before?: string;
    target_type?: string;
    target_id?: string;
  }) {
    let response = await this.axios.get('/calls', { params });
    return response.data as PaginatedResponse<any>;
  }

  async hangupCall(callId: string) {
    let response = await this.axios.post(`/calls/${callId}/hangup`);
    return response.data;
  }

  async transferCall(
    callId: string,
    data: {
      phone_number?: string;
      user_id?: number;
      type?: string;
    }
  ) {
    let response = await this.axios.post(`/calls/${callId}/transfer`, data);
    return response.data;
  }

  async toggleCallRecording(callId: string, enabled: boolean) {
    let response = await this.axios.patch(`/calls/${callId}`, { is_recording: enabled });
    return response.data;
  }

  // ── Call Centers ───────────────────────────────────

  async listCallCenters(officeId: string, params?: { cursor?: string }) {
    let response = await this.axios.get(`/offices/${officeId}/callcenters`, { params });
    return response.data as PaginatedResponse<any>;
  }

  async getCallCenter(callCenterId: string) {
    let response = await this.axios.get(`/callcenters/${callCenterId}`);
    return response.data;
  }

  async createCallCenter(
    officeId: string,
    data: {
      name: string;
      description?: string;
    }
  ) {
    let response = await this.axios.post(`/offices/${officeId}/callcenters`, data);
    return response.data;
  }

  async updateCallCenter(callCenterId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/callcenters/${callCenterId}`, data);
    return response.data;
  }

  async deleteCallCenter(callCenterId: string) {
    let response = await this.axios.delete(`/callcenters/${callCenterId}`);
    return response.data;
  }

  async listCallCenterOperators(callCenterId: string, params?: { cursor?: string }) {
    let response = await this.axios.get(`/callcenters/${callCenterId}/operators`, { params });
    return response.data as PaginatedResponse<any>;
  }

  async addCallCenterOperator(
    callCenterId: string,
    data: { user_id: number; skill_level?: number }
  ) {
    let response = await this.axios.post(`/callcenters/${callCenterId}/operators`, data);
    return response.data;
  }

  async removeCallCenterOperator(callCenterId: string, operatorId: string) {
    let response = await this.axios.delete(
      `/callcenters/${callCenterId}/operators/${operatorId}`
    );
    return response.data;
  }

  // ── Departments ────────────────────────────────────

  async listDepartments(officeId: string, params?: { cursor?: string }) {
    let response = await this.axios.get(`/offices/${officeId}/departments`, { params });
    return response.data as PaginatedResponse<any>;
  }

  async getDepartment(departmentId: string) {
    let response = await this.axios.get(`/departments/${departmentId}`);
    return response.data;
  }

  // ── Offices ────────────────────────────────────────

  async listOffices(params?: { cursor?: string }) {
    let response = await this.axios.get('/offices', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getOffice(officeId: string) {
    let response = await this.axios.get(`/offices/${officeId}`);
    return response.data;
  }

  // ── Phone Numbers ──────────────────────────────────

  async listNumbers(params?: { cursor?: string; target_type?: string; target_id?: string }) {
    let response = await this.axios.get('/numbers', { params });
    return response.data as PaginatedResponse<any>;
  }

  async assignNumber(data: { number: string; target_type: string; target_id: number }) {
    let response = await this.axios.post('/numbers/assign', data);
    return response.data;
  }

  async unassignNumber(data: { number: string; target_type: string; target_id: number }) {
    let response = await this.axios.post('/numbers/unassign', data);
    return response.data;
  }

  // ── Blocked Numbers ────────────────────────────────

  async listBlockedNumbers(params?: { cursor?: string }) {
    let response = await this.axios.get('/blockednumbers', { params });
    return response.data as PaginatedResponse<any>;
  }

  async blockNumber(data: { phone_number: string }) {
    let response = await this.axios.post('/blockednumbers', data);
    return response.data;
  }

  async unblockNumber(numberId: string) {
    let response = await this.axios.delete(`/blockednumbers/${numberId}`);
    return response.data;
  }

  // ── Webhooks & Subscriptions ───────────────────────

  async createWebhook(data: { hook_url: string; secret?: string }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createCallEventSubscription(data: {
    webhook_id: number;
    call_states?: string[];
    target_type?: string;
    target_id?: number;
    enabled?: boolean;
  }) {
    let response = await this.axios.post('/subscriptions/call', data);
    return response.data;
  }

  async deleteCallEventSubscription(subscriptionId: string) {
    let response = await this.axios.delete(`/subscriptions/call/${subscriptionId}`);
    return response.data;
  }

  async createSmsEventSubscription(data: {
    webhook_id: number;
    sms_direction: string;
    target_type?: string;
    target_id?: number;
    enabled?: boolean;
  }) {
    let response = await this.axios.post('/subscriptions/sms', data);
    return response.data;
  }

  async deleteSmsEventSubscription(subscriptionId: string) {
    let response = await this.axios.delete(`/subscriptions/sms/${subscriptionId}`);
    return response.data;
  }

  async createContactEventSubscription(data: { endpoint_id: number; enabled?: boolean }) {
    let response = await this.axios.post('/subscriptions/contact', data);
    return response.data;
  }

  async deleteContactEventSubscription(subscriptionId: string) {
    let response = await this.axios.delete(`/subscriptions/contact/${subscriptionId}`);
    return response.data;
  }

  // ── Company ────────────────────────────────────────

  async getCompany() {
    let response = await this.axios.get('/company');
    return response.data;
  }

  // ── Stats ──────────────────────────────────────────

  async initiateStats(data: {
    stat_type: string;
    days_ago_start: number;
    days_ago_end: number;
    target_type?: string;
    target_id?: number;
    timezone?: string;
    export_type?: string;
  }) {
    let response = await this.axios.post('/stats', data);
    return response.data;
  }

  async getStats(requestId: string) {
    let response = await this.axios.get(`/stats/${requestId}`);
    return response.data;
  }

  // ── Meetings ───────────────────────────────────────

  async listMeetings(params?: { cursor?: string }) {
    let response = await this.axios.get('/meetings', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getMeeting(meetingId: string) {
    let response = await this.axios.get(`/meetings/${meetingId}`);
    return response.data;
  }

  async createMeeting(data: {
    name: string;
    description?: string;
    start_time?: string;
    end_time?: string;
  }) {
    let response = await this.axios.post('/meetings', data);
    return response.data;
  }

  async deleteMeeting(meetingId: string) {
    let response = await this.axios.delete(`/meetings/${meetingId}`);
    return response.data;
  }
}
