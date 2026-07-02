import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  companyId?: string;
}

export class Client {
  private axios;

  constructor(private config: ClientConfig) {
    this.axios = createAxios({
      baseURL: 'https://api.woodpecker.co/rest'
    });
  }

  private getHeaders(): Record<string, string> {
    let headers: Record<string, string> = {
      'x-api-key': this.config.token,
      'Content-Type': 'application/json'
    };
    if (this.config.companyId) {
      headers['x-company-id'] = this.config.companyId;
    }
    return headers;
  }

  // ─── Campaigns ───────────────────────────────────────────────

  async listCampaigns(): Promise<any[]> {
    let response = await this.axios.get('/v2/campaigns', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getCampaign(campaignId: number): Promise<any> {
    let response = await this.axios.get(`/v2/campaigns/${campaignId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createCampaign(data: any): Promise<any> {
    let response = await this.axios.post('/v2/campaigns', data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateCampaignSettings(campaignId: number, data: any): Promise<any> {
    let response = await this.axios.patch(`/v2/campaigns/${campaignId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteCampaign(campaignId: number): Promise<void> {
    await this.axios.delete(`/v2/campaigns/${campaignId}`, {
      headers: this.getHeaders()
    });
  }

  async changeCampaignStatus(
    campaignId: number,
    action: 'run' | 'pause' | 'stop' | 'editable'
  ): Promise<any> {
    let response = await this.axios.post(
      `/v2/campaigns/${campaignId}/${action}`,
      {},
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async getCampaignStatistics(campaignId: number): Promise<any> {
    let response = await this.axios.get(`/v2/campaigns/${campaignId}/statistics`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Campaign Steps ──────────────────────────────────────────

  async addCampaignStep(campaignId: number, data: any): Promise<any> {
    let response = await this.axios.post(`/v2/campaigns/${campaignId}/steps`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateCampaignStep(campaignId: number, stepId: number, data: any): Promise<any> {
    let response = await this.axios.patch(
      `/v2/campaigns/${campaignId}/steps/${stepId}`,
      data,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async deleteCampaignStep(campaignId: number, stepId: number): Promise<void> {
    await this.axios.delete(`/v2/campaigns/${campaignId}/steps/${stepId}`, {
      headers: this.getHeaders()
    });
  }

  // ─── Prospects ───────────────────────────────────────────────

  async searchProspects(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.get('/v1/prospects', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async addProspectsToDatabase(prospects: any[]): Promise<any> {
    let response = await this.axios.post(
      '/v1/prospects',
      { prospects },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async addProspectsToCampaign(campaignId: number, prospects: any[]): Promise<any> {
    let response = await this.axios.post(
      `/v1/campaigns/${campaignId}/prospects`,
      { prospects },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async updateProspectInCampaign(campaignId: number, prospects: any[]): Promise<any> {
    let response = await this.axios.post(
      `/v1/campaigns/${campaignId}/prospects`,
      { update: true, prospects },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async deleteProspects(prospectIds: number[]): Promise<void> {
    await this.axios.delete('/v1/prospects', {
      headers: this.getHeaders(),
      params: { id: prospectIds.join(',') }
    });
  }

  async getProspectResponses(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/v2/prospects/responses', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  // ─── Inbox ───────────────────────────────────────────────────

  async listInboxMessages(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/v2/inbox/messages', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async replyToInboxMessage(messageId: number, body: any): Promise<any> {
    let response = await this.axios.post(`/v2/inbox/messages/${messageId}/reply`, body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Mailboxes ───────────────────────────────────────────────

  async listMailboxes(): Promise<any[]> {
    let response = await this.axios.get('/v2/mailboxes', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getMailbox(mailboxId: number): Promise<any> {
    let response = await this.axios.get(`/v2/mailboxes/${mailboxId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateMailbox(mailboxId: number, data: any): Promise<any> {
    let response = await this.axios.patch(`/v2/mailboxes/${mailboxId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── LinkedIn Accounts ───────────────────────────────────────

  async listLinkedInAccounts(): Promise<any[]> {
    let response = await this.axios.get('/v2/linkedin_accounts', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Blacklist ───────────────────────────────────────────────

  async addBlacklistEmails(emails: string[]): Promise<any> {
    let response = await this.axios.post(
      '/v2/blacklist/emails',
      { emails },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async addBlacklistDomains(domains: string[]): Promise<any> {
    let response = await this.axios.post(
      '/v2/blacklist/domains',
      { domains },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async deleteBlacklistEmails(emails: string[]): Promise<any> {
    let response = await this.axios.delete('/v2/blacklist/emails', {
      headers: this.getHeaders(),
      data: { emails }
    });
    return response.data;
  }

  async deleteBlacklistDomains(domains: string[]): Promise<any> {
    let response = await this.axios.delete('/v2/blacklist/domains', {
      headers: this.getHeaders(),
      data: { domains }
    });
    return response.data;
  }

  // ─── Manual Tasks ────────────────────────────────────────────

  async getManualTasks(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/v2/manual_tasks', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async updateManualTask(taskId: number, action: 'done' | 'ignored'): Promise<any> {
    let response = await this.axios.patch(
      `/v2/manual_tasks/${taskId}/${action}`,
      {},
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  // ─── Reports ─────────────────────────────────────────────────

  async requestReport(reportName: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/v2/reports/${reportName}`, params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getReport(hash: string): Promise<any> {
    let response = await this.axios.get(`/v2/reports/${hash}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Users ───────────────────────────────────────────────────

  async listUsers(): Promise<any[]> {
    let response = await this.axios.get('/v1/users', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Webhooks ────────────────────────────────────────────────

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get('/v2/webhooks', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async subscribeWebhook(targetUrl: string, event: string): Promise<any> {
    let response = await this.axios.post(
      '/v1/webhooks/subscribe',
      {
        target_url: targetUrl,
        event
      },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async unsubscribeWebhook(targetUrl: string, event: string): Promise<any> {
    let response = await this.axios.post(
      '/v1/webhooks/unsubscribe',
      {
        target_url: targetUrl,
        event
      },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  // ─── Me ──────────────────────────────────────────────────────

  async getMe(): Promise<any> {
    let response = await this.axios.get('/v1/me', {
      headers: this.getHeaders()
    });
    return response.data;
  }
}
