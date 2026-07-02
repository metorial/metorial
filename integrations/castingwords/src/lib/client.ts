import { createAxios } from 'slates';

let BASE_URL = 'https://castingwords.com/store/API4';

export class Client {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async orderTranscription(params: {
    urls: string[];
    skus?: string[];
    notes?: string;
    speakerNames?: string[];
    test?: boolean;
  }) {
    let body: Record<string, unknown> = {
      api_key: this.token,
      url: params.urls
    };

    if (params.skus && params.skus.length > 0) {
      body.sku = params.skus;
    }
    if (params.notes) {
      body.notes = params.notes;
    }
    if (params.speakerNames && params.speakerNames.length > 0) {
      body.names = params.speakerNames;
    }
    if (params.test) {
      body.test = '1';
    }

    let response = await this.axios.post('/order_url', body);
    return response.data;
  }

  async getAudiofileDetails(audiofileId: number) {
    let response = await this.axios.get(`/audiofile/${audiofileId}`, {
      params: { api_key: this.token }
    });
    return response.data;
  }

  async getTranscript(audiofileId: number, format: 'txt' | 'doc' | 'rtf' | 'html') {
    let response = await this.axios.get(`/audiofile/${audiofileId}/transcript.${format}`, {
      params: { api_key: this.token }
    });
    return response.data;
  }

  async upgradeAudiofile(audiofileId: number, skus: string[], test?: boolean) {
    let body: Record<string, unknown> = {
      api_key: this.token,
      sku: skus
    };
    if (test) {
      body.test = '1';
    }

    let response = await this.axios.post(`/audiofile/${audiofileId}/upgrade`, body);
    return response.data;
  }

  async refundAudiofile(audiofileId: number, test?: boolean) {
    let body: Record<string, unknown> = {
      api_key: this.token
    };
    if (test) {
      body.test = '1';
    }

    let response = await this.axios.post(`/audiofile/${audiofileId}/refund`, body);
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    let response = await this.axios.get(`/invoice/${invoiceId}`, {
      params: { api_key: this.token }
    });
    return response.data;
  }

  async getPrepayBalance() {
    let response = await this.axios.get('/prepay_balance', {
      params: { api_key: this.token }
    });
    return response.data;
  }

  async getWebhook() {
    let response = await this.axios.get('/webhook', {
      params: { api_key: this.token }
    });
    return response.data;
  }

  async registerWebhook(webhookUrl: string) {
    let response = await this.axios.post('/webhook', {
      api_key: this.token,
      webhook: webhookUrl
    });
    return response.data;
  }

  async testWebhook(eventType: string) {
    let response = await this.axios.post(`/webhook/test/${eventType}`, {
      api_key: this.token
    });
    return response.data;
  }
}
