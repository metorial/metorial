import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class BroadcastClient {
  private axios;

  constructor(private botToken: string) {
    if (!botToken.trim()) throw createApiServiceError('A bot-level access token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api2.botstar.com',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BotStar Broadcast',
          reason: 'botstar_broadcast_api_error',
          parent: {},
          extractMessage: (upstreamError, helpers) =>
            helpers
              .extractMessage(upstreamError)
              .split(botToken)
              .join('[redacted]')
              .split(encodeURIComponent(botToken))
              .join('[redacted]')
        })
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
