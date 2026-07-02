import { createAxios } from 'slates';

export interface NotificationOptions {
  title: string;
  body: string;
  sound?: string;
  channel?: string;
  link?: string;
  image?: string;
  timeSensitive?: boolean;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TeamManagementResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://push.techulus.com/api',
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async sendNotification(options: NotificationOptions): Promise<NotificationResponse> {
    let response = await this.axios.post('/v1/notify', options);
    return response.data;
  }

  async sendNotificationAsync(options: NotificationOptions): Promise<NotificationResponse> {
    let response = await this.axios.post('/v1/notify-async', options);
    return response.data;
  }

  async sendGroupNotification(
    groupId: string,
    options: NotificationOptions
  ): Promise<NotificationResponse> {
    let response = await this.axios.post(`/v1/notify/group/${groupId}`, options);
    return response.data;
  }

  async inviteTeamMember(teamApiKey: string, email: string): Promise<TeamManagementResponse> {
    let response = await this.axios.post('/management/v1/teams/invite', {
      team: teamApiKey,
      email
    });
    return response.data;
  }

  async removeTeamMember(teamApiKey: string, email: string): Promise<TeamManagementResponse> {
    let response = await this.axios.delete('/management/v1/teams/invite', {
      data: {
        team: teamApiKey,
        email
      }
    });
    return response.data;
  }
}
