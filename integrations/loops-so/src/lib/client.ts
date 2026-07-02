import { createAxios } from 'slates';

export interface ContactData {
  email?: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  subscribed?: boolean;
  userGroup?: string;
  userId?: string;
  mailingLists?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string | null;
  subscribed: boolean;
  userGroup: string | null;
  userId: string | null;
  mailingLists: Record<string, boolean>;
  optInStatus: string | null;
  [key: string]: unknown;
}

export interface ContactProperty {
  key: string;
  label: string;
  type: string;
}

export interface MailingList {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
}

export interface TransactionalEmail {
  id: string;
  name: string;
  dataVariables: string[];
  [key: string]: unknown;
}

export interface TransactionalEmailListResponse {
  pagination: {
    totalResults: number;
    returnedResults: number;
    hasMore: boolean;
    cursor: string | null;
  };
  emails: TransactionalEmail[];
}

export interface SendEventParams {
  email?: string;
  userId?: string;
  eventName: string;
  eventProperties?: Record<string, string | number | boolean>;
  mailingLists?: Record<string, boolean>;
  contactProperties?: Record<string, unknown>;
}

export interface SendTransactionalParams {
  email: string;
  transactionalId: string;
  addToAudience?: boolean;
  dataVariables?: Record<string, string | number>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: string;
  }>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.loops.so/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async verifyApiKey(): Promise<{ success: boolean; teamName: string }> {
    let response = await this.axios.get('/api-key');
    return response.data;
  }

  async createContact(data: ContactData): Promise<{ success: boolean; id: string }> {
    let response = await this.axios.post('/contacts/create', data);
    return response.data;
  }

  async updateContact(data: ContactData): Promise<{ success: boolean; id: string }> {
    let response = await this.axios.put('/contacts/update', data);
    return response.data;
  }

  async findContact(params: { email?: string; userId?: string }): Promise<Contact[]> {
    let queryParams: Record<string, string> = {};
    if (params.email) {
      queryParams.email = params.email;
    } else if (params.userId) {
      queryParams.userId = params.userId;
    }
    let response = await this.axios.get('/contacts/find', { params: queryParams });
    return response.data;
  }

  async deleteContact(params: {
    email?: string;
    userId?: string;
  }): Promise<{ success: boolean; message: string }> {
    let response = await this.axios.post('/contacts/delete', params);
    return response.data;
  }

  async listContactProperties(list: 'all' | 'custom' = 'all'): Promise<ContactProperty[]> {
    let response = await this.axios.get('/contacts/properties', { params: { list } });
    return response.data;
  }

  async createContactProperty(name: string, type: string): Promise<{ success: boolean }> {
    let response = await this.axios.post('/contacts/properties', { name, type });
    return response.data;
  }

  async listMailingLists(): Promise<MailingList[]> {
    let response = await this.axios.get('/lists');
    return response.data;
  }

  async sendEvent(params: SendEventParams): Promise<{ success: boolean }> {
    let { contactProperties, ...rest } = params;
    let body = { ...rest, ...contactProperties };
    let response = await this.axios.post('/events/send', body);
    return response.data;
  }

  async sendTransactionalEmail(
    params: SendTransactionalParams
  ): Promise<{ success: boolean }> {
    let apiParams = {
      ...params,
      attachments: params.attachments?.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        data: a.content
      }))
    };
    let response = await this.axios.post('/transactional', apiParams);
    return response.data;
  }

  async listTransactionalEmails(params?: {
    perPage?: number;
    cursor?: string;
  }): Promise<TransactionalEmailListResponse> {
    let response = await this.axios.get('/transactional', { params });
    let raw = response.data;
    return {
      pagination: raw.pagination,
      emails: raw.data
    };
  }
}
