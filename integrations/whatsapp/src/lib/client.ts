import { createApiServiceError } from 'slates';
import {
  WhatsAppGraphApi,
  type WhatsAppGraphMethod,
  type WhatsAppGraphRequestOptions
} from './graph';
import { toWhatsAppServiceError } from './graphErrors';

type MediaSource = {
  link?: string;
  mediaId?: string;
};

let hasMediaValue = (value: string | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

let applyMediaSource = (
  payload: Record<string, any>,
  media: MediaSource,
  mediaType: string
) => {
  let hasLink = hasMediaValue(media.link);
  let hasMediaId = hasMediaValue(media.mediaId);

  if (hasLink === hasMediaId) {
    throw createApiServiceError(`Provide exactly one of link or mediaId for ${mediaType}.`);
  }

  if (hasLink) {
    payload.link = media.link;
  } else {
    payload.id = media.mediaId;
  }
};

let TEMPLATE_FIELDS =
  'id,name,status,category,language,components,parameter_format,quality_score,rejected_reason';

export class Client {
  private graph: WhatsAppGraphApi;
  private phoneNumberId: string;
  private wabaId: string;

  constructor(config: {
    token: string;
    phoneNumberId: string;
    wabaId: string;
    apiVersion: string;
  }) {
    this.phoneNumberId = config.phoneNumberId;
    this.wabaId = config.wabaId;
    this.graph = new WhatsAppGraphApi({ token: config.token, apiVersion: config.apiVersion });
  }

  private async request(
    operation: string,
    method: WhatsAppGraphMethod,
    path: string,
    options?: WhatsAppGraphRequestOptions
  ): Promise<any> {
    try {
      return await this.graph.request(method, path, options);
    } catch (error) {
      throw toWhatsAppServiceError(error, operation);
    }
  }

  // ── Messaging ──

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
  // `context.message_id` makes the message a contextual reply:
  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/contextual-replies
  async sendMessage(payload: Record<string, any>, replyToMessageId?: string): Promise<any> {
    return this.request('send message', 'POST', `/${this.phoneNumberId}/messages`, {
      body: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
        ...payload
      }
    });
  }

  async sendTextMessage(
    to: string,
    body: string,
    previewUrl?: boolean,
    replyToMessageId?: string
  ): Promise<any> {
    return this.sendMessage(
      {
        to,
        type: 'text',
        text: {
          preview_url: previewUrl ?? false,
          body
        }
      },
      replyToMessageId
    );
  }

  async sendImageMessage(
    to: string,
    image: { link?: string; mediaId?: string; caption?: string },
    replyToMessageId?: string
  ): Promise<any> {
    let imagePayload: Record<string, any> = {};
    applyMediaSource(imagePayload, image, 'image messages');
    if (image.caption) imagePayload.caption = image.caption;

    return this.sendMessage(
      {
        to,
        type: 'image',
        image: imagePayload
      },
      replyToMessageId
    );
  }

  async sendVideoMessage(
    to: string,
    video: { link?: string; mediaId?: string; caption?: string },
    replyToMessageId?: string
  ): Promise<any> {
    let videoPayload: Record<string, any> = {};
    applyMediaSource(videoPayload, video, 'video messages');
    if (video.caption) videoPayload.caption = video.caption;

    return this.sendMessage(
      {
        to,
        type: 'video',
        video: videoPayload
      },
      replyToMessageId
    );
  }

  async sendAudioMessage(
    to: string,
    audio: { link?: string; mediaId?: string; voice?: boolean },
    replyToMessageId?: string
  ): Promise<any> {
    let audioPayload: Record<string, any> = {};
    applyMediaSource(audioPayload, audio, 'audio messages');
    if (audio.voice !== undefined) audioPayload.voice = audio.voice;

    return this.sendMessage(
      {
        to,
        type: 'audio',
        audio: audioPayload
      },
      replyToMessageId
    );
  }

  async sendDocumentMessage(
    to: string,
    document: { link?: string; mediaId?: string; filename?: string; caption?: string },
    replyToMessageId?: string
  ): Promise<any> {
    let docPayload: Record<string, any> = {};
    applyMediaSource(docPayload, document, 'document messages');
    if (document.filename) docPayload.filename = document.filename;
    if (document.caption) docPayload.caption = document.caption;

    return this.sendMessage(
      {
        to,
        type: 'document',
        document: docPayload
      },
      replyToMessageId
    );
  }

  async sendLocationMessage(
    to: string,
    location: { latitude: number; longitude: number; name?: string; address?: string },
    replyToMessageId?: string
  ): Promise<any> {
    return this.sendMessage(
      {
        to,
        type: 'location',
        location
      },
      replyToMessageId
    );
  }

  async sendContactsMessage(
    to: string,
    contacts: any[],
    replyToMessageId?: string
  ): Promise<any> {
    return this.sendMessage(
      {
        to,
        type: 'contacts',
        contacts
      },
      replyToMessageId
    );
  }

  async sendStickerMessage(
    to: string,
    sticker: { link?: string; mediaId?: string },
    replyToMessageId?: string
  ): Promise<any> {
    let stickerPayload: Record<string, any> = {};
    applyMediaSource(stickerPayload, sticker, 'sticker messages');

    return this.sendMessage(
      {
        to,
        type: 'sticker',
        sticker: stickerPayload
      },
      replyToMessageId
    );
  }

  async sendReactionMessage(to: string, messageId: string, emoji: string): Promise<any> {
    return this.sendMessage({
      to,
      type: 'reaction',
      reaction: {
        message_id: messageId,
        emoji
      }
    });
  }

  async sendInteractiveButtonsMessage(
    to: string,
    interactive: {
      header?: { type: string; text?: string };
      body: string;
      footer?: string;
      buttons: Array<{ id: string; title: string }>;
    },
    replyToMessageId?: string
  ): Promise<any> {
    let payload: Record<string, any> = {
      type: 'button',
      body: { text: interactive.body },
      action: {
        buttons: interactive.buttons.map(btn => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title }
        }))
      }
    };
    if (interactive.header) payload.header = interactive.header;
    if (interactive.footer) payload.footer = { text: interactive.footer };

    return this.sendMessage(
      {
        to,
        type: 'interactive',
        interactive: payload
      },
      replyToMessageId
    );
  }

  async sendInteractiveListMessage(
    to: string,
    interactive: {
      header?: { type: string; text?: string };
      body: string;
      footer?: string;
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    },
    replyToMessageId?: string
  ): Promise<any> {
    let payload: Record<string, any> = {
      type: 'list',
      body: { text: interactive.body },
      action: {
        button: interactive.buttonText,
        sections: interactive.sections
      }
    };
    if (interactive.header) payload.header = interactive.header;
    if (interactive.footer) payload.footer = { text: interactive.footer };

    return this.sendMessage(
      {
        to,
        type: 'interactive',
        interactive: payload
      },
      replyToMessageId
    );
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-cta-url-messages
  async sendInteractiveCtaUrlMessage(
    to: string,
    interactive: {
      header?: { type: string; text?: string };
      body: string;
      footer?: string;
      displayText: string;
      url: string;
    },
    replyToMessageId?: string
  ): Promise<any> {
    let payload: Record<string, any> = {
      type: 'cta_url',
      body: { text: interactive.body },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: interactive.displayText,
          url: interactive.url
        }
      }
    };
    if (interactive.header) payload.header = interactive.header;
    if (interactive.footer) payload.footer = { text: interactive.footer };

    return this.sendMessage(
      {
        to,
        type: 'interactive',
        interactive: payload
      },
      replyToMessageId
    );
  }

  async sendTemplateMessage(
    to: string,
    template: {
      name: string;
      languageCode: string;
      components?: any[];
    }
  ): Promise<any> {
    let templatePayload: Record<string, any> = {
      name: template.name,
      language: { code: template.languageCode }
    };
    if (template.components && template.components.length > 0) {
      templatePayload.components = template.components;
    }

    return this.sendMessage({
      to,
      type: 'template',
      template: templatePayload
    });
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/mark-message-as-read
  // https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators
  async markMessageAsRead(messageId: string, showTypingIndicator?: boolean): Promise<any> {
    return this.request('mark message as read', 'POST', `/${this.phoneNumberId}/messages`, {
      body: {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        ...(showTypingIndicator ? { typing_indicator: { type: 'text' } } : {})
      }
    });
  }

  // ── Message Templates ──

  // https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/message_templates/
  async listTemplates(params?: {
    limit?: number;
    after?: string;
    fields?: string;
    name?: string;
    status?: string;
    category?: string;
    language?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;
    if (params?.name) queryParams.name = params.name;
    if (params?.status) queryParams.status = params.status;
    if (params?.category) queryParams.category = params.category;
    if (params?.language) queryParams.language = params.language;
    queryParams.fields = params?.fields || TEMPLATE_FIELDS;

    return this.request('list templates', 'GET', `/${this.wabaId}/message_templates`, {
      params: queryParams
    });
  }

  async createTemplate(template: {
    name: string;
    language: string;
    category: string;
    components: any[];
    allowCategoryChange?: boolean;
    parameterFormat?: string;
  }): Promise<any> {
    let payload: Record<string, any> = {
      name: template.name,
      language: template.language,
      category: template.category,
      components: template.components
    };
    if (template.allowCategoryChange !== undefined) {
      payload.allow_category_change = template.allowCategoryChange;
    }
    if (template.parameterFormat) payload.parameter_format = template.parameterFormat;

    return this.request('create template', 'POST', `/${this.wabaId}/message_templates`, {
      body: payload
    });
  }

  // https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api
  async updateTemplate(
    templateId: string,
    update: {
      category?: string;
      components?: any[];
      parameterFormat?: string;
      allowCategoryChange?: boolean;
    }
  ): Promise<any> {
    let payload: Record<string, any> = {};
    if (update.category) payload.category = update.category;
    if (update.components) payload.components = update.components;
    if (update.parameterFormat) payload.parameter_format = update.parameterFormat;
    if (update.allowCategoryChange !== undefined) {
      payload.allow_category_change = update.allowCategoryChange;
    }

    return this.request('update template', 'POST', `/${encodeURIComponent(templateId)}`, {
      body: payload
    });
  }

  // `hsm_id` with `name` deletes one language version; `name` alone deletes every language.
  // https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-management
  async deleteTemplate(name: string, templateId?: string): Promise<any> {
    return this.request('delete template', 'DELETE', `/${this.wabaId}/message_templates`, {
      params: templateId ? { name, hsm_id: templateId } : { name }
    });
  }

  async getTemplate(templateId: string): Promise<any> {
    return this.request('get template', 'GET', `/${encodeURIComponent(templateId)}`, {
      params: { fields: TEMPLATE_FIELDS }
    });
  }

  // ── Media Management ──

  async getMediaUrl(mediaId: string): Promise<any> {
    return this.request('get media URL', 'GET', `/${mediaId}`);
  }

  async deleteMedia(mediaId: string): Promise<any> {
    return this.request('delete media', 'DELETE', `/${mediaId}`);
  }

  // ── Business Profile ──

  async getBusinessProfile(): Promise<any> {
    return this.request(
      'get business profile',
      'GET',
      `/${this.phoneNumberId}/whatsapp_business_profile`,
      {
        params: {
          fields: 'about,address,description,email,websites,vertical,profile_picture_url'
        }
      }
    );
  }

  async updateBusinessProfile(profile: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string;
    profilePictureHandle?: string;
  }): Promise<any> {
    let payload: Record<string, any> = {
      messaging_product: 'whatsapp'
    };
    if (profile.about !== undefined) payload.about = profile.about;
    if (profile.address !== undefined) payload.address = profile.address;
    if (profile.description !== undefined) payload.description = profile.description;
    if (profile.email !== undefined) payload.email = profile.email;
    if (profile.websites !== undefined) payload.websites = profile.websites;
    if (profile.vertical !== undefined) payload.vertical = profile.vertical;
    if (profile.profilePictureHandle !== undefined)
      payload.profile_picture_handle = profile.profilePictureHandle;

    return this.request(
      'update business profile',
      'POST',
      `/${this.phoneNumberId}/whatsapp_business_profile`,
      { body: payload }
    );
  }

  // ── Phone Numbers ──

  async listPhoneNumbers(): Promise<any> {
    return this.request('list phone numbers', 'GET', `/${this.wabaId}/phone_numbers`);
  }

  async getPhoneNumber(phoneNumberId: string): Promise<any> {
    return this.request('get phone number', 'GET', `/${phoneNumberId}`);
  }

  async registerPhoneNumber(phoneNumberId: string, pin: string): Promise<any> {
    return this.request('register phone number', 'POST', `/${phoneNumberId}/register`, {
      body: { messaging_product: 'whatsapp', pin }
    });
  }

  async deregisterPhoneNumber(phoneNumberId: string): Promise<any> {
    return this.request('deregister phone number', 'POST', `/${phoneNumberId}/deregister`);
  }

  async requestVerificationCode(
    phoneNumberId: string,
    codeMethod: string,
    language: string
  ): Promise<any> {
    return this.request(
      'request verification code',
      'POST',
      `/${phoneNumberId}/request_code`,
      {
        body: { code_method: codeMethod, language }
      }
    );
  }

  async verifyCode(phoneNumberId: string, code: string): Promise<any> {
    return this.request('verify code', 'POST', `/${phoneNumberId}/verify_code`, {
      body: { code }
    });
  }
}
