import { createAxios } from 'slates';

let PRINT_MAIL_BASE_URL = 'https://api.postgrid.com/print-mail/v1';

export class PrintMailClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: PRINT_MAIL_BASE_URL,
      headers: {
        'x-api-key': this.token
      }
    });
  }

  // --- Contacts ---

  async createContact(data: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    jobTitle?: string;
    email?: string;
    phoneNumber?: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    provinceOrState?: string;
    postalOrZip?: string;
    country?: string;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/contacts', data);
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}`);
    return res.data;
  }

  async listContacts(params?: { skip?: number; limit?: number; search?: string }) {
    let res = await this.axios.get('/contacts', { params });
    return res.data;
  }

  async deleteContact(contactId: string) {
    let res = await this.axios.delete(`/contacts/${contactId}`);
    return res.data;
  }

  // --- Templates ---

  async createTemplate(data: {
    description?: string;
    html?: string;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/templates', data);
    return res.data;
  }

  async getTemplate(templateId: string) {
    let res = await this.axios.get(`/templates/${templateId}`);
    return res.data;
  }

  async listTemplates(params?: { skip?: number; limit?: number; search?: string }) {
    let res = await this.axios.get('/templates', { params });
    return res.data;
  }

  async updateTemplate(
    templateId: string,
    data: {
      description?: string;
      html?: string;
      metadata?: Record<string, any>;
    }
  ) {
    let res = await this.axios.patch(`/templates/${templateId}`, data);
    return res.data;
  }

  async deleteTemplate(templateId: string) {
    let res = await this.axios.delete(`/templates/${templateId}`);
    return res.data;
  }

  // --- Letters ---

  async createLetter(data: {
    to: string | Record<string, any>;
    from: string | Record<string, any>;
    template?: string;
    html?: string;
    pdf?: string;
    description?: string;
    color?: boolean;
    doubleSided?: boolean;
    addressPlacement?: string;
    mailingClass?: string;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    returnEnvelope?: string;
    express?: boolean;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/letters', data);
    return res.data;
  }

  async getLetter(letterId: string) {
    let res = await this.axios.get(`/letters/${letterId}`);
    return res.data;
  }

  async listLetters(params?: { skip?: number; limit?: number; search?: string }) {
    let res = await this.axios.get('/letters', { params });
    return res.data;
  }

  async cancelLetter(letterId: string) {
    let res = await this.axios.delete(`/letters/${letterId}`);
    return res.data;
  }

  // --- Postcards ---

  async createPostcard(data: {
    to: string | Record<string, any>;
    from: string | Record<string, any>;
    frontTemplate?: string;
    backTemplate?: string;
    frontHTML?: string;
    backHTML?: string;
    pdf?: string;
    size?: string;
    description?: string;
    mailingClass?: string;
    express?: boolean;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/postcards', data);
    return res.data;
  }

  async getPostcard(postcardId: string) {
    let res = await this.axios.get(`/postcards/${postcardId}`);
    return res.data;
  }

  async listPostcards(params?: { skip?: number; limit?: number; search?: string }) {
    let res = await this.axios.get('/postcards', { params });
    return res.data;
  }

  async cancelPostcard(postcardId: string) {
    let res = await this.axios.delete(`/postcards/${postcardId}`);
    return res.data;
  }

  // --- Cheques ---

  async createCheque(data: {
    to: string | Record<string, any>;
    from: string | Record<string, any>;
    bankAccount: string;
    amount: number;
    number?: number;
    memo?: string;
    message?: string;
    letterTemplate?: string;
    letterHTML?: string;
    letterPDF?: string;
    description?: string;
    redirectTo?: string;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/cheques', data);
    return res.data;
  }

  async getCheque(chequeId: string) {
    let res = await this.axios.get(`/cheques/${chequeId}`);
    return res.data;
  }

  async listCheques(params?: { skip?: number; limit?: number; search?: string }) {
    let res = await this.axios.get('/cheques', { params });
    return res.data;
  }

  async cancelCheque(chequeId: string) {
    let res = await this.axios.delete(`/cheques/${chequeId}`);
    return res.data;
  }

  // --- Self-Mailers ---

  async createSelfMailer(data: {
    to: string | Record<string, any>;
    from: string | Record<string, any>;
    template?: string;
    html?: string;
    pdf?: string;
    insideTemplate?: string;
    insideHTML?: string;
    outsideTemplate?: string;
    outsideHTML?: string;
    description?: string;
    size?: string;
    mailingClass?: string;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/self_mailers', data);
    return res.data;
  }

  async getSelfMailer(selfMailerId: string) {
    let res = await this.axios.get(`/self_mailers/${selfMailerId}`);
    return res.data;
  }

  async listSelfMailers(params?: { skip?: number; limit?: number; search?: string }) {
    let res = await this.axios.get('/self_mailers', { params });
    return res.data;
  }

  async cancelSelfMailer(selfMailerId: string) {
    let res = await this.axios.delete(`/self_mailers/${selfMailerId}`);
    return res.data;
  }

  // --- Webhooks ---

  async createWebhook(data: {
    url: string;
    description?: string;
    enabledEvents: string[];
    payloadFormat?: string;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/webhooks', data);
    return res.data;
  }

  async getWebhook(webhookId: string) {
    let res = await this.axios.get(`/webhooks/${webhookId}`);
    return res.data;
  }

  async listWebhooks(params?: { skip?: number; limit?: number }) {
    let res = await this.axios.get('/webhooks', { params });
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }
}
