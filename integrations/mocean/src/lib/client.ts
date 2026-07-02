import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://rest.moceanapi.com'
});

export class MoceanClient {
  private token: string;
  private apiKey?: string;
  private apiSecret?: string;

  constructor(config: { token: string; apiKey?: string; apiSecret?: string }) {
    this.token = config.token;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  private getHeaders(): Record<string, string> {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  private getBasicAuthHeaders(): Record<string, string> {
    if (this.apiKey && this.apiSecret) {
      let encoded = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
    return this.getHeaders();
  }

  private getAuthParams(): Record<string, string> {
    if (this.token) {
      return {};
    }
    if (this.apiKey && this.apiSecret) {
      return {
        'mocean-api-key': this.apiKey,
        'mocean-api-secret': this.apiSecret
      };
    }
    return {};
  }

  // ==================== SMS ====================

  async sendSms(params: {
    from: string;
    to: string;
    text: string;
    coding?: number;
    udh?: string;
    dlrMask?: number;
    dlrUrl?: string;
    schedule?: string;
    flashSms?: boolean;
    charset?: string;
    validity?: number;
  }) {
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-from': params.from,
      'mocean-to': params.to,
      'mocean-text': params.text,
      'mocean-resp-format': 'json'
    };

    if (params.coding !== undefined) body['mocean-coding'] = params.coding;
    if (params.udh) body['mocean-udh'] = params.udh;
    if (params.dlrMask !== undefined) body['mocean-dlr-mask'] = params.dlrMask;
    if (params.dlrUrl) body['mocean-dlr-url'] = params.dlrUrl;
    if (params.schedule) body['mocean-schedule'] = params.schedule;
    if (params.flashSms) {
      body['mocean-mclass'] = 1;
      body['mocean-alt-dcs'] = 1;
    }
    if (params.charset) body['mocean-charset'] = params.charset;
    if (params.validity !== undefined) body['mocean-validity'] = params.validity;

    let response = await http.post('/rest/2/sms', body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getMessageStatus(messageId: string) {
    let params: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-msgid': messageId,
      'mocean-resp-format': 'json'
    };

    let response = await http.get('/rest/2/report/message', {
      params,
      headers: this.getHeaders()
    });

    return response.data;
  }

  // ==================== Voice ====================

  async makeVoiceCall(params: {
    to: string;
    command: any[];
    from?: string;
    eventUrl?: string;
  }) {
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-to': params.to,
      'mocean-command': JSON.stringify(params.command),
      'mocean-resp-format': 'json'
    };

    if (params.from) body['mocean-from'] = params.from;
    if (params.eventUrl) body['mocean-event-url'] = params.eventUrl;

    let response = await http.post('/rest/2/voice/dial', body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async hangupCall(callUuid: string) {
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-call-uuid': callUuid,
      'mocean-resp-format': 'json'
    };

    let response = await http.post('/rest/2/voice/hangup', body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  // ==================== Verify ====================

  async sendVerification(params: {
    to: string;
    brand: string;
    from?: string;
    codeLength?: number;
    pinValidity?: number;
    nextEventWait?: number;
    requestNl?: boolean;
    channel?: 'sms' | 'telegram';
  }) {
    let channel = params.channel || 'sms';
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-to': params.to,
      'mocean-brand': params.brand,
      'mocean-resp-format': 'json'
    };

    if (params.from) body['mocean-from'] = params.from;
    if (params.codeLength !== undefined) body['mocean-code-length'] = params.codeLength;
    if (params.pinValidity !== undefined) body['mocean-pin-validity'] = params.pinValidity;
    if (params.nextEventWait !== undefined)
      body['mocean-next-event-wait'] = params.nextEventWait;
    if (params.requestNl) body['mocean-request-nl'] = 1;

    let response = await http.post(`/rest/2/verify/req/${channel}`, body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async checkVerification(params: { requestId: string; code: string }) {
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-reqid': params.requestId,
      'mocean-code': params.code,
      'mocean-resp-format': 'json'
    };

    let response = await http.post('/rest/2/verify/check', body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async resendVerification(params: { requestId: string; requestNl?: boolean }) {
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-reqid': params.requestId,
      'mocean-resp-format': 'json'
    };

    if (params.requestNl) body['mocean-request-nl'] = 1;

    let response = await http.post('/rest/2/verify/resend/sms', body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  // ==================== Number Lookup ====================

  async numberLookup(params: { to: string; callbackUrl?: string }) {
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-to': params.to,
      'mocean-resp-format': 'json'
    };

    if (params.callbackUrl) body['mocean-nl-url'] = params.callbackUrl;

    let response = await http.post('/rest/2/nl', body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  // ==================== WhatsApp ====================

  async sendWhatsApp(params: { from: string; to: string; content: any; eventUrl?: string }) {
    let body: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-from': params.from,
      'mocean-to': params.to,
      'mocean-content': params.content,
      'mocean-resp-format': 'json'
    };

    if (params.eventUrl) body['mocean-event-url'] = params.eventUrl;

    let response = await http.post('/rest/2/send-message/whatsapp', body, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  // ==================== WhatsApp Template Management ====================

  async listTemplates(params?: { name?: string; limit?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.name) queryParams.name = params.name;
    if (params?.limit !== undefined) queryParams.limit = params.limit;

    let response = await http.get('/template/whatsapp/message_templates', {
      params: queryParams,
      headers: this.getBasicAuthHeaders()
    });

    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await http.get(`/template/whatsapp/${templateId}`, {
      headers: this.getBasicAuthHeaders()
    });

    return response.data;
  }

  async createTemplate(params: {
    name: string;
    language: string;
    category: string;
    components: any[];
  }) {
    let response = await http.post('/template/whatsapp/message_templates', params, {
      headers: {
        ...this.getBasicAuthHeaders(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async editTemplate(params: {
    name: string;
    templateId: string;
    components?: any[];
    category?: string;
  }) {
    let body: Record<string, any> = {};
    if (params.components) body.components = params.components;
    if (params.category) body.category = params.category;

    let response = await http.post(
      `/template/whatsapp/message_templates?name=${encodeURIComponent(params.name)}&hsm-id=${encodeURIComponent(params.templateId)}`,
      body,
      {
        headers: {
          ...this.getBasicAuthHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  async deleteTemplate(params: { name: string; templateId: string }) {
    let response = await http.delete('/template/whatsapp/message_templates', {
      params: {
        name: params.name,
        hsm_id: params.templateId
      },
      headers: this.getBasicAuthHeaders()
    });

    return response.data;
  }

  // ==================== Account ====================

  async getBalance() {
    let params: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-resp-format': 'json'
    };

    let response = await http.get('/rest/2/account/balance', {
      params,
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getPricing() {
    let params: Record<string, any> = {
      ...this.getAuthParams(),
      'mocean-resp-format': 'json'
    };

    let response = await http.get('/rest/2/account/pricing', {
      params,
      headers: this.getHeaders()
    });

    return response.data;
  }
}
