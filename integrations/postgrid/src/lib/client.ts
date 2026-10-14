import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let PRINT_MAIL_BASE_URL = 'https://api.postgrid.com/print-mail/v1';

export class PrintMailClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('A PostGrid API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: PRINT_MAIL_BASE_URL,
      authHeader: { name: 'x-api-key', value: token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'PostGrid',
          reason: 'postgrid_api_error'
        })
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
    let res = await this.axios.post('/contacts', normalizeContact(data));
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}`);
    return res.data;
  }

  async listContacts(params?: { skip?: number; limit?: number; search?: string }) {
    validatePagination(params);
    let res = await this.axios.get('/contacts', { params });
    return res.data;
  }

  async deleteContact(contactId: string) {
    let res = await this.axios.delete(`/contacts/${encodeURIComponent(contactId)}`);
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
    let res = await this.axios.get(`/templates/${encodeURIComponent(templateId)}`);
    return res.data;
  }

  async listTemplates(params?: { skip?: number; limit?: number; search?: string }) {
    validatePagination(params);
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
    let res = await this.axios.post(`/templates/${encodeURIComponent(templateId)}`, data);
    return res.data;
  }

  async deleteTemplate(templateId: string) {
    let res = await this.axios.delete(`/templates/${encodeURIComponent(templateId)}`);
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
    let res = await this.axios.post('/letters', {
      ...data,
      to: normalizeContact(data.to),
      from: normalizeContact(data.from)
    });
    return res.data;
  }

  async getLetter(letterId: string) {
    let res = await this.axios.get(`/letters/${encodeURIComponent(letterId)}`);
    return res.data;
  }

  async listLetters(params?: { skip?: number; limit?: number; search?: string }) {
    validatePagination(params);
    let res = await this.axios.get('/letters', { params });
    return res.data;
  }

  async cancelLetter(letterId: string) {
    let res = await this.axios.delete(`/letters/${encodeURIComponent(letterId)}`);
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
    let res = await this.axios.post('/postcards', {
      ...data,
      to: normalizeContact(data.to),
      from: normalizeContact(data.from)
    });
    return res.data;
  }

  async getPostcard(postcardId: string) {
    let res = await this.axios.get(`/postcards/${encodeURIComponent(postcardId)}`);
    return res.data;
  }

  async listPostcards(params?: { skip?: number; limit?: number; search?: string }) {
    validatePagination(params);
    let res = await this.axios.get('/postcards', { params });
    return res.data;
  }

  async cancelPostcard(postcardId: string) {
    let res = await this.axios.delete(`/postcards/${encodeURIComponent(postcardId)}`);
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
    if (!Number.isSafeInteger(data.amount) || data.amount <= 0) {
      throw createApiServiceError('amountInCents must be a positive whole number of cents.');
    }
    if (data.number !== undefined && (!Number.isSafeInteger(data.number) || data.number < 0)) {
      throw createApiServiceError('chequeNumber must be a non-negative whole number.');
    }
    let res = await this.axios.post('/cheques', {
      ...data,
      to: normalizeContact(data.to),
      from: normalizeContact(data.from)
    });
    return res.data;
  }

  async getCheque(chequeId: string) {
    let res = await this.axios.get(`/cheques/${encodeURIComponent(chequeId)}`);
    return res.data;
  }

  async listCheques(params?: { skip?: number; limit?: number; search?: string }) {
    validatePagination(params);
    let res = await this.axios.get('/cheques', { params });
    return res.data;
  }

  async cancelCheque(chequeId: string) {
    let res = await this.axios.delete(`/cheques/${encodeURIComponent(chequeId)}`);
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
    let res = await this.axios.post('/self_mailers', {
      ...data,
      to: normalizeContact(data.to),
      from: normalizeContact(data.from)
    });
    return res.data;
  }

  async getSelfMailer(selfMailerId: string) {
    let res = await this.axios.get(`/self_mailers/${encodeURIComponent(selfMailerId)}`);
    return res.data;
  }

  async listSelfMailers(params?: { skip?: number; limit?: number; search?: string }) {
    validatePagination(params);
    let res = await this.axios.get('/self_mailers', { params });
    return res.data;
  }

  async cancelSelfMailer(selfMailerId: string) {
    let res = await this.axios.delete(`/self_mailers/${encodeURIComponent(selfMailerId)}`);
    return res.data;
  }

  async getOrder(orderId: string, orderType: OrderType) {
    switch (orderType) {
      case 'letter':
        return this.getLetter(orderId);
      case 'postcard':
        return this.getPostcard(orderId);
      case 'cheque':
        return this.getCheque(orderId);
      case 'self_mailer':
        return this.getSelfMailer(orderId);
    }
  }

  async listOrders(
    orderType: OrderType,
    params?: { skip?: number; limit?: number; search?: string }
  ) {
    switch (orderType) {
      case 'letter':
        return this.listLetters(params);
      case 'postcard':
        return this.listPostcards(params);
      case 'cheque':
        return this.listCheques(params);
      case 'self_mailer':
        return this.listSelfMailers(params);
    }
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
    let res = await this.axios.get(`/webhooks/${encodeURIComponent(webhookId)}`);
    return res.data;
  }

  async listWebhooks(params?: { skip?: number; limit?: number }) {
    let res = await this.axios.get('/webhooks', { params });
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
    return res.data;
  }
}

export type OrderType = 'letter' | 'postcard' | 'cheque' | 'self_mailer';

export let resolveOrderType = (orderId: string, orderType?: OrderType): OrderType => {
  if (orderType) return orderType;
  let types: OrderType[] = ['letter', 'postcard', 'cheque', 'self_mailer'];
  let detected = types.find(type => orderId.startsWith(`${type}_`));
  if (!detected) {
    throw createApiServiceError(
      `Could not determine order type from ID "${orderId}". Specify orderType.`
    );
  }
  return detected;
};

export let validatePagination = (params?: { skip?: number; limit?: number }) => {
  if (params?.skip !== undefined && (!Number.isSafeInteger(params.skip) || params.skip < 0)) {
    throw createApiServiceError('skip must be a non-negative whole number.');
  }
  if (
    params?.limit !== undefined &&
    (!Number.isSafeInteger(params.limit) || params.limit <= 0)
  ) {
    throw createApiServiceError('limit must be a positive whole number.');
  }
};

// Print & Mail expects countryCode, while the existing tool field is country.
let normalizeContact = (contact: string | Record<string, any>) => {
  if (typeof contact === 'string') return contact;
  if (!contact.firstName?.trim() && !contact.companyName?.trim()) {
    throw createApiServiceError('Each contact needs firstName or companyName.');
  }
  let { country, ...fields } = contact;
  return { ...fields, ...(country !== undefined ? { countryCode: country } : {}) };
};
