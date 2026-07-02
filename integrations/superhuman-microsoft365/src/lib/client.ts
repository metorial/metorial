import { createAxios } from 'slates';
import type { GraphListResponse, ItemBody, Message, Recipient, Subscription } from './types';

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listMessages(params?: {
    folderId?: string;
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    search?: string;
    select?: string[];
  }): Promise<GraphListResponse<Message>> {
    let basePath = params?.folderId
      ? `/me/mailFolders/${params.folderId}/messages`
      : '/me/messages';

    let queryParams: Record<string, string> = {};
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderby && !params.search) queryParams.$orderby = params.orderby;
    if (params?.search) queryParams.$search = `"${params.search}"`;
    if (params?.select?.length) queryParams.$select = params.select.join(',');

    let headers: Record<string, string> = {};
    if (params?.search) {
      headers.ConsistencyLevel = 'eventual';
    }

    let response = await this.axios.get(basePath, { params: queryParams, headers });
    return response.data;
  }

  async getMessage(messageId: string, select?: string[]): Promise<Message> {
    let queryParams: Record<string, string> = {};
    if (select?.length) queryParams.$select = select.join(',');
    let response = await this.axios.get(`/me/messages/${messageId}`, { params: queryParams });
    return response.data;
  }

  async updateMessage(
    messageId: string,
    updates: {
      isRead?: boolean;
      importance?: 'low' | 'normal' | 'high';
      categories?: string[];
      flag?: { flagStatus: 'notFlagged' | 'complete' | 'flagged' };
      subject?: string;
      body?: ItemBody;
      toRecipients?: Recipient[];
      ccRecipients?: Recipient[];
      bccRecipients?: Recipient[];
    }
  ): Promise<Message> {
    let response = await this.axios.patch(`/me/messages/${messageId}`, updates);
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.axios.delete(`/me/messages/${messageId}`);
  }

  async moveMessage(messageId: string, destinationFolderId: string): Promise<Message> {
    let response = await this.axios.post(`/me/messages/${messageId}/move`, {
      destinationId: destinationFolderId
    });
    return response.data;
  }

  async replyToMessage(messageId: string, comment: string, replyAll?: boolean): Promise<void> {
    let endpoint = replyAll ? 'replyAll' : 'reply';
    await this.axios.post(`/me/messages/${messageId}/${endpoint}`, {
      comment
    });
  }

  async createReplyDraft(messageId: string): Promise<Message> {
    let response = await this.axios.post(`/me/messages/${messageId}/createReply`, {});
    return response.data;
  }

  async createReplyAllDraft(messageId: string): Promise<Message> {
    let response = await this.axios.post(`/me/messages/${messageId}/createReplyAll`, {});
    return response.data;
  }

  async sendDraft(messageId: string): Promise<void> {
    await this.axios.post(`/me/messages/${messageId}/send`);
  }

  async listMessagesByConversation(
    conversationId: string,
    params?: { select?: string[]; orderby?: string; pageSize?: number }
  ): Promise<Message[]> {
    let escaped = escapeODataString(conversationId);
    let filter = `conversationId eq '${escaped}'`;
    let pageSize = params?.pageSize ?? 100;
    let select = params?.select;
    let orderby = params?.orderby ?? 'receivedDateTime asc';

    let all: Message[] = [];
    let nextLink: string | undefined;
    let first = true;

    while (true) {
      let response = first
        ? await this.axios.get<GraphListResponse<Message>>('/me/messages', {
            params: {
              $filter: filter,
              $top: String(pageSize),
              ...(select?.length ? { $select: select.join(',') } : {})
            }
          })
        : await this.axios.get<GraphListResponse<Message>>(nextLink!);

      let data = response.data;
      all.push(...data.value);
      nextLink = data['@odata.nextLink'];
      if (!nextLink) {
        break;
      }
      first = false;
    }

    if (orderby.startsWith('receivedDateTime')) {
      let descending = /\bdesc\b/i.test(orderby);
      all.sort((a, b) => {
        let left = a.receivedDateTime ? Date.parse(a.receivedDateTime) : 0;
        let right = b.receivedDateTime ? Date.parse(b.receivedDateTime) : 0;
        return descending ? right - left : left - right;
      });
    }

    return all;
  }

  async createSubscription(subscription: {
    changeType: string;
    notificationUrl: string;
    resource: string;
    expirationDateTime: string;
    clientState?: string;
  }): Promise<Subscription> {
    let response = await this.axios.post('/subscriptions', subscription);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/subscriptions/${subscriptionId}`);
  }
}
