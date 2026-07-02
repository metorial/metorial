import { createAxios } from '@slates/provider';
import { messengerApiError } from './errors';

export interface ClientConfig {
  token: string;
  pageId: string;
  apiVersion: string;
}

export interface SendMessageOptions {
  recipientId: string;
  messagingType?: string;
  tag?: string;
}

export interface TextMessage extends SendMessageOptions {
  text: string;
  quickReplies?: QuickReply[];
}

export interface AttachmentMessage extends SendMessageOptions {
  attachmentType: 'image' | 'video' | 'audio' | 'file';
  attachmentUrl?: string;
  attachmentId?: string;
  isReusable?: boolean;
}

export interface MultiImageMessage extends SendMessageOptions {
  imageUrls: string[];
}

export interface QuickReply {
  contentType: 'text' | 'user_phone_number' | 'user_email';
  title?: string;
  payload?: string;
  imageUrl?: string;
}

export interface ButtonItem {
  type: 'web_url' | 'postback' | 'phone_number';
  title: string;
  url?: string;
  payload?: string;
}

export interface GenericTemplateElement {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  defaultActionUrl?: string;
  buttons?: ButtonItem[];
}

export interface ReceiptTemplateItem {
  title: string;
  subtitle?: string;
  quantity?: number;
  price: number;
  currency?: string;
  imageUrl?: string;
}

export interface MessengerProfileSettings {
  getStartedPayload?: string;
  accountLinkingUrl?: string;
  greetingTexts?: Array<{ locale: string; text: string }>;
  persistentMenu?: Array<{
    locale: string;
    composerInputDisabled?: boolean;
    callToActions?: Array<{
      type: 'postback' | 'web_url' | 'nested';
      title: string;
      payload?: string;
      url?: string;
      callToActions?: Array<{
        type: 'postback' | 'web_url';
        title: string;
        payload?: string;
        url?: string;
      }>;
    }>;
  }>;
  iceBreakers?: Array<{
    question: string;
    payload: string;
  }>;
  whitelistedDomains?: string[];
}

export interface UploadedAttachment {
  attachmentId: string;
  attachmentType: 'image' | 'video' | 'audio' | 'file';
  reusable: boolean;
}

export interface UserProfile {
  recipientId: string;
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  locale?: string;
  timezone?: number;
  gender?: string;
}

export class Client {
  private token: string;
  private pageId: string;
  private apiVersion: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.pageId = config.pageId;
    this.apiVersion = config.apiVersion;
  }

  private createApi() {
    return createAxios({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      params: {
        access_token: this.token
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw messengerApiError(error, operation);
    }
  }

  // ─── Sending Messages ───────────────────────────────────────

  async sendTextMessage(options: TextMessage): Promise<any> {
    let api = this.createApi();
    let message: any = { text: options.text };

    if (options.quickReplies && options.quickReplies.length > 0) {
      message.quick_replies = options.quickReplies.map(qr => ({
        content_type: qr.contentType,
        title: qr.title,
        payload: qr.payload,
        image_url: qr.imageUrl
      }));
    }

    let body: any = {
      recipient: { id: options.recipientId },
      message,
      messaging_type: options.messagingType || 'RESPONSE'
    };

    if (options.tag) {
      body.tag = options.tag;
    }

    return this.request('send text message', () => api.post(`/${this.pageId}/messages`, body));
  }

  async sendAttachment(options: AttachmentMessage): Promise<any> {
    let api = this.createApi();
    let payload: any = options.attachmentId
      ? {
          attachment_id: options.attachmentId
        }
      : {
          url: options.attachmentUrl,
          is_reusable: options.isReusable || false
        };

    let body: any = {
      recipient: { id: options.recipientId },
      message: {
        attachment: {
          type: options.attachmentType,
          payload
        }
      },
      messaging_type: options.messagingType || 'RESPONSE'
    };

    if (options.tag) {
      body.tag = options.tag;
    }

    return this.request('send attachment', () => api.post(`/${this.pageId}/messages`, body));
  }

  async sendImageAttachments(options: MultiImageMessage): Promise<any> {
    let api = this.createApi();

    let body: any = {
      recipient: { id: options.recipientId },
      message: {
        attachments: options.imageUrls.map(url => ({
          type: 'image',
          payload: { url }
        }))
      },
      messaging_type: options.messagingType || 'RESPONSE'
    };

    if (options.tag) {
      body.tag = options.tag;
    }

    return this.request('send image attachments', () =>
      api.post(`/${this.pageId}/messages`, body)
    );
  }

  async uploadAttachment(options: {
    attachmentType: 'image' | 'video' | 'audio' | 'file';
    attachmentUrl: string;
    isReusable?: boolean;
  }): Promise<UploadedAttachment> {
    let api = this.createApi();

    let response = await this.request<any>('upload attachment', () =>
      api.post(`/${this.pageId}/message_attachments`, {
        message: {
          attachment: {
            type: options.attachmentType,
            payload: {
              url: options.attachmentUrl,
              is_reusable: options.isReusable ?? true
            }
          }
        }
      })
    );

    return {
      attachmentId: response.attachment_id,
      attachmentType: options.attachmentType,
      reusable: options.isReusable ?? true
    };
  }

  // ─── Templates ──────────────────────────────────────────────

  async sendGenericTemplate(
    options: SendMessageOptions & {
      elements: GenericTemplateElement[];
    }
  ): Promise<any> {
    let api = this.createApi();

    let body: any = {
      recipient: { id: options.recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: options.elements.map(el => ({
              title: el.title,
              subtitle: el.subtitle,
              image_url: el.imageUrl,
              default_action: el.defaultActionUrl
                ? {
                    type: 'web_url',
                    url: el.defaultActionUrl
                  }
                : undefined,
              buttons: el.buttons?.map(btn => this.formatButton(btn))
            }))
          }
        }
      },
      messaging_type: options.messagingType || 'RESPONSE'
    };

    if (options.tag) {
      body.tag = options.tag;
    }

    return this.request('send generic template', () =>
      api.post(`/${this.pageId}/messages`, body)
    );
  }

  async sendButtonTemplate(
    options: SendMessageOptions & {
      text: string;
      buttons: ButtonItem[];
    }
  ): Promise<any> {
    let api = this.createApi();

    let body: any = {
      recipient: { id: options.recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: options.text,
            buttons: options.buttons.map(btn => this.formatButton(btn))
          }
        }
      },
      messaging_type: options.messagingType || 'RESPONSE'
    };

    if (options.tag) {
      body.tag = options.tag;
    }

    return this.request('send button template', () =>
      api.post(`/${this.pageId}/messages`, body)
    );
  }

  async sendMediaTemplate(
    options: SendMessageOptions & {
      mediaType: 'image' | 'video';
      mediaUrl?: string;
      attachmentId?: string;
      buttons?: ButtonItem[];
    }
  ): Promise<any> {
    let api = this.createApi();

    let elementPayload: any = {
      media_type: options.mediaType
    };

    if (options.mediaUrl) {
      elementPayload.url = options.mediaUrl;
    } else if (options.attachmentId) {
      elementPayload.attachment_id = options.attachmentId;
    }

    if (options.buttons && options.buttons.length > 0) {
      elementPayload.buttons = options.buttons.map(btn => this.formatButton(btn));
    }

    let body: any = {
      recipient: { id: options.recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'media',
            elements: [elementPayload]
          }
        }
      },
      messaging_type: options.messagingType || 'RESPONSE'
    };

    if (options.tag) {
      body.tag = options.tag;
    }

    return this.request('send media template', () =>
      api.post(`/${this.pageId}/messages`, body)
    );
  }

  async sendReceiptTemplate(
    options: SendMessageOptions & {
      recipientName: string;
      orderNumber: string;
      currency: string;
      paymentMethod: string;
      orderUrl?: string;
      timestamp?: string;
      items: ReceiptTemplateItem[];
      subtotal?: number;
      shippingCost?: number;
      totalTax?: number;
      totalCost: number;
    }
  ): Promise<any> {
    let api = this.createApi();

    let payload: any = {
      template_type: 'receipt',
      recipient_name: options.recipientName,
      order_number: options.orderNumber,
      currency: options.currency,
      payment_method: options.paymentMethod,
      elements: options.items.map(item => ({
        title: item.title,
        subtitle: item.subtitle,
        quantity: item.quantity,
        price: item.price,
        currency: item.currency,
        image_url: item.imageUrl
      })),
      summary: {
        subtotal: options.subtotal,
        shipping_cost: options.shippingCost,
        total_tax: options.totalTax,
        total_cost: options.totalCost
      }
    };

    if (options.orderUrl) {
      payload.order_url = options.orderUrl;
    }
    if (options.timestamp) {
      payload.timestamp = options.timestamp;
    }

    let body: any = {
      recipient: { id: options.recipientId },
      message: {
        attachment: {
          type: 'template',
          payload
        }
      },
      messaging_type: options.messagingType || 'RESPONSE'
    };

    if (options.tag) {
      body.tag = options.tag;
    }

    return this.request('send receipt template', () =>
      api.post(`/${this.pageId}/messages`, body)
    );
  }

  private formatButton(btn: ButtonItem): any {
    let formatted: any = {
      type: btn.type,
      title: btn.title
    };

    if (btn.type === 'web_url' && btn.url) {
      formatted.url = btn.url;
    } else if (btn.type === 'postback' && btn.payload) {
      formatted.payload = btn.payload;
    } else if (btn.type === 'phone_number' && btn.payload) {
      formatted.payload = btn.payload;
    }

    return formatted;
  }

  // ─── Sender Actions ─────────────────────────────────────────

  async sendSenderAction(
    recipientId: string,
    action: 'typing_on' | 'typing_off' | 'mark_seen'
  ): Promise<any> {
    let api = this.createApi();

    return this.request('send sender action', () =>
      api.post(`/${this.pageId}/messages`, {
        recipient: { id: recipientId },
        sender_action: action
      })
    );
  }

  // ─── User Profile ──────────────────────────────────────────

  async getUserProfile(recipientId: string, fields?: string[]): Promise<UserProfile> {
    let api = this.createApi();

    let profileFields = fields || [
      'first_name',
      'last_name',
      'profile_pic',
      'locale',
      'timezone',
      'gender'
    ];

    let data = await this.request<any>('get user profile', () =>
      api.get(`/${recipientId}`, {
        params: {
          fields: profileFields.join(',')
        }
      })
    );
    return {
      recipientId,
      firstName: data.first_name,
      lastName: data.last_name,
      profilePic: data.profile_pic,
      locale: data.locale,
      timezone: data.timezone,
      gender: data.gender
    };
  }

  // ─── Messenger Profile Management ──────────────────────────

  async getMessengerProfile(fields: string[]): Promise<any> {
    let api = this.createApi();

    let response = await this.request<any>('get Messenger profile', () =>
      api.get(`/${this.pageId}/messenger_profile`, {
        params: {
          fields: fields.join(',')
        }
      })
    );

    return response.data;
  }

  async setMessengerProfile(settings: MessengerProfileSettings): Promise<any> {
    let api = this.createApi();

    let payload: any = {};

    if (settings.getStartedPayload !== undefined) {
      payload.get_started = { payload: settings.getStartedPayload };
    }

    if (settings.accountLinkingUrl !== undefined) {
      payload.account_linking_url = settings.accountLinkingUrl;
    }

    if (settings.greetingTexts !== undefined) {
      payload.greeting = settings.greetingTexts.map(g => ({
        locale: g.locale,
        text: g.text
      }));
    }

    if (settings.persistentMenu !== undefined) {
      payload.persistent_menu = settings.persistentMenu.map(menu => ({
        locale: menu.locale,
        composer_input_disabled: menu.composerInputDisabled || false,
        call_to_actions: menu.callToActions?.map(action => this.formatMenuAction(action))
      }));
    }

    if (settings.iceBreakers !== undefined) {
      payload.ice_breakers = settings.iceBreakers.map(ib => ({
        question: ib.question,
        payload: ib.payload
      }));
    }

    if (settings.whitelistedDomains !== undefined) {
      payload.whitelisted_domains = settings.whitelistedDomains;
    }

    return this.request('set Messenger profile', () =>
      api.post(`/${this.pageId}/messenger_profile`, payload)
    );
  }

  async deleteMessengerProfileFields(fields: string[]): Promise<any> {
    let api = this.createApi();

    return this.request('delete Messenger profile fields', () =>
      api.delete(`/${this.pageId}/messenger_profile`, {
        data: { fields }
      })
    );
  }

  private formatMenuAction(action: any): any {
    let formatted: any = {
      type: action.type,
      title: action.title
    };

    if (action.type === 'web_url' && action.url) {
      formatted.url = action.url;
    } else if (action.type === 'postback' && action.payload) {
      formatted.payload = action.payload;
    } else if (action.type === 'nested' && action.callToActions) {
      formatted.call_to_actions = action.callToActions.map((sub: any) =>
        this.formatMenuAction(sub)
      );
    }

    return formatted;
  }

  // ─── Handover Protocol ─────────────────────────────────────

  async passThreadControl(
    recipientId: string,
    targetAppId: string,
    metadata?: string
  ): Promise<any> {
    let api = this.createApi();

    let body: any = {
      recipient: { id: recipientId },
      target_app_id: targetAppId
    };

    if (metadata) {
      body.metadata = metadata;
    }

    return this.request('pass thread control', () =>
      api.post(`/${this.pageId}/pass_thread_control`, body)
    );
  }

  async takeThreadControl(recipientId: string, metadata?: string): Promise<any> {
    let api = this.createApi();

    let body: any = {
      recipient: { id: recipientId }
    };

    if (metadata) {
      body.metadata = metadata;
    }

    return this.request('take thread control', () =>
      api.post(`/${this.pageId}/take_thread_control`, body)
    );
  }

  async requestThreadControl(recipientId: string, metadata?: string): Promise<any> {
    let api = this.createApi();

    let body: any = {
      recipient: { id: recipientId }
    };

    if (metadata) {
      body.metadata = metadata;
    }

    return this.request('request thread control', () =>
      api.post(`/${this.pageId}/request_thread_control`, body)
    );
  }

  async getThreadOwner(recipientId: string): Promise<{ ownerAppId?: string; raw: any }> {
    let api = this.createApi();
    let response = await this.request<any>('get thread owner', () =>
      api.get(`/${this.pageId}/thread_owner`, {
        params: {
          recipient: JSON.stringify({ id: recipientId })
        }
      })
    );

    return {
      ownerAppId: response.data?.[0]?.thread_owner?.app_id,
      raw: response
    };
  }

  async listSecondaryReceivers(): Promise<Array<{ id: string; name?: string }>> {
    let api = this.createApi();
    let response = await this.request<any>('list secondary receivers', () =>
      api.get(`/${this.pageId}/secondary_receivers`)
    );

    return response.data || [];
  }
}
