import { createAxios } from 'slates';
import { buildMimeMessage, encodeBase64Url } from './mime';

let gmailAxios = createAxios({
  baseURL: 'https://gmail.googleapis.com/gmail/v1'
});

export interface MessageHeader {
  name: string;
  value: string;
}

export interface MessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: MessageHeader[];
  body: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: MessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: MessagePart;
  sizeEstimate: number;
}

export interface GmailThread {
  id: string;
  historyId: string;
  snippet: string;
  messages?: GmailMessage[];
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface GmailDraft {
  id: string;
  message: GmailMessage;
}

export interface HistoryRecord {
  id: string;
  messages?: Array<{ id: string; threadId: string }>;
  messagesAdded?: Array<{ message: { id: string; threadId: string; labelIds?: string[] } }>;
  messagesDeleted?: Array<{ message: { id: string; threadId: string; labelIds?: string[] } }>;
  labelsAdded?: Array<{
    message: { id: string; threadId: string; labelIds?: string[] };
    labelIds: string[];
  }>;
  labelsRemoved?: Array<{
    message: { id: string; threadId: string; labelIds?: string[] };
    labelIds: string[];
  }>;
}

export interface VacationSettings {
  enableAutoReply: boolean;
  responseSubject?: string;
  responseBodyPlainText?: string;
  responseBodyHtml?: string;
  restrictToContacts?: boolean;
  restrictToDomain?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface GmailFilter {
  id: string;
  criteria: {
    from?: string;
    to?: string;
    subject?: string;
    query?: string;
    negatedQuery?: string;
    hasAttachment?: boolean;
    excludeChats?: boolean;
    size?: number;
    sizeComparison?: string;
  };
  action: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
    forward?: string;
  };
}

export class Client {
  private token: string;
  private userId: string;

  constructor(config: { token: string; userId: string }) {
    this.token = config.token;
    this.userId = config.userId;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // ── Profile ──

  async getProfile(): Promise<{
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
    historyId: string;
  }> {
    let response = await gmailAxios.get(`/users/${this.userId}/profile`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Messages ──

  async listMessages(params: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
    includeSpamTrash?: boolean;
  }): Promise<{
    messages: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    let response = await gmailAxios.get(`/users/${this.userId}/messages`, {
      headers: this.headers(),
      params: {
        q: params.query,
        labelIds: params.labelIds,
        maxResults: params.maxResults || 20,
        pageToken: params.pageToken,
        includeSpamTrash: params.includeSpamTrash
      }
    });
    return {
      messages: response.data.messages || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate || 0
    };
  }

  async getMessage(messageId: string, format?: string): Promise<GmailMessage> {
    let response = await gmailAxios.get(`/users/${this.userId}/messages/${messageId}`, {
      headers: this.headers(),
      params: { format: format || 'full' }
    });
    return response.data;
  }

  async sendMessage(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: Array<{ filename: string; mimeType: string; content: string }>;
  }): Promise<GmailMessage> {
    let raw = buildMimeMessage(params);
    let encoded = encodeBase64Url(raw);

    let payload: Record<string, string> = { raw: encoded };
    if (params.threadId) {
      payload.threadId = params.threadId;
    }

    let response = await gmailAxios.post(`/users/${this.userId}/messages/send`, payload, {
      headers: this.headers()
    });
    return response.data;
  }

  async modifyMessage(
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<GmailMessage> {
    let response = await gmailAxios.post(
      `/users/${this.userId}/messages/${messageId}/modify`,
      {
        addLabelIds: addLabelIds || [],
        removeLabelIds: removeLabelIds || []
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async trashMessage(messageId: string): Promise<GmailMessage> {
    let response = await gmailAxios.post(
      `/users/${this.userId}/messages/${messageId}/trash`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async untrashMessage(messageId: string): Promise<GmailMessage> {
    let response = await gmailAxios.post(
      `/users/${this.userId}/messages/${messageId}/untrash`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await gmailAxios.delete(`/users/${this.userId}/messages/${messageId}`, {
      headers: this.headers()
    });
  }

  async batchModifyMessages(
    messageIds: string[],
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<void> {
    await gmailAxios.post(
      `/users/${this.userId}/messages/batchModify`,
      {
        ids: messageIds,
        addLabelIds: addLabelIds || [],
        removeLabelIds: removeLabelIds || []
      },
      {
        headers: this.headers()
      }
    );
  }

  async getAttachment(
    messageId: string,
    attachmentId: string
  ): Promise<{ size: number; data: string }> {
    let response = await gmailAxios.get(
      `/users/${this.userId}/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // ── Threads ──

  async listThreads(params: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
    includeSpamTrash?: boolean;
  }): Promise<{
    threads: Array<{ id: string; snippet?: string; historyId?: string }>;
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    let response = await gmailAxios.get(`/users/${this.userId}/threads`, {
      headers: this.headers(),
      params: {
        q: params.query,
        labelIds: params.labelIds,
        maxResults: params.maxResults || 20,
        pageToken: params.pageToken,
        includeSpamTrash: params.includeSpamTrash
      }
    });
    return {
      threads: response.data.threads || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate || 0
    };
  }

  async getThread(threadId: string, format?: string): Promise<GmailThread> {
    let response = await gmailAxios.get(`/users/${this.userId}/threads/${threadId}`, {
      headers: this.headers(),
      params: { format: format || 'full' }
    });
    return response.data;
  }

  async modifyThread(
    threadId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<GmailThread> {
    let response = await gmailAxios.post(
      `/users/${this.userId}/threads/${threadId}/modify`,
      {
        addLabelIds: addLabelIds || [],
        removeLabelIds: removeLabelIds || []
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async trashThread(threadId: string): Promise<GmailThread> {
    let response = await gmailAxios.post(
      `/users/${this.userId}/threads/${threadId}/trash`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async untrashThread(threadId: string): Promise<GmailThread> {
    let response = await gmailAxios.post(
      `/users/${this.userId}/threads/${threadId}/untrash`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteThread(threadId: string): Promise<void> {
    await gmailAxios.delete(`/users/${this.userId}/threads/${threadId}`, {
      headers: this.headers()
    });
  }

  // ── Labels ──

  async listLabels(): Promise<GmailLabel[]> {
    let response = await gmailAxios.get(`/users/${this.userId}/labels`, {
      headers: this.headers()
    });
    return response.data.labels || [];
  }

  async getLabel(labelId: string): Promise<GmailLabel> {
    let response = await gmailAxios.get(`/users/${this.userId}/labels/${labelId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createLabel(params: {
    name: string;
    messageListVisibility?: string;
    labelListVisibility?: string;
    backgroundColor?: string;
    textColor?: string;
  }): Promise<GmailLabel> {
    let body: Record<string, any> = {
      name: params.name,
      messageListVisibility: params.messageListVisibility,
      labelListVisibility: params.labelListVisibility
    };
    if (params.backgroundColor || params.textColor) {
      body.color = {
        backgroundColor: params.backgroundColor,
        textColor: params.textColor
      };
    }
    let response = await gmailAxios.post(`/users/${this.userId}/labels`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateLabel(
    labelId: string,
    params: {
      name?: string;
      messageListVisibility?: string;
      labelListVisibility?: string;
      backgroundColor?: string;
      textColor?: string;
    }
  ): Promise<GmailLabel> {
    let body: Record<string, any> = {
      id: labelId
    };
    if (params.name !== undefined) body.name = params.name;
    if (params.messageListVisibility !== undefined)
      body.messageListVisibility = params.messageListVisibility;
    if (params.labelListVisibility !== undefined)
      body.labelListVisibility = params.labelListVisibility;
    if (params.backgroundColor || params.textColor) {
      body.color = {
        backgroundColor: params.backgroundColor,
        textColor: params.textColor
      };
    }
    let response = await gmailAxios.patch(`/users/${this.userId}/labels/${labelId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteLabel(labelId: string): Promise<void> {
    await gmailAxios.delete(`/users/${this.userId}/labels/${labelId}`, {
      headers: this.headers()
    });
  }

  // ── Drafts ──

  async listDrafts(params: {
    maxResults?: number;
    pageToken?: string;
    query?: string;
  }): Promise<{
    drafts: Array<{ id: string; message: { id: string; threadId: string } }>;
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    let response = await gmailAxios.get(`/users/${this.userId}/drafts`, {
      headers: this.headers(),
      params: {
        maxResults: params.maxResults || 20,
        pageToken: params.pageToken,
        q: params.query
      }
    });
    return {
      drafts: response.data.drafts || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate || 0
    };
  }

  async getDraft(draftId: string, format?: string): Promise<GmailDraft> {
    let response = await gmailAxios.get(`/users/${this.userId}/drafts/${draftId}`, {
      headers: this.headers(),
      params: { format: format || 'full' }
    });
    return response.data;
  }

  async createDraft(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    threadId?: string;
  }): Promise<GmailDraft> {
    let raw = buildMimeMessage(params);
    let encoded = encodeBase64Url(raw);

    let payload: Record<string, any> = {
      message: { raw: encoded }
    };
    if (params.threadId) {
      payload.message.threadId = params.threadId;
    }

    let response = await gmailAxios.post(`/users/${this.userId}/drafts`, payload, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateDraft(
    draftId: string,
    params: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      isHtml?: boolean;
      threadId?: string;
    }
  ): Promise<GmailDraft> {
    let raw = buildMimeMessage(params);
    let encoded = encodeBase64Url(raw);

    let payload: Record<string, any> = {
      message: { raw: encoded }
    };
    if (params.threadId) {
      payload.message.threadId = params.threadId;
    }

    let response = await gmailAxios.put(`/users/${this.userId}/drafts/${draftId}`, payload, {
      headers: this.headers()
    });
    return response.data;
  }

  async sendDraft(draftId: string): Promise<GmailMessage> {
    let response = await gmailAxios.post(
      `/users/${this.userId}/drafts/send`,
      {
        id: draftId
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteDraft(draftId: string): Promise<void> {
    await gmailAxios.delete(`/users/${this.userId}/drafts/${draftId}`, {
      headers: this.headers()
    });
  }

  // ── History ──

  async listHistory(params: {
    startHistoryId: string;
    labelId?: string;
    historyTypes?: string[];
    maxResults?: number;
    pageToken?: string;
  }): Promise<{ history: HistoryRecord[]; nextPageToken?: string; historyId: string }> {
    let response = await gmailAxios.get(`/users/${this.userId}/history`, {
      headers: this.headers(),
      params: {
        startHistoryId: params.startHistoryId,
        labelId: params.labelId,
        historyTypes: params.historyTypes,
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken
      }
    });
    return {
      history: response.data.history || [],
      nextPageToken: response.data.nextPageToken,
      historyId: response.data.historyId
    };
  }

  // ── Settings ──

  async getVacationSettings(): Promise<VacationSettings> {
    let response = await gmailAxios.get(`/users/${this.userId}/settings/vacation`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateVacationSettings(settings: VacationSettings): Promise<VacationSettings> {
    let response = await gmailAxios.put(`/users/${this.userId}/settings/vacation`, settings, {
      headers: this.headers()
    });
    return response.data;
  }

  async listFilters(): Promise<GmailFilter[]> {
    let response = await gmailAxios.get(`/users/${this.userId}/settings/filters`, {
      headers: this.headers()
    });
    return response.data.filter || [];
  }

  async getFilter(filterId: string): Promise<GmailFilter> {
    let response = await gmailAxios.get(`/users/${this.userId}/settings/filters/${filterId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createFilter(params: {
    criteria: {
      from?: string;
      to?: string;
      subject?: string;
      query?: string;
      negatedQuery?: string;
      hasAttachment?: boolean;
      excludeChats?: boolean;
    };
    action: {
      addLabelIds?: string[];
      removeLabelIds?: string[];
      forward?: string;
    };
  }): Promise<GmailFilter> {
    let response = await gmailAxios.post(`/users/${this.userId}/settings/filters`, params, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteFilter(filterId: string): Promise<void> {
    await gmailAxios.delete(`/users/${this.userId}/settings/filters/${filterId}`, {
      headers: this.headers()
    });
  }

  async listForwardingAddresses(): Promise<
    Array<{ forwardingEmail: string; verificationStatus: string }>
  > {
    let response = await gmailAxios.get(`/users/${this.userId}/settings/forwardingAddresses`, {
      headers: this.headers()
    });
    return response.data.forwardingAddresses || [];
  }

  async getSendAs(): Promise<
    Array<{
      sendAsEmail: string;
      displayName: string;
      replyToAddress?: string;
      signature?: string;
      isPrimary?: boolean;
      isDefault?: boolean;
    }>
  > {
    let response = await gmailAxios.get(`/users/${this.userId}/settings/sendAs`, {
      headers: this.headers()
    });
    return response.data.sendAs || [];
  }

  async updateSendAs(
    sendAsEmail: string,
    params: {
      displayName?: string;
      replyToAddress?: string;
      signature?: string;
    }
  ): Promise<any> {
    let response = await gmailAxios.patch(
      `/users/${this.userId}/settings/sendAs/${sendAsEmail}`,
      params,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }
}

// ── Helpers ──

export let extractHeader = (message: GmailMessage, headerName: string): string | undefined => {
  let header = message.payload?.headers?.find(
    (h: MessageHeader) => h.name.toLowerCase() === headerName.toLowerCase()
  );
  return header?.value;
};

export let extractBody = (payload?: MessagePart): { text?: string; html?: string } => {
  let result: { text?: string; html?: string } = {};

  if (!payload) {
    return result;
  }

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    result.text = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  } else if (payload.mimeType === 'text/html' && payload.body?.data) {
    result.html = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }

  if (payload.parts) {
    for (let part of payload.parts) {
      let partBody = extractBody(part);
      if (partBody.text && !result.text) result.text = partBody.text;
      if (partBody.html && !result.html) result.html = partBody.html;
    }
  }

  return result;
};

export let extractAttachments = (
  payload?: MessagePart
): Array<{
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}> => {
  let attachments: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }> = [];

  if (!payload) {
    return attachments;
  }

  if (payload.filename && payload.body?.attachmentId) {
    attachments.push({
      attachmentId: payload.body.attachmentId,
      filename: payload.filename,
      mimeType: payload.mimeType,
      size: payload.body.size
    });
  }

  if (payload.parts) {
    for (let part of payload.parts) {
      attachments.push(...extractAttachments(part));
    }
  }

  return attachments;
};

export let parseMessage = (message: GmailMessage) => {
  let body = extractBody(message.payload);
  let attachments = extractAttachments(message.payload);

  return {
    messageId: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds || [],
    snippet: message.snippet,
    historyId: message.historyId,
    internalDate: message.internalDate,
    sizeEstimate: message.sizeEstimate,
    from: extractHeader(message, 'From'),
    to: extractHeader(message, 'To'),
    cc: extractHeader(message, 'Cc'),
    bcc: extractHeader(message, 'Bcc'),
    subject: extractHeader(message, 'Subject'),
    date: extractHeader(message, 'Date'),
    mimeMessageId: extractHeader(message, 'Message-ID'),
    bodyText: body.text,
    bodyHtml: body.html,
    attachments
  };
};
