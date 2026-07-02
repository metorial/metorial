import { createAxios } from 'slates';

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
    throw new Error(`Provide exactly one of link or mediaId for ${mediaType}.`);
  }

  if (hasLink) {
    payload.link = media.link;
  } else {
    payload.id = media.mediaId;
  }
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
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
    this.axios = createAxios({
      baseURL: `https://graph.facebook.com/${config.apiVersion}`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Messaging ──

  async sendMessage(payload: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      ...payload
    });
    return response.data;
  }

  async sendTextMessage(to: string, body: string, previewUrl?: boolean): Promise<any> {
    return this.sendMessage({
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: previewUrl ?? false,
        body
      }
    });
  }

  async sendImageMessage(
    to: string,
    image: { link?: string; mediaId?: string; caption?: string }
  ): Promise<any> {
    let imagePayload: Record<string, any> = {};
    applyMediaSource(imagePayload, image, 'image messages');
    if (image.caption) imagePayload.caption = image.caption;

    return this.sendMessage({
      to,
      type: 'image',
      image: imagePayload
    });
  }

  async sendVideoMessage(
    to: string,
    video: { link?: string; mediaId?: string; caption?: string }
  ): Promise<any> {
    let videoPayload: Record<string, any> = {};
    applyMediaSource(videoPayload, video, 'video messages');
    if (video.caption) videoPayload.caption = video.caption;

    return this.sendMessage({
      to,
      type: 'video',
      video: videoPayload
    });
  }

  async sendAudioMessage(
    to: string,
    audio: { link?: string; mediaId?: string; voice?: boolean }
  ): Promise<any> {
    let audioPayload: Record<string, any> = {};
    applyMediaSource(audioPayload, audio, 'audio messages');
    if (audio.voice !== undefined) audioPayload.voice = audio.voice;

    return this.sendMessage({
      to,
      type: 'audio',
      audio: audioPayload
    });
  }

  async sendDocumentMessage(
    to: string,
    document: { link?: string; mediaId?: string; filename?: string; caption?: string }
  ): Promise<any> {
    let docPayload: Record<string, any> = {};
    applyMediaSource(docPayload, document, 'document messages');
    if (document.filename) docPayload.filename = document.filename;
    if (document.caption) docPayload.caption = document.caption;

    return this.sendMessage({
      to,
      type: 'document',
      document: docPayload
    });
  }

  async sendLocationMessage(
    to: string,
    location: { latitude: number; longitude: number; name?: string; address?: string }
  ): Promise<any> {
    return this.sendMessage({
      to,
      type: 'location',
      location
    });
  }

  async sendContactsMessage(to: string, contacts: any[]): Promise<any> {
    return this.sendMessage({
      to,
      type: 'contacts',
      contacts
    });
  }

  async sendStickerMessage(
    to: string,
    sticker: { link?: string; mediaId?: string }
  ): Promise<any> {
    let stickerPayload: Record<string, any> = {};
    applyMediaSource(stickerPayload, sticker, 'sticker messages');

    return this.sendMessage({
      to,
      type: 'sticker',
      sticker: stickerPayload
    });
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
    }
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

    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: payload
    });
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
    }
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

    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: payload
    });
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

  async markMessageAsRead(messageId: string): Promise<any> {
    let response = await this.axios.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    });
    return response.data;
  }

  // ── Message Templates ──

  async listTemplates(params?: {
    limit?: number;
    after?: string;
    fields?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;
    queryParams.fields = params?.fields || 'name,status,category,language,components,id';

    let response = await this.axios.get(`/${this.wabaId}/message_templates`, {
      params: queryParams
    });
    return response.data;
  }

  async createTemplate(template: {
    name: string;
    language: string;
    category: string;
    components: any[];
    allowCategoryChange?: boolean;
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

    let response = await this.axios.post(`/${this.wabaId}/message_templates`, payload);
    return response.data;
  }

  async deleteTemplate(name: string): Promise<any> {
    let response = await this.axios.delete(`/${this.wabaId}/message_templates`, {
      params: { name }
    });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/${templateId}`, {
      params: { fields: 'name,status,category,language,components,id' }
    });
    return response.data;
  }

  // ── Media Management ──

  async getMediaUrl(mediaId: string): Promise<any> {
    let response = await this.axios.get(`/${mediaId}`);
    return response.data;
  }

  async deleteMedia(mediaId: string): Promise<any> {
    let response = await this.axios.delete(`/${mediaId}`);
    return response.data;
  }

  // ── Business Profile ──

  async getBusinessProfile(): Promise<any> {
    let response = await this.axios.get(`/${this.phoneNumberId}/whatsapp_business_profile`, {
      params: {
        fields: 'about,address,description,email,websites,vertical,profile_picture_url'
      }
    });
    return response.data;
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

    let response = await this.axios.post(
      `/${this.phoneNumberId}/whatsapp_business_profile`,
      payload
    );
    return response.data;
  }

  // ── Phone Numbers ──

  async listPhoneNumbers(): Promise<any> {
    let response = await this.axios.get(`/${this.wabaId}/phone_numbers`);
    return response.data;
  }

  async getPhoneNumber(phoneNumberId: string): Promise<any> {
    let response = await this.axios.get(`/${phoneNumberId}`);
    return response.data;
  }

  async registerPhoneNumber(phoneNumberId: string, pin: string): Promise<any> {
    let response = await this.axios.post(`/${phoneNumberId}/register`, {
      messaging_product: 'whatsapp',
      pin
    });
    return response.data;
  }

  async deregisterPhoneNumber(phoneNumberId: string): Promise<any> {
    let response = await this.axios.post(`/${phoneNumberId}/deregister`);
    return response.data;
  }

  async requestVerificationCode(
    phoneNumberId: string,
    codeMethod: string,
    language: string
  ): Promise<any> {
    let response = await this.axios.post(`/${phoneNumberId}/request_code`, {
      code_method: codeMethod,
      language
    });
    return response.data;
  }

  async verifyCode(phoneNumberId: string, code: string): Promise<any> {
    let response = await this.axios.post(`/${phoneNumberId}/verify_code`, {
      code
    });
    return response.data;
  }
}
