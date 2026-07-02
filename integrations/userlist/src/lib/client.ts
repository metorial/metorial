import { createAxios } from 'slates';

export interface UserPayload {
  identifier?: string;
  email?: string;
  signed_up_at?: string;
  properties?: Record<string, unknown>;
  relationships?: Array<{
    company: string | Record<string, unknown>;
    properties?: Record<string, unknown>;
  }>;
  preferences?: Array<{
    topic: string;
    subscribed?: boolean;
  }>;
}

export interface CompanyPayload {
  identifier: string;
  name?: string;
  signed_up_at?: string;
  properties?: Record<string, unknown>;
  relationships?: Array<{
    user: string | Record<string, unknown>;
    properties?: Record<string, unknown>;
  }>;
}

export interface RelationshipPayload {
  user: string | Record<string, unknown>;
  company: string | Record<string, unknown>;
  properties?: Record<string, unknown>;
}

export interface EventPayload {
  name: string;
  user?: string | Record<string, unknown>;
  company?: string | Record<string, unknown>;
  occurred_at?: string;
  properties?: Record<string, unknown>;
}

export interface MessagePayload {
  template?: string;
  user?: string | Record<string, unknown>;
  to?: string;
  channel?: 'email' | 'web';
  subject?: string;
  body?: {
    type: 'text/html' | 'text/plain' | 'multipart';
    content?: string;
    html?: string;
    text?: string;
  };
  sender?: string;
  topic?: string;
  theme?: string | boolean;
  reply_to?: string;
  preheader?: string;
  properties?: Record<string, unknown>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://push.userlist.com',
      headers: {
        Authorization: `Push ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  async createOrUpdateUser(payload: UserPayload) {
    let response = await this.axios.post('/users', payload);
    return response.data;
  }

  async deleteUser(identifier: { identifier?: string; email?: string }) {
    let response = await this.axios.delete('/users', { data: identifier });
    return response.data;
  }

  async createOrUpdateCompany(payload: CompanyPayload) {
    let response = await this.axios.post('/companies', payload);
    return response.data;
  }

  async deleteCompany(identifier: string) {
    let response = await this.axios.delete('/companies', { data: { identifier } });
    return response.data;
  }

  async createOrUpdateRelationship(payload: RelationshipPayload) {
    let response = await this.axios.post('/relationships', payload);
    return response.data;
  }

  async deleteRelationship(user: string, company: string) {
    let response = await this.axios.delete('/relationships', { data: { user, company } });
    return response.data;
  }

  async trackEvent(payload: EventPayload) {
    let response = await this.axios.post('/events', payload);
    return response.data;
  }

  async sendMessage(payload: MessagePayload) {
    let response = await this.axios.post('/messages', payload);
    return response.data;
  }
}
