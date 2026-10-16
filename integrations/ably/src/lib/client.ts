import { randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue
} from 'slates';
import { ablyError, requireAblyAuth } from './errors';
import { validateQuery } from './validation';

export class AblyRestClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(apiKey: string, authType?: string) {
    requireAblyAuth(apiKey, authType, 'api_key');
    let encoded = Buffer.from(apiKey).toString('base64');
    this.axios = createAuthenticatedAxios({
      errorAdapter: ablyError,
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
      encoding?: string;
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
    },
    page?: string
  ): Promise<AblyPage> {
    return this.getPage(`/channels/${encodeURIComponent(channelId)}/messages`, params, page);
  }

  // --- Presence ---

  async getPresence(
    channelId: string,
    params?: {
      clientId?: string;
      connectionId?: string;
      limit?: number;
    },
    page?: string
  ): Promise<AblyPage> {
    return this.getPage(`/channels/${encodeURIComponent(channelId)}/presence`, params, page);
  }

  async getPresenceHistory(
    channelId: string,
    params?: {
      start?: string;
      end?: string;
      limit?: number;
      direction?: 'forwards' | 'backwards';
    },
    page?: string
  ): Promise<AblyPage> {
    return this.getPage(
      `/channels/${encodeURIComponent(channelId)}/presence/history`,
      params,
      page
    );
  }

  // --- Channel Metadata ---

  async getChannelStatus(channelId: string): Promise<any> {
    let response = await this.axios.get(`/channels/${encodeURIComponent(channelId)}`);
    return response.data;
  }

  async listChannels(
    params?: {
      limit?: number;
      prefix?: string;
      by?: 'id' | 'value';
    },
    page?: string
  ): Promise<AblyPage> {
    return this.getPage('/channels', params, page);
  }

  // --- Statistics ---

  async getStatistics(
    params?: {
      start?: string;
      end?: string;
      limit?: number;
      direction?: 'forwards' | 'backwards';
      unit?: 'minute' | 'hour' | 'day' | 'month';
    },
    page?: string
  ): Promise<AblyPage> {
    return this.getPage('/stats', params, page);
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
    let response = await this.axios.post(`/keys/${encodeURIComponent(keyName)}/requestToken`, {
      ...tokenRequest,
      keyName,
      timestamp: tokenRequest?.timestamp ?? Date.now(),
      nonce: tokenRequest?.nonce ?? randomBytes(16).toString('hex'),
      capability:
        tokenRequest?.capability === undefined
          ? undefined
          : JSON.stringify(
              Object.fromEntries(
                Object.entries(tokenRequest.capability)
                  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                  .map(([resource, operations]) => [resource, [...operations].sort()])
              )
            )
    });
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

  private async getPage(
    path: string,
    params?: Record<string, unknown>,
    page?: string
  ): Promise<AblyPage> {
    if (!page) validateQuery(params ?? {});
    let url = this.pageUrl(path, page ?? path);
    let response = await this.axios.get(url, { params: page ? undefined : params });
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Ably returned an invalid paginated response.');
    }
    let link = getResponseHeaderValue(response.headers, 'link');
    let next = link?.match(/<([^>]+)>;\s*rel="?next"?/i)?.[1];
    return {
      items: response.data,
      nextPageUrl: next ? this.pageUrl(path, next, url) : undefined
    };
  }

  private pageUrl(path: string, value: string, currentUrl?: string) {
    let url: URL;
    try {
      url = new URL(value, currentUrl ?? `https://rest.ably.io${path}`);
    } catch {
      throw createApiServiceError('page must be a nextPageUrl returned by this operation.');
    }
    if (
      url.origin !== 'https://rest.ably.io' ||
      url.pathname !== path ||
      url.username ||
      url.password ||
      url.hash
    ) {
      throw createApiServiceError('page must be a nextPageUrl for the same Ably resource.');
    }
    return url.toString();
  }

  // --- Time ---

  async getTime(): Promise<number> {
    let response = await this.axios.get('/time');
    let time = response.data?.[0];
    if (typeof time !== 'number' || !Number.isFinite(time))
      throw createApiServiceError('Ably returned an invalid service time.');
    return time;
  }
}

export type AblyPage = { items: any[]; nextPageUrl?: string };
