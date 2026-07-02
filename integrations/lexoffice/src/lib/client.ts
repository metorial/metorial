import { createAxios } from 'slates';

let BASE_URL = 'https://api.lexware.io/v1';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${params.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Profile ──

  async getProfile(): Promise<any> {
    let response = await this.http.get('/profile');
    return response.data;
  }

  // ── Contacts ──

  async createContact(contact: any): Promise<any> {
    let response = await this.http.post('/contacts', contact);
    return response.data;
  }

  async getContact(contactId: string): Promise<any> {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data;
  }

  async updateContact(contactId: string, contact: any): Promise<any> {
    let response = await this.http.put(`/contacts/${contactId}`, contact);
    return response.data;
  }

  async listContacts(filters?: {
    email?: string;
    name?: string;
    number?: number;
    customer?: boolean;
    vendor?: boolean;
    page?: number;
  }): Promise<any> {
    let params: Record<string, string> = {};
    if (filters?.email) params.email = filters.email;
    if (filters?.name) params.name = filters.name;
    if (filters?.number !== undefined) params.number = String(filters.number);
    if (filters?.customer !== undefined) params.customer = String(filters.customer);
    if (filters?.vendor !== undefined) params.vendor = String(filters.vendor);
    if (filters?.page !== undefined) params.page = String(filters.page);

    let response = await this.http.get('/contacts', { params });
    return response.data;
  }

  // ── Invoices ──

  async createInvoice(
    invoice: any,
    options?: { finalize?: boolean; precedingSalesVoucherId?: string }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.finalize) params.finalize = 'true';
    if (options?.precedingSalesVoucherId)
      params.precedingSalesVoucherId = options.precedingSalesVoucherId;

    let response = await this.http.post('/invoices', invoice, { params });
    return response.data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let response = await this.http.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async downloadInvoiceFile(invoiceId: string): Promise<any> {
    let response = await this.http.get(`/invoices/${invoiceId}/file`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // ── Credit Notes ──

  async createCreditNote(
    creditNote: any,
    options?: { finalize?: boolean; precedingSalesVoucherId?: string }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.finalize) params.finalize = 'true';
    if (options?.precedingSalesVoucherId)
      params.precedingSalesVoucherId = options.precedingSalesVoucherId;

    let response = await this.http.post('/credit-notes', creditNote, { params });
    return response.data;
  }

  async getCreditNote(creditNoteId: string): Promise<any> {
    let response = await this.http.get(`/credit-notes/${creditNoteId}`);
    return response.data;
  }

  // ── Quotations ──

  async createQuotation(quotation: any, options?: { finalize?: boolean }): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.finalize) params.finalize = 'true';

    let response = await this.http.post('/quotations', quotation, { params });
    return response.data;
  }

  async getQuotation(quotationId: string): Promise<any> {
    let response = await this.http.get(`/quotations/${quotationId}`);
    return response.data;
  }

  // ── Order Confirmations ──

  async createOrderConfirmation(
    orderConfirmation: any,
    options?: { finalize?: boolean; precedingSalesVoucherId?: string }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.finalize) params.finalize = 'true';
    if (options?.precedingSalesVoucherId)
      params.precedingSalesVoucherId = options.precedingSalesVoucherId;

    let response = await this.http.post('/order-confirmations', orderConfirmation, { params });
    return response.data;
  }

  async getOrderConfirmation(orderConfirmationId: string): Promise<any> {
    let response = await this.http.get(`/order-confirmations/${orderConfirmationId}`);
    return response.data;
  }

  // ── Delivery Notes ──

  async createDeliveryNote(
    deliveryNote: any,
    options?: { finalize?: boolean; precedingSalesVoucherId?: string }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.finalize) params.finalize = 'true';
    if (options?.precedingSalesVoucherId)
      params.precedingSalesVoucherId = options.precedingSalesVoucherId;

    let response = await this.http.post('/delivery-notes', deliveryNote, { params });
    return response.data;
  }

  async getDeliveryNote(deliveryNoteId: string): Promise<any> {
    let response = await this.http.get(`/delivery-notes/${deliveryNoteId}`);
    return response.data;
  }

  // ── Dunnings ──

  async createDunning(
    dunning: any,
    options?: { finalize?: boolean; precedingSalesVoucherId?: string }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.finalize) params.finalize = 'true';
    if (options?.precedingSalesVoucherId)
      params.precedingSalesVoucherId = options.precedingSalesVoucherId;

    let response = await this.http.post('/dunnings', dunning, { params });
    return response.data;
  }

  async getDunning(dunningId: string): Promise<any> {
    let response = await this.http.get(`/dunnings/${dunningId}`);
    return response.data;
  }

  // ── Down Payment Invoices ──

  async getDownPaymentInvoice(invoiceId: string): Promise<any> {
    let response = await this.http.get(`/down-payment-invoices/${invoiceId}`);
    return response.data;
  }

  // ── Articles ──

  async createArticle(article: any): Promise<any> {
    let response = await this.http.post('/articles', article);
    return response.data;
  }

  async getArticle(articleId: string): Promise<any> {
    let response = await this.http.get(`/articles/${articleId}`);
    return response.data;
  }

  async updateArticle(articleId: string, article: any): Promise<any> {
    let response = await this.http.put(`/articles/${articleId}`, article);
    return response.data;
  }

  async deleteArticle(articleId: string): Promise<any> {
    let response = await this.http.delete(`/articles/${articleId}`);
    return response.data;
  }

  async listArticles(filters?: {
    articleNumber?: string;
    gtin?: string;
    type?: string;
    page?: number;
  }): Promise<any> {
    let params: Record<string, string> = {};
    if (filters?.articleNumber) params.articleNumber = filters.articleNumber;
    if (filters?.gtin) params.gtin = filters.gtin;
    if (filters?.type) params.type = filters.type;
    if (filters?.page !== undefined) params.page = String(filters.page);

    let response = await this.http.get('/articles', { params });
    return response.data;
  }

  // ── Vouchers (Bookkeeping) ──

  async createVoucher(voucher: any): Promise<any> {
    let response = await this.http.post('/vouchers', voucher);
    return response.data;
  }

  async getVoucher(voucherId: string): Promise<any> {
    let response = await this.http.get(`/vouchers/${voucherId}`);
    return response.data;
  }

  async updateVoucher(voucherId: string, voucher: any): Promise<any> {
    let response = await this.http.put(`/vouchers/${voucherId}`, voucher);
    return response.data;
  }

  async uploadVoucherFile(
    voucherId: string,
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<any> {
    let formData = new FormData();
    let blob = new Blob([file], { type: contentType });
    formData.append('file', blob, filename);

    let response = await this.http.post(`/vouchers/${voucherId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  // ── Voucherlist ──

  async listVouchers(filters?: {
    voucherType?: string;
    voucherStatus?: string;
    voucherDateFrom?: string;
    voucherDateTo?: string;
    createdDateFrom?: string;
    createdDateTo?: string;
    updatedDateFrom?: string;
    updatedDateTo?: string;
    contactId?: string;
    voucherNumber?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<any> {
    let params: Record<string, string> = {};
    if (filters?.voucherType) params.voucherType = filters.voucherType;
    if (filters?.voucherStatus) params.voucherStatus = filters.voucherStatus;
    if (filters?.voucherDateFrom) params.voucherDateFrom = filters.voucherDateFrom;
    if (filters?.voucherDateTo) params.voucherDateTo = filters.voucherDateTo;
    if (filters?.createdDateFrom) params.createdDateFrom = filters.createdDateFrom;
    if (filters?.createdDateTo) params.createdDateTo = filters.createdDateTo;
    if (filters?.updatedDateFrom) params.updatedDateFrom = filters.updatedDateFrom;
    if (filters?.updatedDateTo) params.updatedDateTo = filters.updatedDateTo;
    if (filters?.contactId) params.contactId = filters.contactId;
    if (filters?.voucherNumber) params.voucherNumber = filters.voucherNumber;
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);
    if (filters?.sort) params.sort = filters.sort;

    let response = await this.http.get('/voucherlist', { params });
    return response.data;
  }

  // ── Files ──

  async uploadFile(file: Buffer, filename: string, contentType: string): Promise<any> {
    let formData = new FormData();
    let blob = new Blob([file], { type: contentType });
    formData.append('file', blob, filename);

    let response = await this.http.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async downloadFile(fileId: string): Promise<any> {
    let response = await this.http.get(`/files/${fileId}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // ── Payments ──

  async getPayment(paymentId: string): Promise<any> {
    let response = await this.http.get(`/payments/${paymentId}`);
    return response.data;
  }

  // ── Payment Conditions ──

  async listPaymentConditions(): Promise<any> {
    let response = await this.http.get('/payment-conditions');
    return response.data;
  }

  // ── Posting Categories ──

  async listPostingCategories(): Promise<any> {
    let response = await this.http.get('/posting-categories');
    return response.data;
  }

  // ── Print Layouts ──

  async listPrintLayouts(): Promise<any> {
    let response = await this.http.get('/print-layouts');
    return response.data;
  }

  // ── Countries ──

  async listCountries(): Promise<any> {
    let response = await this.http.get('/countries');
    return response.data;
  }

  // ── Recurring Templates ──

  async getRecurringTemplate(templateId: string): Promise<any> {
    let response = await this.http.get(`/recurring-templates/${templateId}`);
    return response.data;
  }

  async listRecurringTemplates(): Promise<any> {
    let response = await this.http.get('/recurring-templates');
    return response.data;
  }

  // ── Event Subscriptions ──

  async createEventSubscription(eventType: string, callbackUrl: string): Promise<any> {
    let response = await this.http.post('/event-subscriptions', {
      eventType,
      callbackUrl
    });
    return response.data;
  }

  async getEventSubscription(subscriptionId: string): Promise<any> {
    let response = await this.http.get(`/event-subscriptions/${subscriptionId}`);
    return response.data;
  }

  async listEventSubscriptions(): Promise<any> {
    let response = await this.http.get('/event-subscriptions');
    return response.data;
  }

  async deleteEventSubscription(subscriptionId: string): Promise<void> {
    await this.http.delete(`/event-subscriptions/${subscriptionId}`);
  }
}
