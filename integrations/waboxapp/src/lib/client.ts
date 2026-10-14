import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let axios = createAuthenticatedAxios({
  baseURL: 'https://www.waboxapp.com/api',
  contentType: 'application/x-www-form-urlencoded',
  timeout: 30000,
  errorAdapter: error =>
    buildApiServiceError(error, { providerLabel: 'Waboxapp', reason: 'waboxapp_api_error' })
});

export class Client {
  constructor(
    private config: {
      token: string;
      phoneNumber: string;
    }
  ) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Waboxapp API token is required.');
    }
    if (!/^\d+$/.test(config.phoneNumber)) {
      throw createApiServiceError(
        'The linked account phone number must include the country code and contain digits only, without a + prefix.'
      );
    }
  }

  private async request(opts: {
    method: 'GET' | 'POST';
    path: string;
    data?: Record<string, string | undefined>;
  }): Promise<Record<string, unknown>> {
    let response = await axios<unknown>({
      method: opts.method,
      url: opts.path,
      params: { token: this.config.token },
      data: opts.data
        ? new URLSearchParams(pickDefined(opts.data) as Record<string, string>)
        : undefined
    });

    if (!isApiErrorRecord(response.data) || response.data.success !== true) {
      throw buildApiServiceError(
        { response: { status: response.status, data: response.data } },
        {
          providerLabel: 'Waboxapp',
          reason: 'waboxapp_api_error',
          operation: opts.path,
          fallbackMessage: 'The API did not confirm that the request was accepted.'
        }
      );
    }

    return response.data;
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
      path: `/status/${encodeURIComponent(this.config.phoneNumber)}`
    });
  }
}
