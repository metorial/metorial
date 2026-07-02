import { createAxios } from 'slates';
import { driftApiError } from './errors';

type DriftPagination = {
  more?: boolean;
  next?: string;
};

type DriftConversationPage = {
  conversations: any[];
  pagination?: DriftPagination;
};

type DriftMessagePage = {
  messages: any[];
  pagination?: DriftPagination;
};

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

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw driftApiError(error, operation);
    }
  }

  async createContact(attributes: Record<string, any>): Promise<any> {
    return await this.request('create contact', async () => {
      let response = await this.axios.post('/contacts', { attributes });
      return response.data?.data;
    });
  }

  async getContact(contactId: string): Promise<any> {
    return await this.request('get contact', async () => {
      let response = await this.axios.get(`/contacts/${contactId}`);
      return response.data?.data;
    });
  }

  async getContactsByEmail(email: string): Promise<any[]> {
    return await this.request('get contacts by email', async () => {
      let response = await this.axios.get('/contacts', {
        params: { email }
      });
      return response.data?.data || [];
    });
  }

  async updateContact(contactId: string, attributes: Record<string, any>): Promise<any> {
    return await this.request('update contact', async () => {
      let response = await this.axios.patch(`/contacts/${contactId}`, { attributes });
      return response.data?.data;
    });
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.request('delete contact', async () => {
      await this.axios.delete(`/contacts/${contactId}`);
    });
  }

  async postTimelineEvent(event: {
    contactId?: number;
    externalId?: string;
    event: string;
    createdAt?: number;
    attributes?: Record<string, any>;
  }): Promise<any> {
    return await this.request('post timeline event', async () => {
      let response = await this.axios.post('/contacts/timeline', event);
      return response.data?.data ?? response.data;
    });
  }

  async listCustomAttributes(): Promise<any[]> {
    return await this.request('list custom attributes', async () => {
      let response = await this.axios.get('/contacts/attributes');
      return response.data?.data?.properties || [];
    });
  }

  async createConversation(
    email: string,
    message: { body: string; attributes?: Record<string, any> }
  ): Promise<any> {
    return await this.request('create conversation', async () => {
      let response = await this.axios.post('/conversations/new', {
        email,
        message
      });
      return response.data?.data || response.data;
    });
  }

  async getConversation(conversationId: string): Promise<any> {
    return await this.request('get conversation', async () => {
      let response = await this.axios.get(`/conversations/${conversationId}`);
      return response.data?.data;
    });
  }

  async listConversations(
    params: { limit?: number; next?: string; statusId?: number[] } = {}
  ): Promise<DriftConversationPage> {
    return await this.request('list conversations', async () => {
      let queryParams: Record<string, any> = {};
      if (params.limit) queryParams.limit = params.limit;
      if (params.next) queryParams.next = params.next;
      if (params.statusId && params.statusId.length > 0) {
        queryParams.statusId = params.statusId;
      }

      let response = await this.axios.get('/conversations/list', {
        params: queryParams
      });
      return {
        conversations: response.data?.data || [],
        pagination: response.data?.pagination
      };
    });
  }

  async getConversationMessages(
    conversationId: string,
    next?: string
  ): Promise<DriftMessagePage> {
    return await this.request('get conversation messages', async () => {
      let params: Record<string, any> = {};
      if (next) params.next = next;

      let response = await this.axios.get(`/conversations/${conversationId}/messages`, {
        params
      });
      return {
        messages: response.data?.data?.messages || response.data?.data || [],
        pagination: response.data?.pagination
      };
    });
  }

  async getConversationTranscript(
    conversationId: string,
    format: 'formatted' | 'json'
  ): Promise<unknown> {
    return await this.request('get conversation transcript', async () => {
      let path =
        format === 'json'
          ? `/conversations/${conversationId}/json_transcript`
          : `/conversations/${conversationId}/transcript`;
      let response = await this.axios.get(path);
      return response.data?.data ?? response.data;
    });
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
    return await this.request('send message', async () => {
      let response = await this.axios.post(
        `/conversations/${conversationId}/messages`,
        message
      );
      return response.data?.data;
    });
  }

  async getConversationStats(): Promise<any> {
    return await this.request('get conversation stats', async () => {
      let response = await this.axios.get('/conversations/stats');
      return response.data?.data ?? response.data;
    });
  }

  async getUser(userId: string): Promise<any> {
    return await this.request('get user', async () => {
      let response = await this.axios.get(`/users/${userId}`);
      return response.data?.data;
    });
  }

  async listUsers(): Promise<any[]> {
    return await this.request('list users', async () => {
      let response = await this.axios.get('/users/list');
      return response.data?.data || [];
    });
  }

  async updateUser(userId: string, data: Record<string, any>): Promise<any> {
    return await this.request('update user', async () => {
      let response = await this.axios.patch('/users/update', data, {
        params: { userId }
      });
      return response.data?.data;
    });
  }

  async createAccount(account: {
    ownerId: number;
    name: string;
    domain?: string;
    accountId?: string;
    customProperties?: Array<{ label: string; name: string; value: any; type: string }>;
  }): Promise<any> {
    return await this.request('create account', async () => {
      let response = await this.axios.post('/accounts/create', account);
      return response.data?.data;
    });
  }

  async getAccount(accountId: string): Promise<any> {
    return await this.request('get account', async () => {
      let response = await this.axios.get(`/accounts/${accountId}`);
      return response.data?.data;
    });
  }

  async listAccounts(): Promise<any[]> {
    return await this.request('list accounts', async () => {
      let response = await this.axios.get('/accounts');
      return response.data?.data || [];
    });
  }

  async updateAccount(accountId: string, data: Record<string, any>): Promise<any> {
    return await this.request('update account', async () => {
      let response = await this.axios.patch('/accounts/update', {
        accountId,
        ...data
      });
      return response.data?.data;
    });
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.request('delete account', async () => {
      await this.axios.delete(`/accounts/${accountId}`);
    });
  }

  async getBookedMeetings(params: {
    minStartTime: number;
    maxStartTime: number;
    limit?: number;
  }): Promise<any[]> {
    return await this.request('get booked meetings', async () => {
      let response = await this.axios.get('/users/meetings/org', {
        params: {
          min_start_time: params.minStartTime,
          max_start_time: params.maxStartTime,
          ...(params.limit ? { limit: params.limit } : {})
        }
      });
      return response.data?.data || [];
    });
  }

  async listPlaybooks(): Promise<any[]> {
    return await this.request('list playbooks', async () => {
      let response = await this.axios.get('/playbooks');
      return response.data?.data || [];
    });
  }

  async listTeams(): Promise<any[]> {
    return await this.request('list teams', async () => {
      let response = await this.axios.get('/teams');
      return response.data?.data || [];
    });
  }

  async listUserTeams(userId: string): Promise<any[]> {
    return await this.request('list user teams', async () => {
      let response = await this.axios.get(`/teams/user/${userId}`);
      return response.data?.data || [];
    });
  }

  async getTokenInfo(accessToken: string): Promise<any> {
    return await this.request('get token info', async () => {
      let response = await this.axios.post('/app/token_info', {
        access_token: accessToken
      });
      return response.data?.data ?? response.data;
    });
  }
}
