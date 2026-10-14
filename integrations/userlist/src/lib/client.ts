import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

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
  company?: string;
  from?: string;
  subject?: string;
  body?: {
    type: 'html' | 'text' | 'multipart';
    content: string | Array<{ type: 'html' | 'text'; content: string }>;
  };
  sender?: string;
  topic?: string;
  theme?: string | boolean;
  reply_to?: string;
  preheader?: string;
  properties?: Record<string, unknown>;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Userlist Push API key is required.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://push.userlist.com',
      authHeader: { value: `Push ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Userlist',
          reason: 'userlist_api_error',
          nestedKeys: ['errors']
        })
    });
  }

  async createOrUpdateUser(payload: UserPayload) {
    if (!payload.identifier && !payload.email) {
      throw createApiServiceError('Provide an identifier or email address for the user.');
    }
    if (payload.preferences?.some(preference => preference.subscribed === undefined)) {
      throw createApiServiceError('Each subscription preference must include subscribed.');
    }
    let response = await this.axios.post('/users', payload);
    return response.data;
  }

  async deleteUser(identifier: { identifier?: string; email?: string }) {
    if (!identifier.identifier && !identifier.email) {
      throw createApiServiceError('Provide an identifier or email address for the user.');
    }
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
    if (!payload.user && !payload.company) {
      throw createApiServiceError('Provide a user or company identifier for the event.');
    }
    let response = await this.axios.post('/events', payload);
    return response.data;
  }

  async sendMessage(payload: MessagePayload) {
    let response = await this.axios.post('/messages', payload);
    return response.data;
  }
}
