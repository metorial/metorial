import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
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

let toSnakeAttachment = (a: SendAttachment) => {
  if ((a.content !== undefined) === (a.url !== undefined)) {
    throw createApiServiceError(
      'Provide exactly one of content or url for each email attachment.'
    );
  }
  return pickDefined({
    filename: a.filename,
    content_type: a.contentType,
    content_disposition: a.contentDisposition,
    content_id: a.contentId,
    content: a.content,
    url: a.url
  });
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private podPrefix: string;
  private podId?: string;

  constructor(params: { token: string; podId?: string }) {
    if (!params.token.trim()) {
      throw createApiServiceError('An AgentMail API key is required. Reconnect your account.');
    }
    this.podId = params.podId;
    this.podPrefix = params.podId ? `/pods/${encodeURIComponent(params.podId)}` : '';
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.agentmail.to/v0',
      authHeader: { value: `Bearer ${params.token}` },
      timeout: 30_000,
      paramsSerializer: { indexes: null },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'AgentMail',
          reason: 'agentmail_api_error',
          detailKeys: ['message', 'fix', 'code', 'name'],
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined
        })
    });
  }

  private paginationQuery(
    params?: PaginationParams
  ): Record<string, string | number | boolean> {
    let query: Record<string, string | number | boolean> = {};
    if (params?.limit !== undefined) {
      if (!Number.isInteger(params.limit) || params.limit < 1) {
        throw createApiServiceError('limit must be a positive whole number.');
      }
      query.limit = params.limit;
    }
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
    if (params?.includeSpam !== undefined) query.include_spam = params.includeSpam;
    if (params?.includeBlocked !== undefined) query.include_blocked = params.includeBlocked;
    if (params?.includeTrash !== undefined) query.include_trash = params.includeTrash;
    if (params?.includeUnauthenticated !== undefined)
      query.include_unauthenticated = params.includeUnauthenticated;
    if (params?.from?.length) query.from = params.from;
    if (params?.to?.length) query.to = params.to;
    if (params?.subject?.length) query.subject = params.subject;
    return query;
  }

  // --- Inboxes ---

  async listInboxes(
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; inboxes: Inbox[] }> {
    let res = await this.axios.get(`${this.podPrefix}/inboxes`, {
      params: this.paginationQuery(params)
    });
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
    let res = await this.axios.post(`${this.podPrefix}/inboxes`, {
      username: params?.username,
      domain: params?.domain,
      display_name: params?.displayName,
      client_id: params?.clientId
    });
    return res.data;
  }

  async getInbox(inboxId: string): Promise<Inbox> {
    let res = await this.axios.get(`${this.podPrefix}/inboxes/${encodeURIComponent(inboxId)}`);
    return res.data;
  }

  async updateInbox(inboxId: string, displayName: string): Promise<Inbox> {
    let res = await this.axios.patch(
      `${this.podPrefix}/inboxes/${encodeURIComponent(inboxId)}`,
      { display_name: displayName }
    );
    return res.data;
  }

  async deleteInbox(inboxId: string): Promise<void> {
    await this.axios.delete(`${this.podPrefix}/inboxes/${encodeURIComponent(inboxId)}`);
  }

  // --- Messages ---

  async listMessages(
    inboxId: string,
    params?: MessageFilterParams
  ): Promise<{ count: number; nextPageToken?: string; messages: Message[] }> {
    let res = await this.axios.get(`/inboxes/${encodeURIComponent(inboxId)}/messages`, {
      params: this.messageFilterQuery(params)
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      messages: res.data.messages
    };
  }

  async getMessage(inboxId: string, messageId: string): Promise<Message> {
    let res = await this.axios.get(
      `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`
    );
    return res.data;
  }

  async sendMessage(inboxId: string, params: SendMessageParams): Promise<SendResult> {
    let res = await this.axios.post(
      `/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
      {
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        reply_to: params.replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
        labels: params.labels,
        attachments: params.attachments?.map(toSnakeAttachment),
        headers: params.headers,
        track_opens: params.trackOpens
      },
      { headers: { 'Idempotency-Key': params.idempotencyKey } }
    );
    return res.data;
  }

  async replyToMessage(
    inboxId: string,
    messageId: string,
    params: ReplyParams
  ): Promise<SendResult> {
    let endpoint = `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/reply`;

    let res = await this.axios.post(
      endpoint,
      {
        reply_all: params.replyAll,
        text: params.text,
        html: params.html,
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        reply_to: params.replyTo,
        attachments: params.attachments?.map(toSnakeAttachment),
        headers: params.headers,
        labels: params.labels,
        track_opens: params.trackOpens
      },
      { headers: { 'Idempotency-Key': params.idempotencyKey } }
    );
    return res.data;
  }

  async forwardMessage(
    inboxId: string,
    messageId: string,
    params: SendMessageParams
  ): Promise<SendResult> {
    let res = await this.axios.post(
      `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/forward`,
      {
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        reply_to: params.replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
        labels: params.labels,
        attachments: params.attachments?.map(toSnakeAttachment),
        headers: params.headers,
        track_opens: params.trackOpens
      },
      { headers: { 'Idempotency-Key': params.idempotencyKey } }
    );
    return res.data;
  }

  async updateMessageLabels(
    inboxId: string,
    messageId: string,
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<Message> {
    let res = await this.axios.patch(
      `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
      {
        add_labels: addLabels,
        remove_labels: removeLabels
      }
    );
    return res.data;
  }

  // --- Threads ---

  async listThreads(
    inboxId: string,
    params?: MessageFilterParams
  ): Promise<{ count: number; nextPageToken?: string; threads: Thread[] }> {
    let res = await this.axios.get(`/inboxes/${encodeURIComponent(inboxId)}/threads`, {
      params: this.messageFilterQuery(params)
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      threads: res.data.threads
    };
  }

  async getThread(
    inboxId: string,
    threadId: string,
    params?: PaginationParams
  ): Promise<Thread> {
    let res = await this.axios.get(
      `/inboxes/${encodeURIComponent(inboxId)}/threads/${encodeURIComponent(threadId)}`,
      { params: this.paginationQuery(params) }
    );
    return res.data;
  }

  async deleteThread(inboxId: string, threadId: string): Promise<void> {
    await this.axios.delete(
      `/inboxes/${encodeURIComponent(inboxId)}/threads/${encodeURIComponent(threadId)}`
    );
  }

  // --- Drafts ---

  async listDrafts(
    inboxId: string,
    params?: MessageFilterParams
  ): Promise<{ count: number; nextPageToken?: string; drafts: Draft[] }> {
    let res = await this.axios.get(`/inboxes/${encodeURIComponent(inboxId)}/drafts`, {
      params: pickDefined({
        ...this.paginationQuery(params),
        labels: params?.labels,
        before: params?.before,
        after: params?.after
      })
    });
    let items = res.data.drafts as Omit<Draft, 'created_at'>[];
    let drafts: Draft[] = [];
    for (let offset = 0; offset < items.length; offset += 5) {
      drafts.push(
        ...(await Promise.all(
          items.slice(offset, offset + 5).map(async item => {
            let detail = await this.getDraft(inboxId, item.draft_id);
            return { ...item, created_at: detail.created_at };
          })
        ))
      );
    }
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      drafts
    };
  }

  async createDraft(inboxId: string, params: CreateDraftParams): Promise<Draft> {
    let res = await this.axios.post(`/inboxes/${encodeURIComponent(inboxId)}/drafts`, {
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
      forward_of: params.forwardOf,
      reply_all: params.replyAll,
      send_at: params.sendAt,
      client_id: params.clientId
    });
    return res.data;
  }

  async getDraft(inboxId: string, draftId: string): Promise<Draft> {
    let res = await this.axios.get(
      `/inboxes/${encodeURIComponent(inboxId)}/drafts/${encodeURIComponent(draftId)}`
    );
    return res.data;
  }

  async updateDraft(
    inboxId: string,
    draftId: string,
    params: Partial<CreateDraftParams>
  ): Promise<Draft> {
    let current =
      params.inReplyTo !== undefined ||
      params.labels !== undefined ||
      params.attachments !== undefined
        ? await this.getDraft(inboxId, draftId)
        : undefined;
    if (params.inReplyTo !== undefined && params.inReplyTo !== current?.in_reply_to) {
      throw createApiServiceError(
        'A draft reply target cannot be changed. Create a new reply draft instead.'
      );
    }
    let res = await this.axios.patch(
      `/inboxes/${encodeURIComponent(inboxId)}/drafts/${encodeURIComponent(draftId)}`,
      pickDefined({
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        reply_to: params.replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
        add_labels:
          params.labels === undefined
            ? params.addLabels
            : params.labels.filter(label => !current?.labels?.includes(label)),
        remove_labels:
          params.labels === undefined
            ? params.removeLabels
            : current?.labels?.filter(label => !params.labels?.includes(label)),
        add_attachments: params.attachments?.map(toSnakeAttachment),
        remove_attachments:
          params.attachments === undefined
            ? undefined
            : current?.attachments?.map(attachment => attachment.attachment_id),
        send_at: params.clearSendAt ? null : params.sendAt
      })
    );
    return res.data;
  }

  async deleteDraft(inboxId: string, draftId: string): Promise<void> {
    await this.axios.delete(
      `/inboxes/${encodeURIComponent(inboxId)}/drafts/${encodeURIComponent(draftId)}`
    );
  }

  async sendDraft(
    inboxId: string,
    draftId: string,
    addLabels?: string[],
    removeLabels?: string[],
    idempotencyKey?: string
  ): Promise<SendResult> {
    let res = await this.axios.post(
      `/inboxes/${encodeURIComponent(inboxId)}/drafts/${encodeURIComponent(draftId)}/send`,
      {
        add_labels: addLabels,
        remove_labels: removeLabels
      },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return res.data;
  }

  // --- Attachments ---

  async getMessageAttachment(
    inboxId: string,
    messageId: string,
    attachmentId: string
  ): Promise<AttachmentResponse> {
    let res = await this.axios.get(
      `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
    );
    return res.data;
  }

  async getThreadAttachment(
    inboxId: string,
    threadId: string,
    attachmentId: string
  ): Promise<AttachmentResponse> {
    let res = await this.axios.get(
      `/inboxes/${encodeURIComponent(inboxId)}/threads/${encodeURIComponent(threadId)}/attachments/${encodeURIComponent(attachmentId)}`
    );
    return res.data;
  }

  // --- Domains ---

  async listDomains(
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; domains: Domain[] }> {
    let res = await this.axios.get(`${this.podPrefix}/domains`, {
      params: this.paginationQuery(params)
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      domains: await this.getDomainDetails(res.data.domains as Domain[])
    };
  }

  private async getDomainDetails(domains: Domain[]): Promise<Domain[]> {
    let details: Domain[] = [];
    for (let offset = 0; offset < domains.length; offset += 5) {
      details.push(
        ...(await Promise.all(
          domains.slice(offset, offset + 5).map(domain => this.getDomain(domain.domain_id))
        ))
      );
    }
    return details;
  }

  async createDomain(domain: string, feedbackEnabled: boolean): Promise<Domain> {
    let res = await this.axios.post(`${this.podPrefix}/domains`, {
      domain,
      feedback_enabled: feedbackEnabled
    });
    return res.data;
  }

  async getDomain(domainId: string): Promise<Domain> {
    let res = await this.axios.get(
      `${this.podPrefix}/domains/${encodeURIComponent(domainId)}`
    );
    return res.data;
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.axios.delete(`${this.podPrefix}/domains/${encodeURIComponent(domainId)}`);
  }

  async verifyDomain(domainId: string): Promise<Domain> {
    await this.axios.post(`${this.podPrefix}/domains/${encodeURIComponent(domainId)}/verify`);
    return this.getDomain(domainId);
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
    let res = await this.axios.get(`/pods/${encodeURIComponent(podId)}`);
    return res.data;
  }

  async deletePod(podId: string): Promise<void> {
    await this.axios.delete(`/pods/${encodeURIComponent(podId)}`);
  }

  // --- Webhooks ---

  async listWebhooks(
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; webhooks: Webhook[] }> {
    let res = await this.axios.get(`${this.podPrefix}/webhooks`, {
      params: this.paginationQuery(params)
    });
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
    if (this.podId && podIds?.some(id => id !== this.podId)) {
      throw createApiServiceError(
        'A pod-scoped webhook cannot subscribe to other pods. Remove podIds or use only the configured pod ID.'
      );
    }
    let res = await this.axios.post(`${this.podPrefix}/webhooks`, {
      url,
      event_types: eventTypes,
      pod_ids: this.podId ? undefined : podIds,
      inbox_ids: inboxIds,
      client_id: clientId
    });
    return res.data;
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let res = await this.axios.get(
      `${this.podPrefix}/webhooks/${encodeURIComponent(webhookId)}`
    );
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
    if (this.podId && params.podIds !== undefined) {
      throw createApiServiceError(
        'Pod filters cannot be changed on a pod-scoped webhook. Use inboxIds to change inbox subscriptions.'
      );
    }
    let current =
      params.url !== undefined || params.podIds !== undefined || params.inboxIds !== undefined
        ? await this.getWebhook(webhookId)
        : undefined;
    if (
      (this.podId || current?.pod_id) &&
      params.inboxIds?.length &&
      !current?.inbox_ids?.length
    ) {
      throw createApiServiceError(
        'A webhook covering its entire pod cannot be narrowed with an update. Create a replacement webhook with inboxIds and delete the old one.'
      );
    }
    if (params.url !== undefined && params.url !== current?.url) {
      throw createApiServiceError(
        'AgentMail cannot change a webhook URL. Create a replacement webhook and delete the old one.'
      );
    }
    let res = await this.axios.patch(
      `${this.podPrefix}/webhooks/${encodeURIComponent(webhookId)}`,
      pickDefined({
        event_types: params.eventTypes,
        add_pod_ids: (this.podId ? undefined : params.podIds)?.filter(
          id => !current?.pod_ids?.includes(id)
        ),
        remove_pod_ids:
          params.podIds === undefined
            ? undefined
            : current?.pod_ids?.filter(id => !params.podIds?.includes(id)),
        add_inbox_ids: params.inboxIds?.filter(id => !current?.inbox_ids?.includes(id)),
        remove_inbox_ids:
          params.inboxIds === undefined
            ? undefined
            : current?.inbox_ids?.filter(id => !params.inboxIds?.includes(id)),
        enabled: params.enabled
      })
    );
    return res.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`${this.podPrefix}/webhooks/${encodeURIComponent(webhookId)}`);
  }

  // --- Lists ---

  async listEntries(
    direction: string,
    listType: string,
    params?: PaginationParams
  ): Promise<{ count: number; nextPageToken?: string; entries: ListEntry[] }> {
    let res = await this.axios.get(
      `${this.podPrefix}/lists/${encodeURIComponent(direction)}/${encodeURIComponent(listType)}`,
      {
        params: pickDefined({
          limit: this.paginationQuery(params).limit,
          page_token: params?.pageToken
        })
      }
    );
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
    let res = await this.axios.post(
      `${this.podPrefix}/lists/${encodeURIComponent(direction)}/${encodeURIComponent(listType)}`,
      { entry, reason }
    );
    return res.data;
  }

  async getListEntry(direction: string, listType: string, entry: string): Promise<ListEntry> {
    let res = await this.axios.get(
      `${this.podPrefix}/lists/${encodeURIComponent(direction)}/${encodeURIComponent(listType)}/${encodeURIComponent(entry)}`
    );
    return res.data;
  }

  async deleteListEntry(direction: string, listType: string, entry: string): Promise<void> {
    await this.axios.delete(
      `${this.podPrefix}/lists/${encodeURIComponent(direction)}/${encodeURIComponent(listType)}/${encodeURIComponent(entry)}`
    );
  }
  async deleteMessage(inboxId: string, messageId: string): Promise<void> {
    await this.axios.delete(
      `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`
    );
  }

  async updateThreadLabels(
    inboxId: string,
    threadId: string,
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<{ thread_id: string; labels: string[] }> {
    let res = await this.axios.patch(
      `/inboxes/${encodeURIComponent(inboxId)}/threads/${encodeURIComponent(threadId)}`,
      pickDefined({ add_labels: addLabels, remove_labels: removeLabels })
    );
    return res.data;
  }

  async searchMessages(
    inboxId: string,
    query: string,
    params?: PaginationParams & { before?: string; after?: string }
  ): Promise<{ count: number; nextPageToken?: string; messages: Message[] }> {
    if (params?.limit !== undefined && params.limit > 100)
      throw createApiServiceError('Search limit cannot exceed 100.');
    let res = await this.axios.get(`/inboxes/${encodeURIComponent(inboxId)}/messages/search`, {
      params: pickDefined({
        ...this.paginationQuery(params),
        q: query,
        before: params?.before,
        after: params?.after
      })
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      messages: res.data.messages
    };
  }

  async searchThreads(
    inboxId: string,
    query: string,
    params?: PaginationParams & { before?: string; after?: string }
  ): Promise<{ count: number; nextPageToken?: string; threads: Thread[] }> {
    if (params?.limit !== undefined && params.limit > 100)
      throw createApiServiceError('Search limit cannot exceed 100.');
    let res = await this.axios.get(`/inboxes/${encodeURIComponent(inboxId)}/threads/search`, {
      params: pickDefined({
        ...this.paginationQuery(params),
        q: query,
        before: params?.before,
        after: params?.after
      })
    });
    return {
      count: res.data.count,
      nextPageToken: res.data.next_page_token,
      threads: res.data.threads
    };
  }

  async getRawMessage(
    inboxId: string,
    messageId: string
  ): Promise<{ message_id: string; size: number; download_url: string; expires_at: string }> {
    let res = await this.axios.get(
      `/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/raw`
    );
    return res.data;
  }
}
