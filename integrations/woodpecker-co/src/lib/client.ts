import { createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ClientConfig {
  token: string;
  companyId?: string;
}

export class Client {
  private axios;

  constructor(private config: ClientConfig) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.woodpecker.co/rest',
      authHeader: { name: 'x-api-key', value: config.token },
      errorMapping: {
        extractResponseData: response => {
          let data = response.data;
          if (data?.status && typeof data.status === 'object') {
            return { ...data, ...data.status, message: data.status.msg };
          }
          return data;
        }
      }
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
      '/v1/add_prospects_list',
      { update: true, prospects },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async addProspectsToCampaign(campaignId: number, prospects: any[]): Promise<any> {
    let response = await this.axios.post(
      '/v1/add_prospects_campaign',
      { campaign: { campaign_id: campaignId }, update: true, prospects },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async updateProspectInCampaign(campaignId: number, prospects: any[]): Promise<any> {
    let response = await this.axios.post(
      '/v1/add_prospects_campaign',
      { campaign: { campaign_id: campaignId }, update: true, prospects },
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

  async getProspectResponses(prospectId: number, params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get(`/v2/prospects/${prospectId}/responses`, {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  // ─── Inbox ───────────────────────────────────────────────────

  async listInboxMessages(params?: Record<string, any>): Promise<any> {
    let { page = 1, ...query } = params ?? {};
    if (!Number.isInteger(page) || page < 1) {
      throw createApiServiceError('page must be a positive integer.', {
        reason: 'invalid_inbox_page'
      });
    }
    if (page > 1 && (query.next_page_cursor || query.previous_page_cursor)) {
      throw createApiServiceError('Use either page or a pagination cursor.', {
        reason: 'invalid_inbox_pagination'
      });
    }
    if (query.next_page_cursor && query.previous_page_cursor) {
      throw createApiServiceError('Use only one pagination cursor at a time.', {
        reason: 'invalid_inbox_pagination'
      });
    }
    for (let currentPage = 1; ; currentPage++) {
      let response = await this.axios.get('/v2/inbox/messages', {
        headers: this.getHeaders(),
        params: query
      });
      if (currentPage >= page) return response.data;
      let cursor = response.data?.pagination?.next_page_cursor;
      if (!cursor) {
        return {
          content: [],
          pagination: { next_page_cursor: null, previous_page_cursor: null }
        };
      }
      query.next_page_cursor = cursor;
    }
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
    let reportPaths: Record<string, string> = {
      complete_statistics: 'complete_statistics_for_each_level_of_campaign',
      general_statistics: 'campaigns',
      sent_messages: 'messages',
      open_rate: 'open_rate'
    };
    let path = reportPaths[reportName] ?? reportName;
    let response = await this.axios.post(`/v2/reports/${encodeURIComponent(path)}`, params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getReport(hash: string): Promise<any> {
    let response = await this.axios.get(`/v2/reports/${encodeURIComponent(hash)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Users ───────────────────────────────────────────────────

  async listUsers(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/v2/users', {
      params,
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
