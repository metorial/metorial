import { createAxios } from 'slates';

export class FinmeiClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://app.finmei.com/api',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private async request<T = any>(
    method: string,
    url: string,
    options?: {
      data?: any;
      params?: Record<string, any>;
    }
  ): Promise<T> {
    let response = await this.axios.request({
      method,
      url,
      data: options?.data,
      params: options?.params
    });
    return response.data as T;
  }

  // ========== Profile ==========

  async getProfile(): Promise<any> {
    return this.request('GET', '/profile');
  }

  // ========== Invoices ==========

  async listInvoices(params?: { page?: number; per_page?: number }): Promise<any> {
    return this.request('GET', '/invoices', { params });
  }

  async createInvoice(data: {
    type?: string;
    date?: string;
    series?: string;
    currency?: string;
    use_default_seller_info?: boolean;
    buyer?: Record<string, any>;
    products?: Record<string, any>[];
    notes?: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request('POST', '/invoices', { data });
  }

  async deleteInvoice(invoiceId: string): Promise<any> {
    return this.request('DELETE', `/invoices/${invoiceId}`);
  }

  // ========== Customers ==========

  async listCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort?: string;
  }): Promise<any> {
    return this.request('GET', '/customers', { params });
  }

  async updateCustomer(
    customerId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<any> {
    return this.request('PUT', `/customers/${customerId}`, { data });
  }

  async deleteCustomer(customerId: string): Promise<any> {
    return this.request('DELETE', `/customers/${customerId}`);
  }

  // ========== Products ==========

  async listProducts(params?: {
    page?: number;
    per_page?: number;
    name?: string;
    status?: string;
  }): Promise<any> {
    return this.request('GET', '/products', { params });
  }

  async getProduct(productId: string): Promise<any> {
    return this.request('GET', `/products/${productId}`);
  }

  async createProduct(data: {
    name: string;
    price?: number;
    currency?: string;
    description?: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request('POST', '/products', { data });
  }

  async updateProduct(
    productId: string,
    data: {
      name?: string;
      price?: number;
      currency?: string;
      description?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    return this.request('PUT', `/products/${productId}`, { data });
  }

  async deleteProduct(productId: string): Promise<any> {
    return this.request('DELETE', `/products/${productId}`);
  }

  // ========== Payments ==========

  async listPayments(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    return this.request('GET', '/payments', { params });
  }

  async getPayment(paymentId: string): Promise<any> {
    return this.request('GET', `/payments/${paymentId}`);
  }

  async createPayment(data: {
    invoice_id?: string;
    amount?: number;
    date?: string;
    mode?: string;
    reference?: string;
    notes?: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request('POST', '/payments', { data });
  }

  async deletePayment(paymentId: string): Promise<any> {
    return this.request('DELETE', `/payments/${paymentId}`);
  }

  // ========== Expenses ==========

  async listExpenses(params?: { page?: number; per_page?: number }): Promise<any> {
    return this.request('GET', '/expenses', { params });
  }

  async createExpense(data: {
    date?: string;
    amount?: number;
    currency?: string;
    seller_name?: string;
    description?: string;
    category?: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request('POST', '/expenses', { data });
  }

  async deleteExpense(expenseId: string): Promise<any> {
    return this.request('DELETE', `/expenses/${expenseId}`);
  }

  // ========== Currencies ==========

  async listCurrencies(): Promise<any> {
    return this.request('GET', '/currencies');
  }
}
