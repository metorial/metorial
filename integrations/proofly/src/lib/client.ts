import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://proofly.io/api',
      headers: {
        'X-Api-Key': config.token
      }
    });
  }

  async getUser() {
    let response = await this.axios.get('/user');
    return response.data;
  }

  async getActivityLogs() {
    let response = await this.axios.get('/activity');
    return response.data;
  }

  async listCampaigns() {
    let response = await this.axios.get('/campaigns');
    return response.data;
  }

  async getCampaignNotifications(campaignId: string) {
    let response = await this.axios.get(`/campaign/${campaignId}`);
    return response.data;
  }

  async toggleCampaign(campaignId: string) {
    let response = await this.axios.put(`/campaign/${campaignId}/toggle`);
    return response.data;
  }

  async getNotificationData(notificationId: string) {
    let response = await this.axios.get(`/notification/${notificationId}/data`);
    return response.data;
  }

  async createConversion(
    notificationId: string,
    conversionData: {
      email?: string;
      firstName?: string;
      lastName?: string;
      ip?: string;
      city?: string;
      country?: string;
      pageUrl?: string;
      [key: string]: unknown;
    }
  ) {
    let response = await this.axios.post(
      `/notification/${notificationId}/conversion`,
      conversionData
    );
    return response.data;
  }
}
