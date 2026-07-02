import { createAxios } from 'slates';

export class BroadcastClient {
  private axios;

  constructor(private botToken: string) {
    this.axios = createAxios({
      baseURL: 'https://api2.botstar.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async broadcastMessage(userId: string, messages: Array<{ text: string }>): Promise<any> {
    let response = await this.axios.post(
      '/broadcast',
      {
        userId,
        messages
      },
      {
        params: { token: this.botToken }
      }
    );
    return response.data;
  }
}
