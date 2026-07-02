import { createAxios } from 'slates';

export interface VerificationResult {
  email: string;
  status: string;
  subStatus: string;
  domain: string;
  domainType: string;
  isRole: boolean;
  isFree: boolean;
  isDisposable: boolean;
  deliverabilityScore: number;
  mxRecords: string[];
  smtpProvider: string;
  suggestion: string | null;
}

export interface EmailList {
  listId: string;
  name: string;
  emailCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListVerificationSummary {
  listId: string;
  totalEmails: number;
  deliverable: number;
  undeliverable: number;
  risky: number;
  unknown: number;
  duplicates: number;
  status: string;
}

export interface Webhook {
  webhookId: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditBalance {
  available: number;
  used: number;
  autoRefillEnabled: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.verified.email/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  async verifyEmail(email: string): Promise<VerificationResult> {
    let response = await this.axios.get('/verify', {
      params: { email }
    });
    return response.data;
  }

  async getCredits(): Promise<CreditBalance> {
    let response = await this.axios.get('/credits');
    return response.data;
  }

  async getLists(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ lists: EmailList[]; total: number }> {
    let response = await this.axios.get('/lists', { params });
    return response.data;
  }

  async getList(listId: string): Promise<EmailList> {
    let response = await this.axios.get(`/lists/${listId}`);
    return response.data;
  }

  async createList(name: string, emails: string[]): Promise<EmailList> {
    let response = await this.axios.post('/lists', { name, emails });
    return response.data;
  }

  async verifyList(listId: string): Promise<ListVerificationSummary> {
    let response = await this.axios.post(`/lists/${listId}/verify`);
    return response.data;
  }

  async getListResults(
    listId: string,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ results: VerificationResult[]; total: number }> {
    let response = await this.axios.get(`/lists/${listId}/results`, { params });
    return response.data;
  }

  async deleteList(listId: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}`);
  }

  async getWebhooks(): Promise<Webhook[]> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(url: string, events: string[]): Promise<Webhook> {
    let response = await this.axios.post('/webhooks', { url, events });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    updates: {
      url?: string;
      events?: string[];
      enabled?: boolean;
    }
  ): Promise<Webhook> {
    let response = await this.axios.patch(`/webhooks/${webhookId}`, updates);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }
}
