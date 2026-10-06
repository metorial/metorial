import { createApiServiceError, createAxios, pickDefined } from 'slates';
import type { z } from 'zod';
import {
  addressResponse,
  categoriesResponse,
  customerReceipt,
  customerResponse,
  idsResponse,
  nexusResponse,
  orderResponse,
  rateResponse,
  refundResponse,
  summaryResponse,
  taxResponse
} from './responses';
import type {
  CreateCustomerParams,
  CreateOrderParams,
  CreateRefundParams,
  Customer,
  ListOrdersParams,
  ListRefundsParams,
  RateParams,
  TaxCalculationParams,
  UpdateCustomerParams,
  UpdateOrderParams,
  UpdateRefundParams,
  ValidateAddressParams
} from './types';
import {
  apiFailure,
  baseUrls,
  environment,
  nonemptyUpdate,
  pathId,
  required,
  validateDate,
  validateListDates
} from './validation';

function validateLines(lines: { quantity?: number }[] | undefined): void {
  if (lines?.some(line => line.quantity !== undefined && !Number.isSafeInteger(line.quantity)))
    throw createApiServiceError('Line item quantities must be safe whole numbers.', {
      reason: 'taxjar_validation'
    });
}
function validateTransaction(
  params: CreateOrderParams | CreateRefundParams | UpdateOrderParams | UpdateRefundParams,
  create: boolean
): void {
  required(params.transaction_id, 'transactionId');
  if (create) {
    if (!/^[A-Za-z0-9_-]+$/.test(params.transaction_id))
      throw createApiServiceError(
        'New transaction IDs may contain only letters, numbers, underscores and dashes.',
        { reason: 'taxjar_validation' }
      );
    required(params.transaction_date, 'transactionDate');
    for (const field of ['to_country', 'to_zip', 'to_state'] as const)
      required(params[field], field);
  }
  validateDate(params.transaction_date, 'transactionDate');
  validateLines(params.line_items);
}
function matchId(actual: string, expected: string): void {
  if (actual !== expected)
    throw createApiServiceError(
      'TaxJar returned a different resource identifier. Verify the account and resource before continuing.',
      { reason: 'taxjar_response' }
    );
}
function containsSecret(value: unknown, token: string): boolean {
  if (typeof value === 'string') return value.includes(token);
  if (Array.isArray(value)) return value.some(entry => containsSecret(entry, token));
  if (value && typeof value === 'object')
    return Object.values(value).some(entry => containsSecret(entry, token));
  return false;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string; environment?: unknown; apiVersion?: string }) {
    this.token = required(config.token, 'API token');
    if (/\s/.test(this.token))
      throw createApiServiceError('Use an API token without whitespace.', {
        reason: 'taxjar_validation'
      });
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
    if (config.apiVersion !== undefined) {
      if (!['2012-01-01', '2020-08-07', '2022-01-24'].includes(config.apiVersion))
        throw createApiServiceError(
          'Choose a documented API version: 2012-01-01, 2020-08-07 or 2022-01-24, or omit apiVersion for the account default.',
          { reason: 'taxjar_validation' }
        );
      headers['x-api-version'] = config.apiVersion;
    }
    this.axios = createAxios({
      baseURL: baseUrls[environment(config.environment)],
      headers,
      timeout: 30000,
      maxRedirects: 0
    });
  }

  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    envelope: string,
    schema: z.ZodType<T>,
    body?: object,
    query?: object
  ): Promise<T> {
    let data: unknown;
    try {
      const response = await this.axios.request({
        method,
        url: path,
        data: body && pickDefined(body),
        params: query && pickDefined(query)
      });
      if (response.status < 200 || response.status >= 300)
        apiFailure({ response: { status: response.status } }, 'request');
      data = response.data;
    } catch (error) {
      apiFailure(error, 'request');
    }
    const value =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)[envelope]
        : undefined;
    const parsed = schema.safeParse(value);
    if (!parsed.success || containsSecret(parsed.data, this.token))
      throw createApiServiceError(
        'TaxJar returned an invalid or unsafe response. Retry or contact TaxJar support.',
        { reason: 'taxjar_response' }
      );
    return parsed.data;
  }

  async calculateTax(params: TaxCalculationParams) {
    required(params.to_country, 'toCountry');
    required(params.to_state, 'toState');
    if (params.to_country.toUpperCase() === 'US') required(params.to_zip, 'toZip');
    if (params.amount === undefined && !params.line_items?.length)
      throw createApiServiceError(
        'Supply amount or at least one line item to calculate tax.',
        { reason: 'taxjar_validation' }
      );
    validateLines(params.line_items);
    for (const address of params.nexus_addresses ?? []) {
      required(address.country, 'nexusAddresses.country');
      required(address.state, 'nexusAddresses.state');
    }
    return this.request('post', '/taxes', 'tax', taxResponse, params);
  }
  async getRatesForLocation(zip: string, params?: RateParams) {
    return this.request(
      'get',
      `/rates/${pathId(zip, 'zip')}`,
      'rate',
      rateResponse,
      undefined,
      params
    );
  }
  async listCategories() {
    return this.request('get', '/categories', 'categories', categoriesResponse);
  }
  async listOrders(params: ListOrdersParams = {}) {
    validateListDates(params);
    if (params.provider !== undefined) required(params.provider, 'provider');
    return this.request(
      'get',
      '/transactions/orders',
      'orders',
      idsResponse,
      undefined,
      params
    );
  }
  async showOrder(transactionId: string, provider?: string) {
    if (provider !== undefined) required(provider, 'provider');
    const order = await this.request(
      'get',
      `/transactions/orders/${pathId(transactionId, 'transactionId')}`,
      'order',
      orderResponse,
      undefined,
      { provider }
    );
    matchId(order.transaction_id, transactionId);
    return order;
  }
  async createOrder(params: CreateOrderParams) {
    validateTransaction(params, true);
    const order = await this.request(
      'post',
      '/transactions/orders',
      'order',
      orderResponse,
      params
    );
    matchId(order.transaction_id, params.transaction_id);
    return order;
  }
  async updateOrder(params: UpdateOrderParams) {
    nonemptyUpdate(params, ['transaction_id']);
    validateTransaction(params, false);
    const order = await this.request(
      'put',
      `/transactions/orders/${pathId(params.transaction_id, 'transactionId')}`,
      'order',
      orderResponse,
      params
    );
    matchId(order.transaction_id, params.transaction_id);
    return order;
  }
  async deleteOrder(transactionId: string, provider?: string) {
    if (provider !== undefined) required(provider, 'provider');
    const order = await this.request(
      'delete',
      `/transactions/orders/${pathId(transactionId, 'transactionId')}`,
      'order',
      orderResponse,
      undefined,
      { provider }
    );
    matchId(order.transaction_id, transactionId);
    return order;
  }
  async listRefunds(params: ListRefundsParams = {}) {
    validateListDates(params);
    if (params.provider !== undefined) required(params.provider, 'provider');
    return this.request(
      'get',
      '/transactions/refunds',
      'refunds',
      idsResponse,
      undefined,
      params
    );
  }
  async showRefund(transactionId: string, provider?: string) {
    if (provider !== undefined) required(provider, 'provider');
    const refund = await this.request(
      'get',
      `/transactions/refunds/${pathId(transactionId, 'transactionId')}`,
      'refund',
      refundResponse,
      undefined,
      { provider }
    );
    matchId(refund.transaction_id, transactionId);
    return refund;
  }
  async createRefund(params: CreateRefundParams) {
    validateTransaction(params, true);
    required(params.transaction_reference_id, 'transactionReferenceId');
    if (params.transaction_id === params.transaction_reference_id)
      throw createApiServiceError(
        'Use a refund transactionId different from its original order transactionReferenceId.',
        { reason: 'taxjar_validation' }
      );
    const refund = await this.request(
      'post',
      '/transactions/refunds',
      'refund',
      refundResponse,
      params
    );
    matchId(refund.transaction_id, params.transaction_id);
    return refund;
  }
  async updateRefund(params: UpdateRefundParams) {
    nonemptyUpdate(params, ['transaction_id']);
    validateTransaction(params, false);
    const reference =
      params.transaction_reference_id ??
      (await this.showRefund(params.transaction_id)).transaction_reference_id;
    required(reference, 'transactionReferenceId');
    if (params.transaction_id === reference)
      throw createApiServiceError(
        'Use a refund ID different from its original order reference.',
        { reason: 'taxjar_validation' }
      );
    const refund = await this.request(
      'put',
      `/transactions/refunds/${pathId(params.transaction_id, 'transactionId')}`,
      'refund',
      refundResponse,
      { ...params, transaction_reference_id: reference }
    );
    matchId(refund.transaction_id, params.transaction_id);
    return refund;
  }
  async deleteRefund(transactionId: string, provider?: string) {
    if (provider !== undefined) required(provider, 'provider');
    const refund = await this.request(
      'delete',
      `/transactions/refunds/${pathId(transactionId, 'transactionId')}`,
      'refund',
      refundResponse,
      undefined,
      { provider }
    );
    matchId(refund.transaction_id, transactionId);
    return refund;
  }
  async listCustomers(): Promise<Customer[]> {
    const ids = await this.request('get', '/customers', 'customers', idsResponse);
    const customers: Customer[] = [];
    for (const id of ids) customers.push(await this.showCustomer(id));
    return customers;
  }
  async showCustomer(customerId: string) {
    const customer = await this.request(
      'get',
      `/customers/${pathId(customerId, 'customerId')}`,
      'customer',
      customerResponse
    );
    matchId(customer.customer_id, customerId);
    return customer;
  }
  async createCustomer(params: CreateCustomerParams) {
    required(params.customer_id, 'customerId');
    required(params.name, 'name');
    required(params.exemption_type, 'exemptionType');
    const customer = await this.request(
      'post',
      '/customers',
      'customer',
      customerResponse,
      params
    );
    matchId(customer.customer_id, params.customer_id);
    return customer;
  }
  async updateCustomer(params: UpdateCustomerParams) {
    nonemptyUpdate(params, ['customer_id']);
    const existing =
      params.name === undefined || params.exemption_type === undefined
        ? await this.showCustomer(params.customer_id)
        : undefined;
    const name = required(params.name ?? existing?.name, 'name');
    const exemptionType = required(
      params.exemption_type ?? existing?.exemption_type,
      'exemptionType'
    );
    const customer = await this.request(
      'put',
      `/customers/${pathId(params.customer_id, 'customerId')}`,
      'customer',
      customerResponse,
      { ...params, name, exemption_type: exemptionType }
    );
    matchId(customer.customer_id, params.customer_id);
    return customer;
  }
  async deleteCustomer(customerId: string): Promise<Customer> {
    const previous = await this.showCustomer(customerId);
    const receipt = await this.request(
      'delete',
      `/customers/${pathId(customerId, 'customerId')}`,
      'customer',
      customerReceipt
    );
    matchId(receipt.customer_id, customerId);
    return previous;
  }
  async listNexusRegions() {
    return this.request('get', '/nexus/regions', 'regions', nexusResponse);
  }
  async validateAddress(params: ValidateAddressParams) {
    if (params.country !== undefined && params.country.toUpperCase() !== 'US')
      throw createApiServiceError('Address validation supports US addresses only.', {
        reason: 'taxjar_validation'
      });
    if (![params.zip, params.state, params.city, params.street].some(value => value?.trim()))
      throw createApiServiceError('Provide a ZIP code or address details to validate.', {
        reason: 'taxjar_validation'
      });
    return this.request('post', '/addresses/validate', 'addresses', addressResponse, params);
  }
  async listSummaryRates() {
    return this.request('get', '/summary_rates', 'summary_rates', summaryResponse);
  }
}

export function clientFor(ctx: {
  auth: { token: string; environment?: string };
  config: { environment?: unknown; apiVersion?: string };
}): Client {
  return new Client({
    token: ctx.auth.token,
    environment: ctx.auth.environment ?? ctx.config.environment,
    apiVersion: ctx.config.apiVersion
  });
}
