import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

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
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Botbaba auth token is required. Reconnect with your profile auth token.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.botbaba.io/api',
      authHeader: { value: config.token },
      timeout: 30_000,
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Botbaba', reason: 'botbaba_api_error' })
    });
  }

  async getBots(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/GetBots');
    let data: unknown = response.data;
    let bots = Array.isArray(data)
      ? data
      : isApiErrorRecord(data) && Array.isArray(data.bots)
        ? data.bots
        : isApiErrorRecord(data) && Array.isArray(data.data)
          ? data.data
          : isApiErrorRecord(data)
            ? [data]
            : undefined;

    if (!bots?.every(isApiErrorRecord)) {
      throw createApiServiceError('Botbaba returned an unexpected bot listing response.');
    }

    return bots;
  }

  async sendWhatsAppTemplate(
    provider: WhatsAppProvider,
    params: SendWhatsAppTemplateParams
  ): Promise<Record<string, unknown>> {
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

    let response = await this.sendWhatsAppTemplateRequest(provider, body);
    return isApiErrorRecord(response) ? response : response == null ? {} : { value: response };
  }

  async sendWhatsAppTemplateRequest(
    provider: WhatsAppProvider,
    requestBody: Record<string, unknown>
  ): Promise<unknown> {
    if (Object.keys(requestBody).length === 0) {
      throw createApiServiceError(
        'Copy the JSON request body from Actions → WhatsApp Users → Broadcast Template Message.'
      );
    }

    let endpoint =
      provider === '360dialog' ? '/SendWhatsAppWAMessages' : '/SendWhatsAppTemplateMessages';
    let response = await this.axios.post(endpoint, requestBody);
    return response.data ?? null;
  }
}
