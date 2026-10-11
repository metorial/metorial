import type { Buffer } from 'node:buffer';
import { WhatsAppGraphApi } from '../../lib/graph';

export { DEFAULT_WHATSAPP_API_VERSION } from '../../lib/graph';

export interface WhatsAppPhoneNumberInfo {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  [key: string]: unknown;
}

export interface WhatsAppSendResponse {
  messaging_product?: string;
  contacts?: { input?: string; wa_id?: string; user_id?: string }[];
  messages?: { id?: string; message_status?: string }[];
}

export interface WhatsAppMediaInfo {
  id?: string;
  url?: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number | string;
  messaging_product?: string;
}

export type WhatsAppRecipient = { to: string } | { recipient: string };

export interface WhatsAppChatClientConfig {
  token: string;
  phoneNumberId: string;
  apiVersion?: string;
}

// Errors stay mapped Graph SlateErrors (numeric upstream code) for chat classification.
export class WhatsAppChatClient {
  readonly phoneNumberId: string;
  private graph: WhatsAppGraphApi;

  constructor(config: WhatsAppChatClientConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.graph = new WhatsAppGraphApi({ token: config.token, apiVersion: config.apiVersion });
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers#get-a-single-phone-number
  async getPhoneNumber(): Promise<WhatsAppPhoneNumberInfo> {
    return this.graph.request<WhatsAppPhoneNumberInfo>(
      'GET',
      `/${encodeURIComponent(this.phoneNumberId)}`,
      { params: { fields: 'id,display_phone_number,verified_name,quality_rating' } }
    );
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
  async sendMessage(
    recipient: WhatsAppRecipient,
    payload: Record<string, unknown>
  ): Promise<WhatsAppSendResponse> {
    return this.graph.request<WhatsAppSendResponse>(
      'POST',
      `/${encodeURIComponent(this.phoneNumberId)}/messages`,
      {
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          ...recipient,
          ...payload
        }
      }
    );
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/mark-message-as-read
  async markRead(messageId: string): Promise<{ success?: boolean }> {
    return this.graph.request<{ success?: boolean }>(
      'POST',
      `/${encodeURIComponent(this.phoneNumberId)}/messages`,
      { body: { messaging_product: 'whatsapp', status: 'read', message_id: messageId } }
    );
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#upload-media
  async uploadMedia(input: {
    content: Buffer;
    filename: string;
    mimeType: string;
  }): Promise<{ id?: string }> {
    let form = new FormData();
    form.set('messaging_product', 'whatsapp');
    form.set('type', input.mimeType);
    form.set(
      'file',
      new Blob([new Uint8Array(input.content)], { type: input.mimeType }),
      input.filename
    );

    return this.graph.request<{ id?: string }>(
      'POST',
      `/${encodeURIComponent(this.phoneNumberId)}/media`,
      { body: form }
    );
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#get-media-url
  async getMedia(mediaId: string): Promise<WhatsAppMediaInfo> {
    return this.graph.request<WhatsAppMediaInfo>('GET', `/${encodeURIComponent(mediaId)}`, {
      params: { phone_number_id: this.phoneNumberId }
    });
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#delete-media
  async deleteMedia(mediaId: string): Promise<{ success?: boolean }> {
    return this.graph.request<{ success?: boolean }>(
      'DELETE',
      `/${encodeURIComponent(mediaId)}`,
      { params: { phone_number_id: this.phoneNumberId } }
    );
  }
}

export let createWhatsAppChatClient = (ctx: {
  auth: { token: string };
  config: { phoneNumberId: string; apiVersion?: string };
}) =>
  new WhatsAppChatClient({
    token: ctx.auth.token,
    phoneNumberId: ctx.config.phoneNumberId,
    apiVersion: ctx.config.apiVersion
  });

export let toMediaFileSize = (value: unknown) => {
  let size =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(size) ? size : undefined;
};
