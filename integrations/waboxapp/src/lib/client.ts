import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://www.waboxapp.com/api'
});

export class Client {
  constructor(
    private config: {
      token: string;
      phoneNumber: string;
    }
  ) {}

  private async request<T = any>(opts: {
    method: 'GET' | 'POST';
    path: string;
    data?: Record<string, string | undefined>;
  }): Promise<T> {
    let params: Record<string, string> = {
      token: this.config.token
    };

    let response = await axios({
      method: opts.method,
      url: opts.path,
      params,
      data: opts.data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data as T;
  }

  async sendChat(opts: { to: string; customUid: string; text: string }) {
    return this.request({
      method: 'POST',
      path: '/send/chat',
      data: {
        uid: this.config.phoneNumber,
        to: opts.to,
        custom_uid: opts.customUid,
        text: opts.text
      }
    });
  }

  async sendImage(opts: {
    to: string;
    customUid: string;
    url: string;
    caption?: string;
    description?: string;
  }) {
    return this.request({
      method: 'POST',
      path: '/send/image',
      data: {
        uid: this.config.phoneNumber,
        to: opts.to,
        custom_uid: opts.customUid,
        url: opts.url,
        caption: opts.caption,
        description: opts.description
      }
    });
  }

  async sendLink(opts: {
    to: string;
    customUid: string;
    url: string;
    caption?: string;
    description?: string;
    urlThumb?: string;
  }) {
    return this.request({
      method: 'POST',
      path: '/send/link',
      data: {
        uid: this.config.phoneNumber,
        to: opts.to,
        custom_uid: opts.customUid,
        url: opts.url,
        caption: opts.caption,
        description: opts.description,
        url_thumb: opts.urlThumb
      }
    });
  }

  async sendMedia(opts: {
    to: string;
    customUid: string;
    url: string;
    caption?: string;
    description?: string;
    urlThumb?: string;
  }) {
    return this.request({
      method: 'POST',
      path: '/send/media',
      data: {
        uid: this.config.phoneNumber,
        to: opts.to,
        custom_uid: opts.customUid,
        url: opts.url,
        caption: opts.caption,
        description: opts.description,
        url_thumb: opts.urlThumb
      }
    });
  }

  async getStatus() {
    return this.request({
      method: 'POST',
      path: `/status/${this.config.phoneNumber}`
    });
  }
}
