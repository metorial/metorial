import { createAxios } from 'slates';
import type {
  Category,
  CreateCustomerParams,
  CreateOrderParams,
  CreateRefundParams,
  Customer,
  ListOrdersParams,
  ListRefundsParams,
  NexusRegion,
  Order,
  RateParams,
  RateResult,
  Refund,
  SummaryRate,
  TaxCalculationParams,
  TaxCalculationResult,
  UpdateCustomerParams,
  UpdateOrderParams,
  UpdateRefundParams,
  ValidateAddressParams,
  ValidatedAddress
} from './types';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.taxjar.com/v2',
  sandbox: 'https://api.sandbox.taxjar.com/v2'
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; environment: string; apiVersion?: string }) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };

    if (config.apiVersion) {
      headers['x-api-version'] = config.apiVersion;
    }

    this.axios = createAxios({
      baseURL: BASE_URLS[config.environment] || BASE_URLS.production,
      headers
    });
  }

  // ---- Tax Calculation ----

  async calculateTax(params: TaxCalculationParams): Promise<TaxCalculationResult> {
    let response = await this.axios.post('/taxes', params);
    return response.data.tax;
  }

  // ---- Tax Rates ----

  async getRatesForLocation(zip: string, params?: RateParams): Promise<RateResult> {
    let response = await this.axios.get(`/rates/${zip}`, { params });
    return response.data.rate;
  }

  // ---- Categories ----

  async listCategories(): Promise<Category[]> {
    let response = await this.axios.get('/categories');
    return response.data.categories;
  }

  // ---- Orders ----

  async listOrders(params?: ListOrdersParams): Promise<string[]> {
    let response = await this.axios.get('/transactions/orders', { params });
    return response.data.orders;
  }

  async showOrder(transactionId: string, provider?: string): Promise<Order> {
    let response = await this.axios.get(`/transactions/orders/${transactionId}`, {
      params: provider ? { provider } : undefined
    });
    return response.data.order;
  }

  async createOrder(params: CreateOrderParams): Promise<Order> {
    let response = await this.axios.post('/transactions/orders', params);
    return response.data.order;
  }

  async updateOrder(params: UpdateOrderParams): Promise<Order> {
    let response = await this.axios.put(
      `/transactions/orders/${params.transaction_id}`,
      params
    );
    return response.data.order;
  }

  async deleteOrder(transactionId: string, provider?: string): Promise<Order> {
    let response = await this.axios.delete(`/transactions/orders/${transactionId}`, {
      params: provider ? { provider } : undefined
    });
    return response.data.order;
  }

  // ---- Refunds ----

  async listRefunds(params?: ListRefundsParams): Promise<string[]> {
    let response = await this.axios.get('/transactions/refunds', { params });
    return response.data.refunds;
  }

  async showRefund(transactionId: string, provider?: string): Promise<Refund> {
    let response = await this.axios.get(`/transactions/refunds/${transactionId}`, {
      params: provider ? { provider } : undefined
    });
    return response.data.refund;
  }

  async createRefund(params: CreateRefundParams): Promise<Refund> {
    let response = await this.axios.post('/transactions/refunds', params);
    return response.data.refund;
  }

  async updateRefund(params: UpdateRefundParams): Promise<Refund> {
    let response = await this.axios.put(
      `/transactions/refunds/${params.transaction_id}`,
      params
    );
    return response.data.refund;
  }

  async deleteRefund(transactionId: string, provider?: string): Promise<Refund> {
    let response = await this.axios.delete(`/transactions/refunds/${transactionId}`, {
      params: provider ? { provider } : undefined
    });
    return response.data.refund;
  }

  // ---- Customers ----

  async listCustomers(): Promise<Customer[]> {
    let response = await this.axios.get('/customers');
    return response.data.customers;
  }

  async showCustomer(customerId: string): Promise<Customer> {
    let response = await this.axios.get(`/customers/${customerId}`);
    return response.data.customer;
  }

  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    let response = await this.axios.post('/customers', params);
    return response.data.customer;
  }

  async updateCustomer(params: UpdateCustomerParams): Promise<Customer> {
    let response = await this.axios.put(`/customers/${params.customer_id}`, params);
    return response.data.customer;
  }

  async deleteCustomer(customerId: string): Promise<Customer> {
    let response = await this.axios.delete(`/customers/${customerId}`);
    return response.data.customer;
  }

  // ---- Nexus Regions ----

  async listNexusRegions(): Promise<NexusRegion[]> {
    let response = await this.axios.get('/nexus/regions');
    return response.data.regions;
  }

  // ---- Address Validation ----

  async validateAddress(params: ValidateAddressParams): Promise<ValidatedAddress[]> {
    let response = await this.axios.post('/addresses/validate', params);
    return response.data.addresses;
  }

  // ---- Summary Rates ----

  async listSummaryRates(): Promise<SummaryRate[]> {
    let response = await this.axios.get('/summary_rates');
    return response.data.summary_rates;
  }
}
