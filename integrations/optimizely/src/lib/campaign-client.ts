import { createApiServiceError, createAxios } from 'slates';
import { optimizelyErrorMapping } from './api-errors';

export class CampaignClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(
    token: string,
    clientId: string,
    private campaignId?: number
  ) {
    this.axios = createAxios({
      errorMapping: optimizelyErrorMapping,
      timeout: 30000,
      baseURL: `https://api.campaign.episerver.net/rest/${encodeURIComponent(clientId)}`,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    });
  }

  async getCurrentUser() {
    let response = await this.axios.get('/users/authenticated');
    return response.data;
  }

  private mailingPath(mailingId?: number) {
    let base =
      this.campaignId === undefined
        ? '/mailings'
        : `/smartcampaigns/${this.campaignId}/messages`;
    return mailingId === undefined ? base : `${base}/${mailingId}`;
  }

  private mailingForm(data: Record<string, any>) {
    if (data.recipientListId !== undefined)
      throw createApiServiceError(
        'Configure the Smart Campaign recipient lists separately and omit recipientListId when campaignId is supplied.'
      );
    if (data.content !== undefined)
      throw createApiServiceError(
        'Use contentText for the Smart Campaign message content when campaignId is supplied.'
      );
    let form = new URLSearchParams();
    for (let [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null)
        form.set(key === 'contentText' ? 'content' : key, String(value));
    }
    return form.toString();
  }

  // Mailings
  async listMailings(params?: { page?: number; pageSize?: number }) {
    let response = await this.axios.get(
      this.mailingPath(),
      this.campaignId === undefined ? { params } : undefined
    );
    return response.data;
  }

  async getMailing(mailingId: number) {
    let response = await this.axios.get(this.mailingPath(mailingId));
    return response.data;
  }

  async createMailing(data: {
    name: string;
    subject?: string;
    senderAddress?: string;
    senderName?: string;
    recipientListId?: number;
    content?: Record<string, any>;
    contentText?: string;
    mediaType?: string;
  }) {
    let response = await this.axios.post(
      this.mailingPath(),
      this.campaignId === undefined
        ? data
        : this.mailingForm({ ...data, mediaType: data.mediaType ?? 'email' }),
      this.campaignId === undefined
        ? undefined
        : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  }

  async updateMailing(mailingId: number, data: Record<string, any>) {
    let response =
      this.campaignId === undefined
        ? await this.axios.put(this.mailingPath(mailingId), data)
        : await this.axios.post(this.mailingPath(mailingId), this.mailingForm(data), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
    return response.data;
  }

  async sendMailing(mailingId: number) {
    let response = await this.axios.post(
      `${this.mailingPath(mailingId)}/${this.campaignId === undefined ? 'send' : 'start'}`
    );
    return response.data;
  }

  async copyMailing(mailingId: number) {
    let response = await this.axios.post(`/mailings/${mailingId}/copy`);
    return response.data;
  }

  // Recipient Lists
  async listRecipientLists(params?: { page?: number; pageSize?: number }) {
    let response = await this.axios.get('/recipientlists', {
      params: {
        offset:
          params?.page === undefined
            ? undefined
            : (params.page - 1) * (params.pageSize ?? 100),
        limit: params?.pageSize
      }
    });
    return response.data;
  }

  async getRecipientList(listId: number) {
    let response = await this.axios.get(`/recipientlists/${listId}`);
    return response.data;
  }

  async createRecipientList(data: { name: string; description?: string }) {
    let response = await this.axios.post('/recipientlists', data);
    return response.data;
  }

  // Recipients
  async addRecipient(
    listId: number,
    data: { email: string; attributes?: Record<string, any> }
  ) {
    let form = new URLSearchParams({ recipientId: data.email, address: data.email });
    for (let [key, value] of Object.entries(data.attributes ?? {})) {
      if (value !== undefined && value !== null) form.set(`data.${key}`, String(value));
    }
    let response = await this.axios.post(`/recipients/${listId}`, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async removeRecipient(listId: number, recipientId: number | string) {
    let response = await this.axios.delete(
      `/recipients/${listId}/${encodeURIComponent(String(recipientId))}`
    );
    return response.data;
  }

  // Opt-in Processes
  async listOptInProcesses() {
    let response = await this.axios.get('/optinprocesses');
    return response.data;
  }

  // Target Groups
  async listTargetGroups() {
    let response = await this.axios.get('/targetgroups');
    return response.data;
  }

  async getTargetGroup(targetGroupId: number) {
    let response = await this.axios.get(`/targetgroups/${targetGroupId}`);
    return response.data;
  }

  // Webhooks
  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: { url: string; events: string[] }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async verifyWebhook(webhookId: number) {
    let response = await this.axios.post(`/webhooks/${webhookId}/verify`);
    return response.data;
  }

  async activateWebhook(webhookId: number) {
    let response = await this.axios.post(`/webhooks/${webhookId}/activate`);
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }
}
