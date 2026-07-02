import { createAxios } from 'slates';

export interface PaginationParams {
  pageIndex?: number;
  pageSize?: number;
}

export interface ListCustomersParams extends PaginationParams {
  email?: string;
}

export interface ListInvoicesParams extends PaginationParams {
  sortBy?: string;
  sortDirection?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: number;
  status?: string;
  includeCanceled?: boolean;
}

export interface ListQuotesParams extends PaginationParams {}

export interface ListCreditsParams extends PaginationParams {}

export interface ListProductsParams extends PaginationParams {
  productNumber?: string;
}

export interface ListSuppliersParams extends PaginationParams {}

export interface ListReceiptsParams extends PaginationParams {}

export interface MarkAsPaidParams {
  invoiceId: number;
  date: string;
  paymentMethod: string;
  metadata?: Record<string, any>;
}

export interface SendEmailParams {
  documentId: number;
}

export interface WebhookRegistration {
  name: string;
  types: string[];
  url: string;
  secretKey?: string;
}

export class Client {
  private baseURL = 'https://api.altoviz.com/v1';
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: this.baseURL,
      headers: {
        'X-API-KEY': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Users ---

  async getCurrentUser(): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get('/Users/me');
    return response.data;
  }

  // --- Settings ---

  async getSettings(): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get('/Settings');
    return response.data;
  }

  async getVatRates(): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Vats');
    return response.data;
  }

  async getClassifications(): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Classifications');
    return response.data;
  }

  async getUnits(): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Units');
    return response.data;
  }

  // --- Customers ---

  async listCustomers(params?: ListCustomersParams): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Customers', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async getCustomer(customerId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/Customers/${customerId}`);
    return response.data;
  }

  async getCustomerByInternalId(internalId: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/Customers/GetByInternalId/${internalId}`);
    return response.data;
  }

  async getCustomerByEmail(email: string): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Customers', { params: { email } });
    return response.data;
  }

  async createCustomer(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/Customers', data);
    return response.data;
  }

  async updateCustomer(customerId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/Customers/${customerId}`, data);
    return response.data;
  }

  async deleteCustomer(customerId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/Customers/${customerId}`);
  }

  // --- Customer Families ---

  async listCustomerFamilies(): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/CustomerFamilies');
    return response.data;
  }

  // --- Contacts ---

  async listContacts(params?: PaginationParams): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Contacts', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async getContact(contactId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/Contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/Contacts', data);
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/Contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/Contacts/${contactId}`);
  }

  // --- Sale Invoices ---

  async listSaleInvoices(params?: ListInvoicesParams): Promise<any[]> {
    let axios = this.getAxios();
    let queryParams: Record<string, any> = this.buildPaginationParams(params);
    if (params?.sortBy) queryParams.SortBy = params.sortBy;
    if (params?.sortDirection) queryParams.SortDirection = params.sortDirection;
    if (params?.dateFrom) queryParams.DateFrom = params.dateFrom;
    if (params?.dateTo) queryParams.DateTo = params.dateTo;
    if (params?.customerId) queryParams.CustomerId = params.customerId;
    if (params?.status) queryParams.Status = params.status;
    if (params?.includeCanceled) queryParams.IncludeCanceled = params.includeCanceled;
    let response = await axios.get('/SaleInvoices', { params: queryParams });
    return response.data;
  }

  async getSaleInvoice(invoiceId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/SaleInvoices/${invoiceId}`);
    return response.data;
  }

  async createSaleInvoice(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/SaleInvoices', data);
    return response.data;
  }

  async updateSaleInvoice(invoiceId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/SaleInvoices/${invoiceId}`, data);
    return response.data;
  }

  async deleteSaleInvoice(invoiceId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/SaleInvoices/${invoiceId}`);
  }

  async finalizeSaleInvoice(invoiceId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post(`/SaleInvoices/Finalize/${invoiceId}`);
    return response.data;
  }

  async markSaleInvoiceAsPaid(params: MarkAsPaidParams): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post(`/SaleInvoices/Pay/${params.invoiceId}`, {
      date: params.date,
      paymentMethod: params.paymentMethod,
      metadata: params.metadata
    });
    return response.data;
  }

  async sendSaleInvoiceByEmail(invoiceId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post(`/SaleInvoices/Send/${invoiceId}`);
    return response.data;
  }

  async downloadSaleInvoice(invoiceId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/SaleInvoices/Download/${invoiceId}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // --- Sale Quotes ---

  async listSaleQuotes(params?: ListQuotesParams): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/SaleQuotes', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async getSaleQuote(quoteId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/SaleQuotes/${quoteId}`);
    return response.data;
  }

  async createSaleQuote(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/SaleQuotes', data);
    return response.data;
  }

  async updateSaleQuote(quoteId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/SaleQuotes/${quoteId}`, data);
    return response.data;
  }

  async deleteSaleQuote(quoteId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/SaleQuotes/${quoteId}`);
  }

  async sendSaleQuoteByEmail(quoteId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post(`/SaleQuotes/Send/${quoteId}`);
    return response.data;
  }

  // --- Sale Credits ---

  async listSaleCredits(params?: ListCreditsParams): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/SaleCredits', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async getSaleCredit(creditId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/SaleCredits/${creditId}`);
    return response.data;
  }

  async createSaleCredit(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/SaleCredits', data);
    return response.data;
  }

  async updateSaleCredit(creditId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/SaleCredits/${creditId}`, data);
    return response.data;
  }

  async deleteSaleCredit(creditId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/SaleCredits/${creditId}`);
  }

  // --- Purchase Invoices ---

  async listPurchaseInvoices(params?: PaginationParams): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/PurchaseInvoices', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async createPurchaseInvoiceFromFile(fileData: Uint8Array, fileName: string): Promise<any> {
    let axios = this.getAxios();
    let formData = new FormData();
    let blob = new Blob([fileData], { type: 'application/pdf' });
    formData.append('file', blob, fileName);
    let response = await axios.post('/PurchaseInvoices/File', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async downloadPurchaseInvoice(invoiceId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/PurchaseInvoices/Download/${invoiceId}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // --- Products ---

  async listProducts(params?: ListProductsParams): Promise<any[]> {
    let axios = this.getAxios();
    let queryParams: Record<string, any> = this.buildPaginationParams(params);
    if (params?.productNumber) queryParams.productNumber = params.productNumber;
    let response = await axios.get('/Products', { params: queryParams });
    return response.data;
  }

  async getProduct(productId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/Products/${productId}`);
    return response.data;
  }

  async findProduct(productNumber: string): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Products/Find', { params: { productNumber } });
    return response.data;
  }

  async createProduct(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/Products', data);
    return response.data;
  }

  async updateProduct(productId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/Products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/Products/${productId}`);
  }

  // --- Suppliers ---

  async listSuppliers(params?: ListSuppliersParams): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Suppliers', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async getSupplier(supplierId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/Suppliers/${supplierId}`);
    return response.data;
  }

  async createSupplier(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/Suppliers', data);
    return response.data;
  }

  async updateSupplier(supplierId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/Suppliers/${supplierId}`, data);
    return response.data;
  }

  async deleteSupplier(supplierId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/Suppliers/${supplierId}`);
  }

  // --- Receipts ---

  async listReceipts(params?: ListReceiptsParams): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Receipts', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async getReceipt(receiptId: number): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/Receipts/${receiptId}`);
    return response.data;
  }

  async createReceipt(data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/Receipts', data);
    return response.data;
  }

  async updateReceipt(receiptId: number, data: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.put(`/Receipts/${receiptId}`, data);
    return response.data;
  }

  async deleteReceipt(receiptId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/Receipts/${receiptId}`);
  }

  // --- Webhooks ---

  async listWebhooks(): Promise<any[]> {
    let axios = this.getAxios();
    let response = await axios.get('/Webhooks');
    return response.data;
  }

  async createWebhook(data: WebhookRegistration): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.post('/Webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/Webhooks/${webhookId}`);
  }

  // --- Helpers ---

  private buildPaginationParams(params?: PaginationParams): Record<string, any> {
    let result: Record<string, any> = {};
    if (params?.pageIndex) result.PageIndex = params.pageIndex;
    if (params?.pageSize) result.PageSize = params.pageSize;
    return result;
  }
}
