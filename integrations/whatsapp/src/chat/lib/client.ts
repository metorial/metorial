import type { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { whatsappGraphErrorMapping } from '../../lib/graphErrors';

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

/** Recipient fields for the Messages API: phone number (`to`) or business-scoped user id (`recipient`). */
export type WhatsAppRecipient = { to: string } | { recipient: string };

export interface WhatsAppChatClientConfig {
  token: string;
  phoneNumberId: string;
  apiVersion?: string;
}

export let DEFAULT_WHATSAPP_API_VERSION = 'v21.0';

/**
 * Minimal Cloud API client for the chat adapter. Errors keep the Graph API's
 * numeric error code as the upstream code so the chat boundary can classify them.
 */
export class WhatsAppChatClient {
  readonly phoneNumberId: string;
  private axios: ReturnType<typeof createAxios>;

  constructor(config: WhatsAppChatClientConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.axios = createAxios({
      baseURL: `https://graph.facebook.com/${config.apiVersion || DEFAULT_WHATSAPP_API_VERSION}`,
      headers: { Authorization: `Bearer ${config.token}` },
      errorMapping: whatsappGraphErrorMapping
    });
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers#get-a-single-phone-number
  async getPhoneNumber(): Promise<WhatsAppPhoneNumberInfo> {
    let response = await this.axios.get(`/${encodeURIComponent(this.phoneNumberId)}`, {
      params: { fields: 'id,display_phone_number,verified_name,quality_rating' }
    });
    return response.data as WhatsAppPhoneNumberInfo;
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
  async sendMessage(
    recipient: WhatsAppRecipient,
    payload: Record<string, unknown>
  ): Promise<WhatsAppSendResponse> {
    let response = await this.axios.post(
      `/${encodeURIComponent(this.phoneNumberId)}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        ...recipient,
        ...payload
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data as WhatsAppSendResponse;
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/mark-message-as-read
  async markRead(messageId: string): Promise<{ success?: boolean }> {
    let response = await this.axios.post(
      `/${encodeURIComponent(this.phoneNumberId)}/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data as { success?: boolean };
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

    let response = await this.axios.post(
      `/${encodeURIComponent(this.phoneNumberId)}/media`,
      form
    );
    return response.data as { id?: string };
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#get-media-url
  async getMedia(mediaId: string): Promise<WhatsAppMediaInfo> {
    let response = await this.axios.get(`/${encodeURIComponent(mediaId)}`, {
      params: { phone_number_id: this.phoneNumberId }
    });
    return response.data as WhatsAppMediaInfo;
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#delete-media
  async deleteMedia(mediaId: string): Promise<{ success?: boolean }> {
    let response = await this.axios.delete(`/${encodeURIComponent(mediaId)}`, {
      params: { phone_number_id: this.phoneNumberId }
    });
    return response.data as { success?: boolean };
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
