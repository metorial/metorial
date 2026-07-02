import { createAxios } from 'slates';

export class DriftClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://driftapi.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Contacts ──

  async createContact(attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/contacts', { attributes });
    return response.data?.data;
  }

  async getContact(contactId: string): Promise<any> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data?.data;
  }

  async getContactsByEmail(email: string): Promise<any[]> {
    let response = await this.axios.get('/contacts', {
      params: { email }
    });
    return response.data?.data || [];
  }

  async updateContact(contactId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/contacts/${contactId}`, { attributes });
    return response.data?.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}`);
  }

  async unsubscribeContact(contactId: string): Promise<void> {
    await this.axios.post(`/contacts/${contactId}/unsubscribe`);
  }

  async postTimelineEvent(contactId: string, event: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/contacts/${contactId}/timeline`, event);
    return response.data?.data;
  }

  async listCustomAttributes(): Promise<any[]> {
    let response = await this.axios.get('/contacts/attributes');
    return response.data?.data?.properties || [];
  }

  // ── Conversations ──

  async createConversation(
    email: string,
    message: { body: string; attributes?: Record<string, any> }
  ): Promise<any> {
    let response = await this.axios.post('/conversations/new', {
      email,
      message
    });
    return response.data?.data || response.data;
  }

  async getConversation(conversationId: string): Promise<any> {
    let response = await this.axios.get(`/conversations/${conversationId}`);
    return response.data?.data;
  }

  async listConversations(
    params: { limit?: number; next?: string; statusId?: number[] } = {}
  ): Promise<{ conversations: any[]; pagination?: { more: boolean; next: string } }> {
    let queryParams: Record<string, any> = {};
    if (params.limit) queryParams.limit = params.limit;
    if (params.next) queryParams.next = params.next;
    if (params.statusId && params.statusId.length > 0) {
      queryParams.statusId = params.statusId;
    }

    let response = await this.axios.get('/conversations/list', { params: queryParams });
    return {
      conversations: response.data?.data || [],
      pagination: response.data?.pagination
    };
  }

  async getConversationMessages(
    conversationId: string,
    next?: string
  ): Promise<{ messages: any[]; pagination?: { more: boolean; next: string } }> {
    let params: Record<string, any> = {};
    if (next) params.next = next;

    let response = await this.axios.get(`/conversations/${conversationId}/messages`, {
      params
    });
    return {
      messages: response.data?.data?.messages || response.data?.data || [],
      pagination: response.data?.pagination
    };
  }

  async getConversationTranscript(conversationId: string): Promise<any> {
    let response = await this.axios.get(`/conversations/${conversationId}/transcript`);
    return response.data?.data;
  }

  async getConversationAttachments(conversationId: string): Promise<any[]> {
    let response = await this.axios.get(`/conversations/${conversationId}/attachments`);
    return response.data?.data || [];
  }

  async sendMessage(
    conversationId: string,
    message: {
      type: 'chat' | 'private_note';
      body?: string;
      buttons?: Array<{
        label: string;
        value: string;
        type?: string;
        style?: string;
        reaction?: { type: string; message: string };
      }>;
      userId?: number;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/conversations/${conversationId}/messages`, message);
    return response.data?.data;
  }

  async bulkConversationStatuses(conversationIds: number[]): Promise<any> {
    let response = await this.axios.post('/conversations/statuses', {
      conversationIds
    });
    return response.data?.data;
  }

  // ── Users ──

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data?.data;
  }

  async listUsers(): Promise<any[]> {
    let response = await this.axios.get('/users/list');
    return response.data?.data || [];
  }

  async updateUser(userId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/users/update`, {
      userId: Number(userId),
      ...data
    });
    return response.data?.data;
  }

  // ── Accounts ──

  async createAccount(account: {
    ownerId: number;
    name: string;
    domain?: string;
    accountId?: string;
    customProperties?: Array<{ label: string; name: string; value: any; type: string }>;
  }): Promise<any> {
    let response = await this.axios.post('/accounts/create', account);
    return response.data?.data;
  }

  async getAccount(accountId: string): Promise<any> {
    let response = await this.axios.get(`/accounts/${accountId}`);
    return response.data?.data;
  }

  async listAccounts(): Promise<any[]> {
    let response = await this.axios.get('/accounts');
    return response.data?.data || [];
  }

  async updateAccount(accountId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/accounts/update`, {
      accountId,
      ...data
    });
    return response.data?.data;
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.axios.delete(`/accounts/${accountId}`);
  }

  // ── Meetings ──

  async getBookedMeetings(params: {
    minStartTime: number;
    maxStartTime: number;
    limit?: number;
  }): Promise<any[]> {
    let response = await this.axios.get('/users/meetings/org', {
      params: {
        min_start_time: params.minStartTime,
        max_start_time: params.maxStartTime,
        ...(params.limit ? { limit: params.limit } : {})
      }
    });
    return response.data?.data || [];
  }

  // ── Playbooks ──

  async listPlaybooks(): Promise<any[]> {
    let response = await this.axios.get('/playbooks');
    return response.data?.data || [];
  }

  // ── Teams ──

  async listTeams(): Promise<any[]> {
    let response = await this.axios.get('/teams');
    return response.data?.data || [];
  }

  async listUserTeams(userId: string): Promise<any[]> {
    let response = await this.axios.get(`/teams/user/${userId}`);
    return response.data?.data || [];
  }

  // ── Token Info ──

  async getTokenInfo(): Promise<any> {
    let response = await this.axios.get('/app/token');
    return response.data;
  }
}
