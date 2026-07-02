import { createAxios } from 'slates';

export class AblyRestClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(apiKey: string) {
    let encoded = Buffer.from(apiKey).toString('base64');
    this.axios = createAxios({
      baseURL: 'https://rest.ably.io',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Messages ---

  async publishMessage(
    channelId: string,
    message: {
      name?: string;
      data?: any;
      clientId?: string;
      id?: string;
      extras?: Record<string, any>;
    }
  ): Promise<{ channel: string; messageId: string }> {
    let response = await this.axios.post(
      `/channels/${encodeURIComponent(channelId)}/messages`,
      message
    );
    return response.data;
  }

  async batchPublish(
    specs: Array<{
      channels: string | string[];
      messages: any | any[];
    }>
  ): Promise<any[]> {
    let response = await this.axios.post('/messages', specs);
    return response.data;
  }

  async getMessageHistory(
    channelId: string,
    params?: {
      start?: string;
      end?: string;
      limit?: number;
      direction?: 'forwards' | 'backwards';
    }
  ): Promise<any[]> {
    let response = await this.axios.get(
      `/channels/${encodeURIComponent(channelId)}/messages`,
      { params }
    );
    return response.data;
  }

  // --- Presence ---

  async getPresence(
    channelId: string,
    params?: {
      clientId?: string;
      connectionId?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    let response = await this.axios.get(
      `/channels/${encodeURIComponent(channelId)}/presence`,
      { params }
    );
    return response.data;
  }

  async getPresenceHistory(
    channelId: string,
    params?: {
      start?: string;
      end?: string;
      limit?: number;
      direction?: 'forwards' | 'backwards';
    }
  ): Promise<any[]> {
    let response = await this.axios.get(
      `/channels/${encodeURIComponent(channelId)}/presence/history`,
      { params }
    );
    return response.data;
  }

  // --- Channel Metadata ---

  async getChannelStatus(channelId: string): Promise<any> {
    let response = await this.axios.get(`/channels/${encodeURIComponent(channelId)}`);
    return response.data;
  }

  async listChannels(params?: {
    limit?: number;
    prefix?: string;
    by?: 'id' | 'value';
  }): Promise<any[]> {
    let response = await this.axios.get('/channels', { params });
    return response.data;
  }

  // --- Statistics ---

  async getStatistics(params?: {
    start?: string;
    end?: string;
    limit?: number;
    direction?: 'forwards' | 'backwards';
    unit?: 'minute' | 'hour' | 'day' | 'month';
  }): Promise<any[]> {
    let response = await this.axios.get('/stats', { params });
    return response.data;
  }

  // --- Token Management ---

  async requestToken(
    keyName: string,
    tokenRequest?: {
      ttl?: number;
      capability?: Record<string, string[]>;
      clientId?: string;
      timestamp?: number;
      nonce?: string;
      mac?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/keys/${encodeURIComponent(keyName)}/requestToken`,
      tokenRequest || {}
    );
    return response.data;
  }

  async revokeTokens(
    keyName: string,
    params: {
      targets: string[];
      issuedBefore?: number;
      allowReauthMargin?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/keys/${encodeURIComponent(keyName)}/revokeTokens`,
      params
    );
    return response.data;
  }

  // --- Time ---

  async getTime(): Promise<number> {
    let response = await this.axios.get('/time');
    return response.data[0];
  }
}
