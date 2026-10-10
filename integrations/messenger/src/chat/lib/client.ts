import { ChatErrors } from '@slates/adapter-chat';
import { createAxios } from '@slates/provider';
import { MESSENGER_DEFAULT_API_VERSION } from '../../config';
import { resolveMessengerConnectionPageId } from '../../lib/routingMatcher';
import {
  isMessengerPagePermissionError,
  type MessengerChatErrorContext,
  withMessengerChatErrors
} from './errors';

export interface MessengerSendResponse {
  recipient_id?: string;
  message_id?: string;
  attachment_id?: string;
}

export interface MessengerPage {
  id: string;
  name?: string;
  link?: string;
  picture?: { data?: { url?: string } };
}

export interface MessengerUserProfile {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
}

export interface MessengerMessageAttachment {
  id?: string;
  mime_type?: string;
  name?: string;
  size?: number;
  file_url?: string;
  image_data?: { url?: string; width?: number; height?: number };
  video_data?: { url?: string; width?: number; height?: number };
}

export type MessengerUploadType = 'image' | 'video' | 'audio' | 'file';

export class MessengerChatClient {
  readonly pageId: string;
  private token: string;
  private apiVersion: string;
  private action: string;

  constructor(opts: { token: string; pageId: string; apiVersion?: string; action: string }) {
    this.token = opts.token;
    this.pageId = opts.pageId;
    this.apiVersion = opts.apiVersion || MESSENGER_DEFAULT_API_VERSION;
    this.action = opts.action;
  }

  private api() {
    return createAxios({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      params: { access_token: this.token }
    });
  }

  private async request<T>(
    context: Omit<MessengerChatErrorContext, 'action'>,
    run: (api: ReturnType<MessengerChatClient['api']>) => Promise<{ data: T }>
  ): Promise<T> {
    return withMessengerChatErrors({ ...context, action: this.action }, async () => {
      let response = await run(this.api());
      return response.data;
    });
  }

  sendText(opts: { recipientId: string; text: string; replyToMessageId?: string }) {
    return this.request<MessengerSendResponse>(
      {
        channelId: opts.recipientId,
        messageId: opts.replyToMessageId,
        notFound: 'chat.channel.not_found'
      },
      api =>
        api.post(`/${this.pageId}/messages`, {
          recipient: { id: opts.recipientId },
          messaging_type: 'RESPONSE',
          message: { text: opts.text },
          ...(opts.replyToMessageId ? { reply_to: { mid: opts.replyToMessageId } } : {})
        })
    );
  }

  sendFile(opts: {
    recipientId: string;
    type: MessengerUploadType;
    filename: string;
    contentType: string;
    content: ArrayBuffer;
  }) {
    return this.request<MessengerSendResponse>(
      { channelId: opts.recipientId, notFound: 'chat.channel.not_found' },
      api => {
        let form = new FormData();
        form.append('recipient', JSON.stringify({ id: opts.recipientId }));
        form.append('messaging_type', 'RESPONSE');
        form.append(
          'message',
          JSON.stringify({ attachment: { type: opts.type, payload: { is_reusable: false } } })
        );
        form.append(
          'filedata',
          new Blob([opts.content], { type: opts.contentType }),
          opts.filename
        );
        return api.post(`/${this.pageId}/messages`, form);
      }
    );
  }

  senderAction(opts: {
    recipientId: string;
    action: 'typing_on' | 'typing_off' | 'mark_seen' | 'react' | 'unreact';
    payload?: Record<string, string>;
    messageId?: string;
  }) {
    return this.request<MessengerSendResponse>(
      {
        channelId: opts.recipientId,
        messageId: opts.messageId,
        notFound: opts.messageId ? 'chat.message.not_found' : 'chat.channel.not_found'
      },
      api =>
        api.post(`/${this.pageId}/messages`, {
          recipient: { id: opts.recipientId },
          sender_action: opts.action,
          ...(opts.payload ? { payload: opts.payload } : {})
        })
    );
  }

  /**
   * The Page's name and picture are optional details: with a messaging-only token
   * the Page is returned as its id alone, so connections still resolve.
   */
  getPage() {
    return this.request<MessengerPage>(
      { workspaceId: this.pageId, notFound: 'chat.workspace.not_found' },
      async api => {
        try {
          return await api.get(`/${this.pageId}`, {
            params: { fields: 'id,name,link,picture' }
          });
        } catch (error) {
          if (isMessengerPagePermissionError(error)) return { data: { id: this.pageId } };
          throw error;
        }
      }
    );
  }

  getUserProfile(userId: string) {
    return this.request<MessengerUserProfile>(
      { userId, notFound: 'chat.user.not_found' },
      api =>
        api.get(`/${encodeURIComponent(userId)}`, {
          params: { fields: 'id,name,first_name,last_name,profile_pic' }
        })
    );
  }

  async getMessageAttachments(messageId: string) {
    let response = await this.request<{ data?: MessengerMessageAttachment[] }>(
      { messageId, notFound: 'chat.attachment.not_found' },
      api =>
        api.get(`/${encodeURIComponent(messageId)}/attachments`, {
          params: { fields: 'id,mime_type,name,size,file_url,image_data,video_data' }
        })
    );
    return response.data ?? [];
  }
}

export let createMessengerChatClient = (
  ctx: {
    auth: { token: string; pageId?: string };
    config?: { pageId?: string; apiVersion?: string };
  },
  action: string
) => {
  let pageId = resolveMessengerConnectionPageId(ctx.auth, ctx.config);
  if (!pageId) {
    throw ChatErrors.appNotInstalled({
      action,
      message: 'The Messenger connection has no Facebook Page id. Reconnect the Page.'
    });
  }

  return new MessengerChatClient({
    token: ctx.auth.token,
    pageId,
    apiVersion: ctx.config?.apiVersion,
    action
  });
};
