import { createAxios } from 'slates';

export interface AircallAuth {
  token: string;
  authType: 'bearer' | 'basic';
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    count: number;
    total: number;
    currentPage: number;
    perPage: number;
    nextPageLink: string | null;
    previousPageLink: string | null;
  };
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(auth: AircallAuth) {
    let authHeader =
      auth.authType === 'bearer' ? `Bearer ${auth.token}` : `Basic ${auth.token}`;

    this.http = createAxios({
      baseURL: 'https://api.aircall.io/v1',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Calls ───

  async listCalls(
    params?: PaginationParams & {
      from?: number;
      to?: number;
      order?: 'asc' | 'desc';
      fetchContact?: boolean;
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/calls', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        from: params?.from,
        to: params?.to,
        order: params?.order,
        fetch_contact: params?.fetchContact
      }
    });
    return this.mapPaginatedResponse(response.data, 'calls');
  }

  async getCall(callId: number, options?: { fetchContact?: boolean }): Promise<any> {
    let response = await this.http.get(`/calls/${callId}`, {
      params: {
        fetch_contact: options?.fetchContact
      }
    });
    return response.data.call;
  }

  async searchCalls(params: {
    userId?: number;
    phoneNumber?: string;
    tags?: string[];
    contactId?: number;
    direction?: 'inbound' | 'outbound';
    from?: number;
    to?: number;
    order?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
    fetchContact?: boolean;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/calls/search', {
      params: {
        user_id: params.userId,
        phone_number: params.phoneNumber,
        tags: params.tags,
        contact_id: params.contactId,
        direction: params.direction,
        from: params.from,
        to: params.to,
        order: params.order,
        page: params.page,
        per_page: params.perPage,
        fetch_contact: params.fetchContact
      }
    });
    return this.mapPaginatedResponse(response.data, 'calls');
  }

  async transferCall(
    callId: number,
    target: {
      userId?: number;
      teamId?: number;
      number?: string;
      dispatchingStrategy?: 'simultaneous' | 'random' | 'longest_idle';
    }
  ): Promise<void> {
    let body: Record<string, any> = {};
    if (target.userId) body.user_id = target.userId;
    if (target.teamId) body.team_id = target.teamId;
    if (target.number) body.number = target.number;
    if (target.dispatchingStrategy) body.dispatching_strategy = target.dispatchingStrategy;

    await this.http.post(`/calls/${callId}/transfers`, body);
  }

  async commentOnCall(callId: number, content: string): Promise<any> {
    let response = await this.http.post(`/calls/${callId}/comments`, { content });
    return response.data.call;
  }

  async tagCall(callId: number, tagId: number): Promise<any> {
    let response = await this.http.post(`/calls/${callId}/tags`, { tag_id: tagId });
    return response.data.call;
  }

  async archiveCall(callId: number): Promise<any> {
    let response = await this.http.put(`/calls/${callId}/archive`);
    return response.data.call;
  }

  async unarchiveCall(callId: number): Promise<any> {
    let response = await this.http.put(`/calls/${callId}/unarchive`);
    return response.data.call;
  }

  async pauseRecording(callId: number): Promise<void> {
    await this.http.post(`/calls/${callId}/pause_recording`);
  }

  async resumeRecording(callId: number): Promise<void> {
    await this.http.post(`/calls/${callId}/resume_recording`);
  }

  async deleteRecording(callId: number): Promise<void> {
    await this.http.delete(`/calls/${callId}/recording`);
  }

  async deleteVoicemail(callId: number): Promise<void> {
    await this.http.delete(`/calls/${callId}/voicemail`);
  }

  // ─── Insight Cards ───

  async createInsightCard(
    callId: number,
    contents: Array<{
      type: 'title' | 'shortText';
      text: string;
      label?: string;
      link?: string;
    }>
  ): Promise<void> {
    await this.http.post(`/calls/${callId}/insight_cards`, { contents });
  }

  // ─── Users ───

  async listUsers(
    params?: PaginationParams & {
      from?: number;
      to?: number;
      order?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/users', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        from: params?.from,
        to: params?.to,
        order: params?.order
      }
    });
    return this.mapPaginatedResponse(response.data, 'users');
  }

  async getUser(userId: number): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data.user;
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    availabilityStatus?: string;
    roleIds?: string[];
    wrapUpTime?: number;
  }): Promise<any> {
    let response = await this.http.post('/users', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      availability_status: data.availabilityStatus,
      role_ids: data.roleIds,
      wrap_up_time: data.wrapUpTime
    });
    return response.data.user;
  }

  async updateUser(
    userId: number,
    data: {
      firstName?: string;
      lastName?: string;
      availabilityStatus?: string;
      substatus?: string;
      roleIds?: string[];
      wrapUpTime?: number;
    }
  ): Promise<any> {
    let response = await this.http.put(`/users/${userId}`, {
      first_name: data.firstName,
      last_name: data.lastName,
      availability_status: data.availabilityStatus,
      substatus: data.substatus,
      role_ids: data.roleIds,
      wrap_up_time: data.wrapUpTime
    });
    return response.data.user;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.http.delete(`/users/${userId}`);
  }

  async getUserAvailability(userId: number): Promise<any> {
    let response = await this.http.get(`/users/${userId}/availability`);
    return response.data;
  }

  async startOutboundCall(userId: number, numberId: number, to: string): Promise<any> {
    let response = await this.http.post(`/users/${userId}/calls`, {
      number_id: numberId,
      to
    });
    return response.data.call;
  }

  async dialPhone(userId: number, to: string): Promise<void> {
    await this.http.post(`/users/${userId}/dial`, { to });
  }

  // ─── Contacts ───

  async listContacts(
    params?: PaginationParams & {
      from?: number;
      to?: number;
      order?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/contacts', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        from: params?.from,
        to: params?.to,
        order: params?.order
      }
    });
    return this.mapPaginatedResponse(response.data, 'contacts');
  }

  async searchContacts(params: {
    phoneNumber?: string;
    email?: string;
    order?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/contacts/search', {
      params: {
        phone_number: params.phoneNumber,
        email: params.email,
        order: params.order,
        page: params.page,
        per_page: params.perPage
      }
    });
    return this.mapPaginatedResponse(response.data, 'contacts');
  }

  async getContact(contactId: number): Promise<any> {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data.contact;
  }

  async createContact(data: {
    firstName: string;
    lastName: string;
    companyName?: string;
    information?: string;
    phoneNumbers: Array<{ label: string; value: string }>;
    emails?: Array<{ label: string; value: string }>;
  }): Promise<any> {
    let response = await this.http.post('/contacts', {
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
      information: data.information,
      phone_numbers: data.phoneNumbers,
      emails: data.emails
    });
    return response.data.contact;
  }

  async updateContact(
    contactId: number,
    data: {
      firstName?: string;
      lastName?: string;
      companyName?: string;
      information?: string;
    }
  ): Promise<any> {
    let response = await this.http.put(`/contacts/${contactId}`, {
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
      information: data.information
    });
    return response.data.contact;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.http.delete(`/contacts/${contactId}`);
  }

  async addContactPhoneNumber(contactId: number, label: string, value: string): Promise<any> {
    let response = await this.http.post(`/contacts/${contactId}/phone_numbers`, {
      label,
      value
    });
    return response.data.contact;
  }

  async updateContactPhoneNumber(
    contactId: number,
    phoneId: number,
    label: string,
    value: string
  ): Promise<any> {
    let response = await this.http.put(`/contacts/${contactId}/phone_numbers/${phoneId}`, {
      label,
      value
    });
    return response.data.contact;
  }

  async deleteContactPhoneNumber(contactId: number, phoneId: number): Promise<any> {
    let response = await this.http.delete(`/contacts/${contactId}/phone_numbers/${phoneId}`);
    return response.data.contact;
  }

  async addContactEmail(contactId: number, label: string, value: string): Promise<any> {
    let response = await this.http.post(`/contacts/${contactId}/emails`, { label, value });
    return response.data.contact;
  }

  async updateContactEmail(
    contactId: number,
    emailId: number,
    label: string,
    value: string
  ): Promise<any> {
    let response = await this.http.put(`/contacts/${contactId}/emails/${emailId}`, {
      label,
      value
    });
    return response.data.contact;
  }

  async deleteContactEmail(contactId: number, emailId: number): Promise<any> {
    let response = await this.http.delete(`/contacts/${contactId}/emails/${emailId}`);
    return response.data.contact;
  }

  // ─── Numbers ───

  async listNumbers(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/numbers', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.mapPaginatedResponse(response.data, 'numbers');
  }

  async getNumber(numberId: number): Promise<any> {
    let response = await this.http.get(`/numbers/${numberId}`);
    return response.data.number;
  }

  async updateNumber(
    numberId: number,
    data: {
      name?: string;
      open?: boolean;
      timeZone?: string;
      priority?: number | null;
    }
  ): Promise<any> {
    let response = await this.http.put(`/numbers/${numberId}`, {
      name: data.name,
      open: data.open,
      time_zone: data.timeZone,
      priority: data.priority
    });
    return response.data.number;
  }

  // ─── Teams ───

  async listTeams(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/teams', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.mapPaginatedResponse(response.data, 'teams');
  }

  async getTeam(teamId: number): Promise<any> {
    let response = await this.http.get(`/teams/${teamId}`);
    return response.data.team;
  }

  async createTeam(name: string): Promise<any> {
    let response = await this.http.post('/teams', { name });
    return response.data.team;
  }

  async deleteTeam(teamId: number): Promise<void> {
    await this.http.delete(`/teams/${teamId}`);
  }

  async addUserToTeam(teamId: number, userId: number): Promise<any> {
    let response = await this.http.post(`/teams/${teamId}/users/${userId}`);
    return response.data.team;
  }

  async removeUserFromTeam(teamId: number, userId: number): Promise<any> {
    let response = await this.http.delete(`/teams/${teamId}/users/${userId}`);
    return response.data.team;
  }

  // ─── Tags ───

  async listTags(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/tags', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.mapPaginatedResponse(response.data, 'tags');
  }

  // ─── Messages ───

  async sendMessage(numberId: number, to: string, content: string): Promise<any> {
    let response = await this.http.post('/messages/send', {
      number_id: numberId,
      to,
      content
    });
    return response.data;
  }

  // ─── Webhooks ───

  async listWebhooks(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/webhooks', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.mapPaginatedResponse(response.data, 'webhooks');
  }

  async createWebhook(url: string, events?: string[], customName?: string): Promise<any> {
    let body: Record<string, any> = { url };
    if (events && events.length > 0) body.events = events;
    if (customName) body.custom_name = customName;

    let response = await this.http.post('/webhooks', body);
    return response.data.webhook;
  }

  async getWebhook(webhookId: number): Promise<any> {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data.webhook;
  }

  async updateWebhook(
    webhookId: number,
    data: {
      url?: string;
      events?: string[];
      customName?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.url) body.url = data.url;
    if (data.events) body.events = data.events;
    if (data.customName) body.custom_name = data.customName;

    let response = await this.http.put(`/webhooks/${webhookId}`, body);
    return response.data.webhook;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  // ─── Company ───

  async getCompany(): Promise<any> {
    let response = await this.http.get('/company');
    return response.data.company;
  }

  // ─── Helpers ───

  private mapPaginatedResponse(data: any, key: string): PaginatedResponse<any> {
    let meta = data.meta || {};
    return {
      items: data[key] || [],
      meta: {
        count: meta.count ?? 0,
        total: meta.total ?? 0,
        currentPage: meta.current_page ?? 1,
        perPage: meta.per_page ?? 20,
        nextPageLink: meta.next_page_link ?? null,
        previousPageLink: meta.previous_page_link ?? null
      }
    };
  }
}
