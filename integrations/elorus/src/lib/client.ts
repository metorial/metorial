import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string;
  ordering?: string;
  periodFrom?: string;
  periodTo?: string;
  period?: string;
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  currencyCode?: string;
  customId?: string;
  [key: string]: string | number | boolean | undefined;
}

export class Client {
  private token: string;
  private organizationId: string;

  constructor(config: { token: string; organizationId: string }) {
    this.token = config.token;
    this.organizationId = config.organizationId;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://api.elorus.com/v1.2/',
      headers: {
        Authorization: `Token ${this.token}`,
        'X-Elorus-Organization': this.organizationId,
        'Content-Type': 'application/json'
      }
    });
  }

  private buildListParams(params: ListParams): Record<string, string> {
    let queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = String(params.page);
    if (params.pageSize) queryParams.page_size = String(params.pageSize);
    if (params.search) queryParams.search = params.search;
    if (params.searchFields) queryParams.search_fields = params.searchFields;
    if (params.ordering) queryParams.ordering = params.ordering;
    if (params.periodFrom) queryParams.period_from = params.periodFrom;
    if (params.periodTo) queryParams.period_to = params.periodTo;
    if (params.period) queryParams.period = params.period;
    if (params.createdAfter) queryParams.created_after = params.createdAfter;
    if (params.createdBefore) queryParams.created_before = params.createdBefore;
    if (params.modifiedAfter) queryParams.modified_after = params.modifiedAfter;
    if (params.modifiedBefore) queryParams.modified_before = params.modifiedBefore;
    if (params.currencyCode) queryParams.currency_code = params.currencyCode;
    if (params.customId) queryParams.custom_id = params.customId;

    // Pass through any extra params (e.g., status, draft, client, supplier, etc.)
    for (let [key, value] of Object.entries(params)) {
      if (
        value !== undefined &&
        !queryParams[key] &&
        ![
          'page',
          'pageSize',
          'search',
          'searchFields',
          'ordering',
          'periodFrom',
          'periodTo',
          'period',
          'createdAfter',
          'createdBefore',
          'modifiedAfter',
          'modifiedBefore',
          'currencyCode',
          'customId'
        ].includes(key)
      ) {
        queryParams[key] = String(value);
      }
    }

    return queryParams;
  }

  // --- Contacts ---

  async listContacts(
    params: ListParams & {
      isClient?: boolean;
      isSupplier?: boolean;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.isClient !== undefined) queryParams.is_client = params.isClient ? '1' : '0';
    if (params.isSupplier !== undefined)
      queryParams.is_supplier = params.isSupplier ? '1' : '0';
    let response = await axios.get('/contacts/', { params: queryParams });
    return response.data;
  }

  async getContact(contactId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/contacts/${contactId}/`);
    return response.data;
  }

  async createContact(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/contacts/', data);
    return response.data;
  }

  async updateContact(contactId: string, data: any, partial: boolean = true): Promise<any> {
    let axios = this.getAxios();
    let response = partial
      ? await axios.patch(`/contacts/${contactId}/`, data)
      : await axios.put(`/contacts/${contactId}/`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/contacts/${contactId}/`);
  }

  // --- Invoices ---

  async listInvoices(
    params: ListParams & {
      status?: string;
      draft?: string;
      client?: string;
      documenttype?: string;
      fpaid?: string;
      isVoid?: string;
      overdue?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.status) queryParams.status = params.status;
    if (params.draft) queryParams.draft = params.draft;
    if (params.client) queryParams.client = params.client;
    if (params.documenttype) queryParams.documenttype = params.documenttype;
    if (params.fpaid) queryParams.fpaid = params.fpaid;
    if (params.isVoid) queryParams.is_void = params.isVoid;
    if (params.overdue) queryParams.overdue = params.overdue;
    let response = await axios.get('/invoices/', { params: queryParams });
    return response.data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/invoices/${invoiceId}/`);
    return response.data;
  }

  async createInvoice(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/invoices/', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: any, partial: boolean = true): Promise<any> {
    let axios = this.getAxios();
    let response = partial
      ? await axios.patch(`/invoices/${invoiceId}/`, data)
      : await axios.put(`/invoices/${invoiceId}/`, data);
    return response.data;
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/invoices/${invoiceId}/`);
  }

  async sendInvoiceEmail(invoiceId: string, emailData?: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post(`/invoices/${invoiceId}/email/`, emailData || {});
    return response.data;
  }

  async getInvoicePdf(invoiceId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/invoices/${invoiceId}/pdf/`);
    return response.data;
  }

  async voidInvoice(invoiceId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/invoices/${invoiceId}/void/`);
    return response.data;
  }

  // --- Credit Notes ---

  async listCreditNotes(
    params: ListParams & {
      status?: string;
      draft?: string;
      client?: string;
      documenttype?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.status) queryParams.status = params.status;
    if (params.draft) queryParams.draft = params.draft;
    if (params.client) queryParams.client = params.client;
    if (params.documenttype) queryParams.documenttype = params.documenttype;
    let response = await axios.get('/creditnotes/', { params: queryParams });
    return response.data;
  }

  async getCreditNote(creditNoteId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/creditnotes/${creditNoteId}/`);
    return response.data;
  }

  async createCreditNote(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/creditnotes/', data);
    return response.data;
  }

  async updateCreditNote(
    creditNoteId: string,
    data: any,
    partial: boolean = true
  ): Promise<any> {
    let axios = this.getAxios();
    let response = partial
      ? await axios.patch(`/creditnotes/${creditNoteId}/`, data)
      : await axios.put(`/creditnotes/${creditNoteId}/`, data);
    return response.data;
  }

  async deleteCreditNote(creditNoteId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/creditnotes/${creditNoteId}/`);
  }

  // --- Estimates ---

  async listEstimates(
    params: ListParams & {
      status?: string;
      client?: string;
      documenttype?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.status) queryParams.status = params.status;
    if (params.client) queryParams.client = params.client;
    if (params.documenttype) queryParams.documenttype = params.documenttype;
    let response = await axios.get('/estimates/', { params: queryParams });
    return response.data;
  }

  async getEstimate(estimateId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/estimates/${estimateId}/`);
    return response.data;
  }

  async createEstimate(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/estimates/', data);
    return response.data;
  }

  async updateEstimate(estimateId: string, data: any, partial: boolean = true): Promise<any> {
    let axios = this.getAxios();
    let response = partial
      ? await axios.patch(`/estimates/${estimateId}/`, data)
      : await axios.put(`/estimates/${estimateId}/`, data);
    return response.data;
  }

  async deleteEstimate(estimateId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/estimates/${estimateId}/`);
  }

  async sendEstimateEmail(estimateId: string, emailData?: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post(`/estimates/${estimateId}/email/`, emailData || {});
    return response.data;
  }

  // --- Bills (Expenses from suppliers) ---

  async listBills(
    params: ListParams & {
      status?: string;
      draft?: string;
      supplier?: string;
      documenttype?: string;
      selfBilled?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.status) queryParams.status = params.status;
    if (params.draft) queryParams.draft = params.draft;
    if (params.supplier) queryParams.supplier = params.supplier;
    if (params.documenttype) queryParams.documenttype = params.documenttype;
    if (params.selfBilled) queryParams.self_billed = params.selfBilled;
    let response = await axios.get('/bills/', { params: queryParams });
    return response.data;
  }

  async getBill(billId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/bills/${billId}/`);
    return response.data;
  }

  async createBill(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/bills/', data);
    return response.data;
  }

  async updateBill(billId: string, data: any, partial: boolean = true): Promise<any> {
    let axios = this.getAxios();
    let response = partial
      ? await axios.patch(`/bills/${billId}/`, data)
      : await axios.put(`/bills/${billId}/`, data);
    return response.data;
  }

  async deleteBill(billId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/bills/${billId}/`);
  }

  // --- Expenses ---

  async listExpenses(params: ListParams = {}): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    let response = await axios.get('/expenses/', { params: queryParams });
    return response.data;
  }

  async getExpense(expenseId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/expenses/${expenseId}/`);
    return response.data;
  }

  async createExpense(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/expenses/', data);
    return response.data;
  }

  async updateExpense(expenseId: string, data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/expenses/${expenseId}/`, data);
    return response.data;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/expenses/${expenseId}/`);
  }

  // --- Cash Receipts (Payments Received) ---

  async listCashReceipts(
    params: ListParams & {
      transactionType?: string;
      contact?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.transactionType) queryParams.transaction_type = params.transactionType;
    if (params.contact) queryParams.contact = params.contact;
    let response = await axios.get('/cashreceipts/', { params: queryParams });
    return response.data;
  }

  async getCashReceipt(receiptId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/cashreceipts/${receiptId}/`);
    return response.data;
  }

  async createCashReceipt(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/cashreceipts/', data);
    return response.data;
  }

  async updateCashReceipt(receiptId: string, data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/cashreceipts/${receiptId}/`, data);
    return response.data;
  }

  async deleteCashReceipt(receiptId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/cashreceipts/${receiptId}/`);
  }

  // --- Cash Payments (Payments Sent) ---

  async listCashPayments(
    params: ListParams & {
      transactionType?: string;
      contact?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.transactionType) queryParams.transaction_type = params.transactionType;
    if (params.contact) queryParams.contact = params.contact;
    let response = await axios.get('/cashpayments/', { params: queryParams });
    return response.data;
  }

  async getCashPayment(paymentId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/cashpayments/${paymentId}/`);
    return response.data;
  }

  async createCashPayment(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/cashpayments/', data);
    return response.data;
  }

  async updateCashPayment(paymentId: string, data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/cashpayments/${paymentId}/`, data);
    return response.data;
  }

  async deleteCashPayment(paymentId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/cashpayments/${paymentId}/`);
  }

  // --- Products ---

  async listProducts(params: ListParams = {}): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    let response = await axios.get('/products/', { params: queryParams });
    return response.data;
  }

  async getProduct(productId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/products/${productId}/`);
    return response.data;
  }

  async createProduct(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/products/', data);
    return response.data;
  }

  async updateProduct(productId: string, data: any, partial: boolean = true): Promise<any> {
    let axios = this.getAxios();
    let response = partial
      ? await axios.patch(`/products/${productId}/`, data)
      : await axios.put(`/products/${productId}/`, data);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/products/${productId}/`);
  }

  // --- Projects ---

  async listProjects(params: ListParams = {}): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    let response = await axios.get('/projects/', { params: queryParams });
    return response.data;
  }

  async getProject(projectId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/projects/${projectId}/`);
    return response.data;
  }

  async createProject(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/projects/', data);
    return response.data;
  }

  async updateProject(projectId: string, data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/projects/${projectId}/`, data);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/projects/${projectId}/`);
  }

  // --- Time Entries ---

  async listTimeEntries(
    params: ListParams & {
      project?: string;
      task?: string;
      billable?: string;
      billed?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    if (params.project) queryParams.project = params.project;
    if (params.task) queryParams.task = params.task;
    if (params.billable) queryParams.billable = params.billable;
    if (params.billed) queryParams.billed = params.billed;
    let response = await axios.get('/timeentries/', { params: queryParams });
    return response.data;
  }

  async getTimeEntry(timeEntryId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/timeentries/${timeEntryId}/`);
    return response.data;
  }

  async createTimeEntry(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/timeentries/', data);
    return response.data;
  }

  async updateTimeEntry(timeEntryId: string, data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/timeentries/${timeEntryId}/`, data);
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/timeentries/${timeEntryId}/`);
  }

  // --- Document Types ---

  async listDocumentTypes(params: ListParams = {}): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    let response = await axios.get('/documenttypes/', { params: queryParams });
    return response.data;
  }

  async getDocumentType(documentTypeId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/documenttypes/${documentTypeId}/`);
    return response.data;
  }

  // --- Taxes ---

  async listTaxes(params: ListParams = {}): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    let response = await axios.get('/taxes/', { params: queryParams });
    return response.data;
  }

  async getTax(taxId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/taxes/${taxId}/`);
    return response.data;
  }

  // --- Tracking Categories ---

  async listTrackingCategories(params: ListParams = {}): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    let response = await axios.get('/trackingcategories/', { params: queryParams });
    return response.data;
  }

  async getTrackingCategory(categoryId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/trackingcategories/${categoryId}/`);
    return response.data;
  }

  // --- Delivery Notes ---

  async listDeliveryNotes(params: ListParams = {}): Promise<PaginatedResponse<any>> {
    let axios = this.getAxios();
    let queryParams = this.buildListParams(params);
    let response = await axios.get('/deliverynotes/', { params: queryParams });
    return response.data;
  }

  async getDeliveryNote(deliveryNoteId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/deliverynotes/${deliveryNoteId}/`);
    return response.data;
  }

  async createDeliveryNote(data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/deliverynotes/', data);
    return response.data;
  }

  async updateDeliveryNote(deliveryNoteId: string, data: any): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/deliverynotes/${deliveryNoteId}/`, data);
    return response.data;
  }

  async deleteDeliveryNote(deliveryNoteId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/deliverynotes/${deliveryNoteId}/`);
  }

  // --- Notes (nested under any resource) ---

  async listNotes(resource: string, parentId: string): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get(`/${resource}/${parentId}/notes/`);
    return response.data;
  }

  async createNote(resource: string, parentId: string, data: { notes: string }): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post(`/${resource}/${parentId}/notes/`, data);
    return response.data;
  }
}
