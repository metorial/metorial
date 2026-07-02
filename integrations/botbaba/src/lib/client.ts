import { createAxios } from 'slates';

export interface Bot {
  botId: string;
  botName: string;
  [key: string]: unknown;
}

export interface SendWhatsAppTemplateParams {
  mobileNumber: string;
  templateName: string;
  blockName?: string;
  templateParameters?: Record<string, string>;
  [key: string]: unknown;
}

export type WhatsAppProvider = '360dialog' | 'gupshup';

export class BotbabaClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.botbaba.io/api',
      headers: {
        Authorization: config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async getBots(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/GetBots');
    let data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && Array.isArray(data.bots)) {
      return data.bots;
    }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    return Array.isArray(data) ? data : [data];
  }

  async sendWhatsAppTemplate(
    provider: WhatsAppProvider,
    params: SendWhatsAppTemplateParams
  ): Promise<Record<string, unknown>> {
    let endpoint =
      provider === '360dialog' ? '/SendWhatsAppWAMessages' : '/SendWhatsAppTemplateMessages';

    let body: Record<string, unknown> = {
      mobile: params.mobileNumber
    };

    if (params.templateName) {
      body.template = params.templateName;
    }

    if (params.blockName) {
      body.block = params.blockName;
    }

    if (params.templateParameters) {
      for (let [key, value] of Object.entries(params.templateParameters)) {
        body[key] = value;
      }
    }

    let response = await this.axios.post(endpoint, body);
    return response.data ?? { success: true };
  }
}
