import { createAxios } from 'slates';
import type {
  AttachmentResponse,
  CreateDraftParams,
  Domain,
  Draft,
  Inbox,
  ListEntry,
  Message,
  MessageFilterParams,
  PaginationParams,
  Pod,
  ReplyParams,
  SendAttachment,
  SendMessageParams,
  SendResult,
  Thread,
  Webhook
} from './types';

let toSnakeAttachment = (a: SendAttachment) => ({
  filename: a.filename,
  content_type: a.contentType,
  content_disposition: a.contentDisposition,
  content_id: a.contentId,
  content: a.content,
  url: a.url
});

export class Client {
  private axios;

  constructor(params: { token: string; podId?: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.agentmail.to/v0',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private paginationQuery(
    params?: PaginationParams
  ): Record<string, string | number | boolean> {
    let query: Record<string, string | number | boolean> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.pageToken) query.page_token = params.pageToken;
    if (params?.ascending !== undefined) query.ascending = params.ascending;
    return query;
  }

  private messageFilterQuery(
    params?: MessageFilterParams
  ): Record<string, string | number | boolean | string[]> {
    let query: Record<string, string | number | boolean | string[]> =
      this.paginationQuery(params);
    if (params?.labels?.length) query.labels = params.labels;
    if (params?.before) query.before = params.before;
    if (params?.after) query.after = params.after;
    if (params?.includeSpam) query.include_spam = true;
    if (params?.includeBlocked) query.include_blocked = true;
    if (params?.includeTrash) query.include_trash = true;
    return query;
  }

  // --- Inboxes ---

  async listInboxes(
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; inboxes: Inbox[] }> {
    let res = await this.axios.get('/inboxes', { params: this.paginationQuery(params) });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      inboxes: res.data.inboxes
    };
  }

  async createInbox(params?: {
    username?: string;
    domain?: string;
    displayName?: string;
    clientId?: string;
  }): Promise<Inbox> {
    let res = await this.axios.post('/inboxes', {
      username: params?.username,
      domain: params?.domain,
      display_name: params?.displayName,
      client_id: params?.clientId
    });
    return res.data;
  }

  async getInbox(inboxId: string): Promise<Inbox> {
    let res = await this.axios.get(`/inboxes/${inboxId}`);
    return res.data;
  }

  async updateInbox(inboxId: string, displayName: string): Promise<Inbox> {
    let res = await this.axios.patch(`/inboxes/${inboxId}`, { display_name: displayName });
    return res.data;
  }

  async deleteInbox(inboxId: string): Promise<void> {
    await this.axios.delete(`/inboxes/${inboxId}`);
  }

  // --- Messages ---

  async listMessages(
    inboxId: string,
    params?: MessageFilterParams
  ): Promise<{ count: number; nextPageToken?: string; messages: Message[] }> {
    let res = await this.axios.get(`/inboxes/${inboxId}/messages`, {
      params: this.messageFilterQuery(params)
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      messages: res.data.messages
    };
  }

  async getMessage(inboxId: string, messageId: string): Promise<Message> {
    let res = await this.axios.get(`/inboxes/${inboxId}/messages/${messageId}`);
    return res.data;
  }

  async sendMessage(inboxId: string, params: SendMessageParams): Promise<SendResult> {
    let res = await this.axios.post(`/inboxes/${inboxId}/messages/send`, {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
      labels: params.labels,
      attachments: params.attachments?.map(toSnakeAttachment),
      headers: params.headers
    });
    return res.data;
  }

  async replyToMessage(
    inboxId: string,
    messageId: string,
    params: ReplyParams
  ): Promise<SendResult> {
    let endpoint = params.replyAll
      ? `/inboxes/${inboxId}/messages/${messageId}/reply-all`
      : `/inboxes/${inboxId}/messages/${messageId}/reply`;

    let res = await this.axios.post(endpoint, {
      text: params.text,
      html: params.html,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      reply_to: params.replyTo,
      attachments: params.attachments?.map(toSnakeAttachment),
      headers: params.headers,
      labels: params.labels
    });
    return res.data;
  }

  async forwardMessage(
    inboxId: string,
    messageId: string,
    params: SendMessageParams
  ): Promise<SendResult> {
    let res = await this.axios.post(`/inboxes/${inboxId}/messages/${messageId}/forward`, {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
      labels: params.labels,
      attachments: params.attachments?.map(toSnakeAttachment),
      headers: params.headers
    });
    return res.data;
  }

  async updateMessageLabels(
    inboxId: string,
    messageId: string,
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<Message> {
    let res = await this.axios.patch(`/inboxes/${inboxId}/messages/${messageId}`, {
      add_labels: addLabels,
      remove_labels: removeLabels
    });
    return res.data;
  }

  // --- Threads ---

  async listThreads(
    inboxId: string,
    params?: MessageFilterParams
  ): Promise<{ count: number; nextPageToken?: string; threads: Thread[] }> {
    let res = await this.axios.get(`/inboxes/${inboxId}/threads`, {
      params: this.messageFilterQuery(params)
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      threads: res.data.threads
    };
  }

  async getThread(inboxId: string, threadId: string): Promise<Thread> {
    let res = await this.axios.get(`/inboxes/${inboxId}/threads/${threadId}`);
    return res.data;
  }

  async deleteThread(inboxId: string, threadId: string): Promise<void> {
    await this.axios.delete(`/inboxes/${inboxId}/threads/${threadId}`);
  }

  // --- Drafts ---

  async listDrafts(
    inboxId: string,
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; drafts: Draft[] }> {
    let res = await this.axios.get(`/inboxes/${inboxId}/drafts`, {
      params: this.paginationQuery(params)
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      drafts: res.data.drafts
    };
  }

  async createDraft(inboxId: string, params: CreateDraftParams): Promise<Draft> {
    let res = await this.axios.post(`/inboxes/${inboxId}/drafts`, {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
      labels: params.labels,
      attachments: params.attachments?.map(toSnakeAttachment),
      in_reply_to: params.inReplyTo,
      send_at: params.sendAt,
      client_id: params.clientId
    });
    return res.data;
  }

  async getDraft(inboxId: string, draftId: string): Promise<Draft> {
    let res = await this.axios.get(`/inboxes/${inboxId}/drafts/${draftId}`);
    return res.data;
  }

  async updateDraft(
    inboxId: string,
    draftId: string,
    params: Partial<CreateDraftParams>
  ): Promise<Draft> {
    let res = await this.axios.patch(`/inboxes/${inboxId}/drafts/${draftId}`, {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
      labels: params.labels,
      attachments: params.attachments?.map(toSnakeAttachment),
      in_reply_to: params.inReplyTo,
      send_at: params.sendAt,
      client_id: params.clientId
    });
    return res.data;
  }

  async deleteDraft(inboxId: string, draftId: string): Promise<void> {
    await this.axios.delete(`/inboxes/${inboxId}/drafts/${draftId}`);
  }

  async sendDraft(
    inboxId: string,
    draftId: string,
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<SendResult> {
    let res = await this.axios.post(`/inboxes/${inboxId}/drafts/${draftId}/send`, {
      add_labels: addLabels,
      remove_labels: removeLabels
    });
    return res.data;
  }

  // --- Attachments ---

  async getMessageAttachment(
    inboxId: string,
    messageId: string,
    attachmentId: string
  ): Promise<AttachmentResponse> {
    let res = await this.axios.get(
      `/inboxes/${inboxId}/messages/${messageId}/attachments/${attachmentId}`
    );
    return res.data;
  }

  async getThreadAttachment(
    inboxId: string,
    threadId: string,
    attachmentId: string
  ): Promise<AttachmentResponse> {
    let res = await this.axios.get(
      `/inboxes/${inboxId}/threads/${threadId}/attachments/${attachmentId}`
    );
    return res.data;
  }

  // --- Domains ---

  async listDomains(
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; domains: Domain[] }> {
    let res = await this.axios.get('/domains', { params: this.paginationQuery(params) });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      domains: res.data.domains
    };
  }

  async createDomain(domain: string, feedbackEnabled: boolean): Promise<Domain> {
    let res = await this.axios.post('/domains', { domain, feedback_enabled: feedbackEnabled });
    return res.data;
  }

  async getDomain(domainId: string): Promise<Domain> {
    let res = await this.axios.get(`/domains/${domainId}`);
    return res.data;
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.axios.delete(`/domains/${domainId}`);
  }

  async verifyDomain(domainId: string): Promise<Domain> {
    let res = await this.axios.post(`/domains/${domainId}/verify`);
    return res.data;
  }

  // --- Pods ---

  async listPods(
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; pods: Pod[] }> {
    let res = await this.axios.get('/pods', { params: this.paginationQuery(params) });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      pods: res.data.pods
    };
  }

  async createPod(name?: string, clientId?: string): Promise<Pod> {
    let res = await this.axios.post('/pods', { name, client_id: clientId });
    return res.data;
  }

  async getPod(podId: string): Promise<Pod> {
    let res = await this.axios.get(`/pods/${podId}`);
    return res.data;
  }

  async deletePod(podId: string): Promise<void> {
    await this.axios.delete(`/pods/${podId}`);
  }

  // --- Webhooks ---

  async listWebhooks(
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; webhooks: Webhook[] }> {
    let res = await this.axios.get('/webhooks', { params: this.paginationQuery(params) });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      webhooks: res.data.webhooks
    };
  }

  async createWebhook(
    url: string,
    eventTypes: string[],
    podIds?: string[],
    inboxIds?: string[],
    clientId?: string
  ): Promise<Webhook> {
    let res = await this.axios.post('/webhooks', {
      url,
      event_types: eventTypes,
      pod_ids: podIds,
      inbox_ids: inboxIds,
      client_id: clientId
    });
    return res.data;
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let res = await this.axios.get(`/webhooks/${webhookId}`);
    return res.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      url?: string;
      eventTypes?: string[];
      podIds?: string[];
      inboxIds?: string[];
      enabled?: boolean;
    }
  ): Promise<Webhook> {
    let res = await this.axios.patch(`/webhooks/${webhookId}`, {
      url: params.url,
      event_types: params.eventTypes,
      pod_ids: params.podIds,
      inbox_ids: params.inboxIds,
      enabled: params.enabled
    });
    return res.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // --- Lists ---

  async listEntries(
    direction: string,
    listType: string,
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; entries: ListEntry[] }> {
    let res = await this.axios.get(`/lists/${direction}/${listType}`, {
      params: this.paginationQuery(params)
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      entries: res.data.entries
    };
  }

  async createListEntry(
    direction: string,
    listType: string,
    entry: string,
    reason?: string
  ): Promise<ListEntry> {
    let res = await this.axios.post(`/lists/${direction}/${listType}`, { entry, reason });
    return res.data;
  }

  async getListEntry(direction: string, listType: string, entry: string): Promise<ListEntry> {
    let res = await this.axios.get(`/lists/${direction}/${listType}/${entry}`);
    return res.data;
  }

  async deleteListEntry(direction: string, listType: string, entry: string): Promise<void> {
    await this.axios.delete(`/lists/${direction}/${listType}/${entry}`);
  }
}
