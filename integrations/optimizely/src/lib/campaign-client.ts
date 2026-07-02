import { createAxios } from 'slates';

export class CampaignClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string, clientId: string) {
    this.axios = createAxios({
      baseURL: `https://api.campaign.optimizely.com/rest/v2/${clientId}`,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Mailings
  async listMailings(params?: { page?: number; pageSize?: number }) {
    let response = await this.axios.get('/mailings', { params });
    return response.data;
  }

  async getMailing(mailingId: number) {
    let response = await this.axios.get(`/mailings/${mailingId}`);
    return response.data;
  }

  async createMailing(data: {
    name: string;
    subject?: string;
    senderAddress?: string;
    senderName?: string;
    recipientListId?: number;
    content?: Record<string, any>;
  }) {
    let response = await this.axios.post('/mailings', data);
    return response.data;
  }

  async updateMailing(mailingId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/mailings/${mailingId}`, data);
    return response.data;
  }

  async sendMailing(mailingId: number) {
    let response = await this.axios.post(`/mailings/${mailingId}/send`);
    return response.data;
  }

  async copyMailing(mailingId: number) {
    let response = await this.axios.post(`/mailings/${mailingId}/copy`);
    return response.data;
  }

  // Recipient Lists
  async listRecipientLists(params?: { page?: number; pageSize?: number }) {
    let response = await this.axios.get('/recipientlists', { params });
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
    let response = await this.axios.post(`/recipientlists/${listId}/recipients`, data);
    return response.data;
  }

  async removeRecipient(listId: number, recipientId: number) {
    let response = await this.axios.delete(
      `/recipientlists/${listId}/recipients/${recipientId}`
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
