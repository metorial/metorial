import { ChatErrors, parseRetryAfterMs } from '@slates/adapter-chat';
import { createAxios } from '@slates/provider';
import { ZOOM_DEFAULT_API_URL } from '../../lib/chatbotAuth';
import type { ZoomChatbotContent } from './render';

export interface ZoomChatbotAuth {
  token: string;
  accountId?: string;
  botJid?: string;
  chatbotUserJid?: string;
  apiUrl?: string;
}

export interface ZoomChatbotMessageResponse {
  message_id?: string;
  robot_jid?: string;
  to_jid?: string;
  sent_time?: string;
  user_jid?: string;
  [key: string]: unknown;
}

// Stringify Zoom's numeric error code so the shared normalizer keeps it.
export let normalizeZoomErrorBody = (response: { data?: unknown }) => {
  let data = response.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    let code = (data as { code?: unknown }).code;
    if (typeof code === 'number') return { ...(data as object), code: String(code) };
  }
  return data;
};

// https://developers.zoom.us/docs/api/chatbot/
export class ZoomChatbotClient {
  readonly botJid: string;
  readonly accountId: string;
  readonly userJid?: string;
  private api;
  private headers: Record<string, string>;

  constructor(auth: ZoomChatbotAuth, action: string) {
    if (!auth.botJid || !auth.accountId) {
      throw ChatErrors.authInvalid({
        action,
        message:
          'This Zoom connection is not a Team Chat chatbot connection. Reconnect with the Team Chat Chatbot method (Client ID, Client Secret, Bot JID, Account ID).'
      });
    }

    this.botJid = auth.botJid;
    this.accountId = auth.accountId;
    this.userJid = auth.chatbotUserJid || undefined;
    this.api = createAxios({
      baseURL: `${auth.apiUrl ?? ZOOM_DEFAULT_API_URL}/v2`,
      errorMapping: {
        extractResponseData: normalizeZoomErrorBody,
        // Retry-After is seconds or a reset time: https://developers.zoom.us/docs/api/rate-limits/
        mapAxiosError: (error, inferred) => {
          let retryAfterMs = parseRetryAfterMs(
            (error.response?.headers as Record<string, unknown> | undefined)?.['retry-after']
          );
          if (retryAfterMs === undefined) return inferred;
          return { ...inferred, baggage: { ...inferred.baggage, retryAfterMs } };
        }
      }
    });
    this.headers = { Authorization: `Bearer ${auth.token}` };
  }

  async sendMessage(input: {
    toJid: string;
    content: ZoomChatbotContent;
    isMarkdown: boolean;
    replyTo?: string;
  }) {
    let response = await this.api.post<ZoomChatbotMessageResponse>(
      '/im/chat/messages',
      {
        robot_jid: this.botJid,
        to_jid: input.toJid,
        account_id: this.accountId,
        ...(this.userJid ? { user_jid: this.userJid } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        is_markdown_support: input.isMarkdown,
        content: input.content
      },
      { headers: this.headers }
    );
    return response.data ?? {};
  }

  async editMessage(input: {
    messageId: string;
    toJid: string;
    content: ZoomChatbotContent;
    isMarkdown: boolean;
  }) {
    let response = await this.api.put<ZoomChatbotMessageResponse>(
      `/im/chat/messages/${encodeURIComponent(input.messageId)}`,
      {
        robot_jid: this.botJid,
        to_jid: input.toJid,
        account_id: this.accountId,
        ...(this.userJid ? { user_jid: this.userJid } : {}),
        is_markdown_support: input.isMarkdown,
        content: input.content
      },
      { headers: this.headers }
    );
    return response.data ?? {};
  }

  async deleteMessage(messageId: string) {
    let response = await this.api.delete<ZoomChatbotMessageResponse>(
      `/im/chat/messages/${encodeURIComponent(messageId)}`,
      {
        headers: this.headers,
        params: {
          robot_jid: this.botJid,
          account_id: this.accountId,
          ...(this.userJid ? { user_jid: this.userJid } : {})
        }
      }
    );
    return response.data ?? {};
  }
}
