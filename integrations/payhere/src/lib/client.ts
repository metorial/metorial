import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let apiClient = createAxios({
  baseURL: 'https://api.payhere.co/api/v1',
  timeout: 30_000,
  headers: { Accept: 'application/json' }
});

apiClient.interceptors.response.use(
  response => {
    if (response.status === 204) return response;
    if (!isApiErrorRecord(response.data))
      throw createApiServiceError('Payhere returned an invalid JSON response.', {
        reason: 'invalid_response'
      });
    if (response.config.url !== '/current_company/stats') {
      let data = response.data.data;
      if (!isApiErrorRecord(data) && !Array.isArray(data))
        throw createApiServiceError('Payhere returned an invalid resource response.', {
          reason: 'invalid_response'
        });
      if (
        Array.isArray(data) &&
        (!data.every(isApiErrorRecord) ||
          (response.config.url !== '/hooks' && !isApiErrorRecord(response.data.meta)))
      )
        throw createApiServiceError('Payhere returned invalid paginated resource data.', {
          reason: 'invalid_response'
        });
    }
    return response;
  },
  error =>
    Promise.reject(
      buildApiServiceError(error, {
        providerLabel: 'Payhere',
        reason: 'payhere_api_error',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        nestedKeys: ['errors', 'error', 'message'],
        extractMessage: (input, helpers) => {
          let response = helpers.getResponseWithBody(input);
          if (!helpers.isRecord(response?.data) || !helpers.isRecord(response.data.errors))
            return;
          let details: string[] = [];
          for (let [field, errors] of Object.entries(response.data.errors)) {
            let messages: string[] = [];
            helpers.collectDetails(errors, messages);
            if (messages.length) details.push(`${field}: ${messages.join(', ')}`);
          }
          return details.length ? details.join('; ') : undefined;
        }
      })
    )
);

let validateId = (value: number, field: string) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`${field} must be a positive safe integer.`, {
      reason: 'invalid_input'
    });
  }
};

let validatePagination = (params?: PaginationParams) => {
  if (params?.page !== undefined) validateId(params.page, 'page');
  if (params?.perPage !== undefined) {
    validateId(params.perPage, 'perPage');
    if (params.perPage > 100)
      throw createApiServiceError('perPage must not exceed 100.', { reason: 'invalid_input' });
  }
};

let stringValue = (value: unknown, field: string): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw createApiServiceError(`Payhere returned an invalid ${field}.`, {
    reason: 'invalid_response'
  });
};

let locationValue = (value: unknown): string | null => {
  if (value === null || typeof value === 'string') return value;
  if (isApiErrorRecord(value)) return JSON.stringify(value);
  throw createApiServiceError('Payhere returned an invalid customer location.', {
    reason: 'invalid_response'
  });
};

let validatePlan = (params: UpdatePlanParams) => {
  for (let field of ['price', 'setupFee'] as const) {
    let value = params[field];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw createApiServiceError(
        `${field} must be a finite, non-negative amount in the plan currency.`,
        { reason: 'invalid_input' }
      );
    }
  }
  for (let field of ['minBillingCycles', 'cancelAfter'] as const) {
    let value = params[field];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0))
      throw createApiServiceError(`${field} must be a non-negative safe integer.`, {
        reason: 'invalid_input'
      });
  }
  if (params.billingDay !== undefined) validateId(params.billingDay, 'billingDay');
  if (params.billingDay !== undefined && params.billingDay > 31) {
    throw createApiServiceError('billingDay must be between 1 and 31.', {
      reason: 'invalid_input'
    });
  }
  if (params.currency !== undefined && !/^[a-z]{3}$/i.test(params.currency)) {
    throw createApiServiceError('currency must be a three-letter currency code.', {
      reason: 'invalid_input'
    });
  }
  if (params.name !== undefined && !params.name.trim()) {
    throw createApiServiceError('name must not be empty.', { reason: 'invalid_input' });
  }
};

let confirmNoContent = (status: number, operation: string) => {
  if (status !== 204)
    throw createApiServiceError(
      `Payhere did not confirm ${operation} with the documented HTTP 204 response. Check the resource before retrying.`,
      { reason: 'unconfirmed_operation', upstreamStatus: status }
    );
};

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginationMeta {
  raw?: Record<string, unknown>;
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  totalPages: number;
  totalCount: number;
}

export interface Plan {
  raw?: Record<string, unknown>;
  planId: number;
  paymentType: string;
  name: string;
  description: string | null;
  price: string;
  priceInCents: number;
  currency: string;
  slug: string;
  billingInterval: string | null;
  billingIntervalCount: number | null;
  billingDay: number | null;
  trialPeriodDays: number | null;
  setupFee: string | null;
  hasSetupFee: boolean;
  hidden: boolean;
  limitedQty: boolean;
  qty: number | null;
  cancelAfter: number | null;
  minBillingCycles: number | null;
  successUrl: string | null;
  webhookUrl: string | null;
  receiptText: string | null;
  customFields: unknown[];
  userSelectsAmount: boolean;
  showQty: boolean;
  payButtonText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanParams {
  paymentType: 'recurring' | 'one_off';
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  userSelectsAmount?: boolean;
  receiptText?: string;
  hidden?: boolean;
  successUrl?: string;
  webhookUrl?: string;
  payButtonText?: string;
  showQty?: boolean;
  billingInterval?: 'week' | 'month' | 'year';
  setupFee?: number;
  minBillingCycles?: number;
  billingDay?: number;
  cancelAfter?: number;
}

export interface UpdatePlanParams {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  userSelectsAmount?: boolean;
  receiptText?: string;
  hidden?: boolean;
  successUrl?: string;
  webhookUrl?: string;
  payButtonText?: string;
  showQty?: boolean;
  billingInterval?: 'week' | 'month' | 'year';
  setupFee?: number;
  minBillingCycles?: number;
  billingDay?: number;
  cancelAfter?: number;
}

export interface Payment {
  raw?: Record<string, unknown>;
  paymentId: number;
  hashid: string;
  reference: string | null;
  amount: number;
  formattedAmount: string;
  currency: string;
  refundAmount: number;
  amountPaid: number;
  cardBrand: string | null;
  cardLast4: string | null;
  status: string;
  success: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDetail extends Payment {
  customer: Customer | null;
  subscription: SubscriptionSummary | null;
  plan: PlanSummary | null;
}

export interface Customer {
  raw?: Record<string, unknown>;
  customerId: number;
  name: string;
  email: string;
  ipAddress: string | null;
  location: string | null;
  locationDetails?: Record<string, unknown>;
  payments?: Record<string, unknown>[];
  subscriptions?: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  payments?: Record<string, unknown>[];
  raw?: Record<string, unknown>;
  subscriptionId: number;
  customerId: number;
  membershipPlanId: number;
  status: string;
  lastCharged: string | null;
  nextChargeAt: string | null;
  billingInterval: string;
  billingIntervalCount: number;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer | null;
  plan: PlanSummary | null;
}

export interface SubscriptionSummary {
  raw?: Record<string, unknown>;
  subscriptionId: number;
  status: string;
  billingInterval: string;
}

export interface PlanSummary {
  raw?: Record<string, unknown>;
  planId: number;
  name: string;
  price: string;
  currency: string;
}

export interface Company {
  raw?: Record<string, unknown>;
  companyId: number;
  name: string;
  legalName: string | null;
  slug: string;
  countryCode: string;
  buttonColor: string;
  buttonText: string;
  stripeConnected: boolean;
  gocardlessConnected: boolean;
  currency: string;
  vatRegistered: boolean;
  vatRate: string | null;
  plan: string;
  subscriptionStatus: string;
  activeUntil: string | null;
  supportEmail: string | null;
  website: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyStats {
  raw?: Record<string, unknown>;
  currency: string;
  paymentsLast30: number;
  paymentsComparison: number;
  subscribersLast30: number;
  subscribersComparison: number;
  paymentsAllTime: number;
}

export interface UpdateCompanyParams {
  name?: string;
  legalName?: string;
  address?: string;
  supportEmail?: string;
  website?: string;
  buttonColor?: string;
  buttonText?: string;
}

export interface RefundParams {
  paymentId: number;
  amount: number;
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent';
}

export interface Hook {
  raw?: Record<string, unknown>;
  hookId: number;
  companyId: number;
  resource: string;
  postUrl: string;
  integration: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHookParams {
  resource: 'payment_received' | 'subscription_cancelled' | 'subscription_created';
  postUrl: string;
  integration: string;
}

let mapPlan = (raw: any): Plan => ({
  raw,
  planId: raw.id,
  paymentType: raw.payment_type,
  name: raw.name,
  description: raw.description,
  price: stringValue(raw.price, 'plan price'),
  priceInCents: raw.price_in_cents,
  currency: raw.currency,
  slug: raw.slug,
  billingInterval: raw.billing_interval,
  billingIntervalCount: raw.billing_interval_count,
  billingDay: raw.billing_day,
  trialPeriodDays: raw.trial_period_days,
  setupFee: raw.setup_fee === null ? null : stringValue(raw.setup_fee, 'setup fee'),
  hasSetupFee: raw.has_setup_fee,
  hidden: raw.hidden,
  limitedQty: raw.limited_qty,
  qty: raw.qty,
  cancelAfter: raw.cancel_after,
  minBillingCycles: raw.min_billing_cycles,
  successUrl: raw.success_url,
  webhookUrl: raw.webhook_url,
  receiptText: raw.receipt_text,
  customFields: raw.custom_fields,
  userSelectsAmount: raw.user_selects_amount,
  showQty: raw.show_qty,
  payButtonText: raw.pay_button_text,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapPayment = (raw: any): Payment => ({
  raw,
  paymentId: raw.id,
  hashid: raw.hashid,
  reference: raw.reference,
  amount: raw.amount,
  formattedAmount: raw.formatted_amount,
  currency: raw.currency,
  refundAmount: raw.refund_amount,
  amountPaid: raw.amount_paid,
  cardBrand: raw.card_brand,
  cardLast4: raw.card_last4,
  status: raw.status,
  success: raw.success,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapPaymentDetail = (raw: any): PaymentDetail => ({
  ...mapPayment(raw),
  customer: raw.customer ? mapCustomer(raw.customer) : null,
  subscription: raw.subscription
    ? {
        raw: raw.subscription,
        subscriptionId: raw.subscription.id,
        status: raw.subscription.status,
        billingInterval: raw.subscription.billing_interval
      }
    : null,
  plan: raw.item
    ? {
        raw: raw.item,
        planId: raw.item.id,
        name: raw.item.name,
        price: stringValue(raw.item.price, 'plan price'),
        currency: raw.item.currency
      }
    : null
});

let mapCustomer = (raw: any): Customer => ({
  raw,
  customerId: raw.id,
  name: raw.name,
  email: raw.email,
  ipAddress: raw.ip_address,
  location: locationValue(raw.location),
  ...(isApiErrorRecord(raw.location) ? { locationDetails: raw.location } : {}),
  ...(Array.isArray(raw.payments) ? { payments: raw.payments } : {}),
  ...(Array.isArray(raw.subscriptions) ? { subscriptions: raw.subscriptions } : {}),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapSubscription = (raw: any): Subscription => ({
  raw,
  ...(Array.isArray(raw.payments) ? { payments: raw.payments } : {}),
  subscriptionId: raw.id,
  customerId: raw.customer_id,
  membershipPlanId: raw.membership_plan_id,
  status: raw.status,
  lastCharged: raw.last_charged,
  nextChargeAt: raw.next_charge_at,
  billingInterval: raw.billing_interval,
  billingIntervalCount: raw.billing_interval_count,
  provider: raw.provider,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  customer: raw.customer ? mapCustomer(raw.customer) : null,
  plan: raw.plan
    ? {
        raw: raw.plan,
        planId: raw.plan.id,
        name: raw.plan.name,
        price: stringValue(raw.plan.price, 'plan price'),
        currency: raw.plan.currency
      }
    : null
});

let mapCompany = (raw: any): Company => ({
  raw,
  companyId: raw.id,
  name: raw.name,
  legalName: raw.legal_name,
  slug: raw.slug,
  countryCode: raw.country_code,
  buttonColor: raw.button_color,
  buttonText: raw.button_text,
  stripeConnected: raw.stripe_connected,
  gocardlessConnected: raw.gocardless_connected,
  currency: raw.currency,
  vatRegistered: raw.vat_registered,
  vatRate: raw.vat_rate,
  plan: raw.plan,
  subscriptionStatus: raw.subscription_status,
  activeUntil: raw.active_until,
  supportEmail: raw.support_email,
  website: raw.website,
  address: raw.address,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapCompanyStats = (raw: any): CompanyStats => ({
  raw,
  currency: raw.currency,
  paymentsLast30: raw.payments_last_30,
  paymentsComparison: raw.payments_comparison,
  subscribersLast30: raw.subscribers_last_30,
  subscribersComparison: raw.subscribers_comparison,
  paymentsAllTime: raw.payments_all_time
});

let mapHook = (raw: any): Hook => ({
  raw,
  hookId: raw.id,
  companyId: raw.company_id,
  resource: raw.resource,
  postUrl: raw.post_url,
  integration: raw.integration,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapMeta = (raw: any): PaginationMeta => ({
  raw,
  currentPage: raw.current_page,
  nextPage: raw.next_page,
  prevPage: raw.prev_page,
  totalPages: raw.total_pages,
  totalCount: raw.total_count
});

let toSnakeCase = (params: object): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  for (let [key, value] of Object.entries(pickDefined(params))) {
    let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
};

export class PayhereClient {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Payhere API key is required.', {
        reason: 'missing_auth'
      });
    this.token = config.token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Plans
  async listPlans(
    params?: PaginationParams
  ): Promise<{ plans: Plan[]; meta: PaginationMeta; raw?: Record<string, unknown> }> {
    validatePagination(params);
    let response = await apiClient.get('/plans', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      raw: response.data,
      plans: response.data.data.map(mapPlan),
      meta: mapMeta(response.data.meta)
    };
  }

  async getPlan(planId: number): Promise<Plan> {
    validateId(planId, 'planId');
    let response = await apiClient.get(`/plans/${planId}`, {
      headers: this.headers
    });
    return mapPlan(response.data.data);
  }

  async createPlan(params: CreatePlanParams): Promise<Plan> {
    validatePlan(params);
    if (params.paymentType === 'recurring' && !params.billingInterval) {
      throw createApiServiceError('billingInterval is required for a recurring plan.', {
        reason: 'invalid_input'
      });
    }
    if (
      params.paymentType === 'one_off' &&
      [
        params.billingInterval,
        params.setupFee,
        params.minBillingCycles,
        params.billingDay,
        params.cancelAfter
      ].some(value => value !== undefined)
    ) {
      throw createApiServiceError(
        'Billing and setup-fee options only apply to recurring plans.',
        { reason: 'invalid_input' }
      );
    }
    if (params.paymentType === 'recurring' && params.showQty === true) {
      throw createApiServiceError('showQty only applies to one-off plans.', {
        reason: 'invalid_input'
      });
    }
    let body = toSnakeCase({
      paymentType: params.paymentType,
      name: params.name,
      description: params.description,
      price: params.price,
      currency: params.currency,
      userSelectsAmount: params.userSelectsAmount,
      receiptText: params.receiptText,
      hidden: params.hidden,
      successUrl: params.successUrl,
      webhookUrl: params.webhookUrl,
      payButtonText: params.payButtonText,
      showQty: params.showQty,
      billingInterval: params.billingInterval,
      setupFee: params.setupFee,
      minBillingCycles: params.minBillingCycles,
      billingDay: params.billingDay,
      cancelAfter: params.cancelAfter
    });

    let response = await apiClient.post('/plans', body, {
      headers: this.headers
    });
    return mapPlan(response.data.data);
  }

  async updatePlan(planId: number, params: UpdatePlanParams): Promise<Plan> {
    validateId(planId, 'planId');
    validatePlan(params);
    if (!Object.values(params).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one plan field to update.', {
        reason: 'invalid_input'
      });
    let body = toSnakeCase(params);

    let response = await apiClient.put(`/plans/${planId}`, body, {
      headers: this.headers
    });
    return mapPlan(response.data.data);
  }

  // Payments
  async listPayments(
    params?: PaginationParams
  ): Promise<{ payments: Payment[]; meta: PaginationMeta; raw?: Record<string, unknown> }> {
    validatePagination(params);
    let response = await apiClient.get('/payments', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      raw: response.data,
      payments: response.data.data.map(mapPayment),
      meta: mapMeta(response.data.meta)
    };
  }

  async getPayment(paymentId: number): Promise<PaymentDetail> {
    validateId(paymentId, 'paymentId');
    let response = await apiClient.get(`/payments/${paymentId}`, {
      headers: this.headers
    });
    return mapPaymentDetail(response.data.data);
  }

  // Customers
  async listCustomers(
    params?: PaginationParams
  ): Promise<{ customers: Customer[]; meta: PaginationMeta; raw?: Record<string, unknown> }> {
    validatePagination(params);
    let response = await apiClient.get('/customers', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      raw: response.data,
      customers: response.data.data.map(mapCustomer),
      meta: mapMeta(response.data.meta)
    };
  }

  async getCustomer(customerId: number): Promise<Customer> {
    validateId(customerId, 'customerId');
    let response = await apiClient.get(`/customers/${customerId}`, {
      headers: this.headers
    });
    return mapCustomer(response.data.data);
  }

  // Subscriptions
  async listSubscriptions(params?: PaginationParams): Promise<{
    subscriptions: Subscription[];
    meta: PaginationMeta;
    raw?: Record<string, unknown>;
  }> {
    validatePagination(params);
    let response = await apiClient.get('/subscriptions', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      raw: response.data,
      subscriptions: response.data.data.map(mapSubscription),
      meta: mapMeta(response.data.meta)
    };
  }

  async getSubscription(subscriptionId: number): Promise<Subscription> {
    validateId(subscriptionId, 'subscriptionId');
    let response = await apiClient.get(`/subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
    return mapSubscription(response.data.data);
  }

  async cancelSubscription(subscriptionId: number): Promise<void> {
    validateId(subscriptionId, 'subscriptionId');
    let response = await apiClient.delete(`/subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
    confirmNoContent(response.status, 'subscription cancellation');
  }

  // Refunds
  async createRefund(params: RefundParams): Promise<void> {
    validateId(params.paymentId, 'paymentId');
    if (!Number.isFinite(params.amount) || params.amount <= 0)
      throw createApiServiceError(
        'Refund amount must be a finite amount greater than zero in the original payment currency.',
        { reason: 'invalid_input' }
      );
    let body = {
      payment_id: params.paymentId,
      amount: params.amount,
      reason: params.reason
    };
    let response = await apiClient.post('/refunds', body, {
      headers: this.headers
    });
    confirmNoContent(response.status, 'refund');
  }

  // Company
  async getCompany(): Promise<Company> {
    let response = await apiClient.get('/current_company', {
      headers: this.headers
    });
    return mapCompany(response.data.data);
  }

  async updateCompany(params: UpdateCompanyParams): Promise<Company> {
    if (!Object.values(params).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one company field to update.', {
        reason: 'invalid_input'
      });
    if (params.buttonText !== undefined && !['', 'white', 'black'].includes(params.buttonText))
      throw createApiServiceError('buttonText must be empty, white, or black.', {
        reason: 'invalid_input'
      });
    let body = toSnakeCase(params);
    let response = await apiClient.put('/current_company', body, {
      headers: this.headers
    });
    return mapCompany(response.data.data);
  }

  async getCompanyStats(): Promise<CompanyStats> {
    let response = await apiClient.get('/current_company/stats', {
      headers: this.headers
    });
    return mapCompanyStats(response.data);
  }

  // Hooks
  async listHooks(): Promise<Hook[]> {
    let response = await apiClient.get('/hooks', {
      headers: this.headers
    });
    return response.data.data.map(mapHook);
  }

  async createHook(params: CreateHookParams): Promise<Hook> {
    let body = {
      resource: params.resource,
      post_url: params.postUrl,
      integration: params.integration
    };
    let response = await apiClient.post('/hooks', body, {
      headers: this.headers
    });
    return mapHook(response.data.data);
  }

  async deleteHook(hookId: number): Promise<void> {
    validateId(hookId, 'hookId');
    await apiClient.delete(`/hooks/${hookId}`, {
      headers: this.headers
    });
  }

  // User
  async getUser(): Promise<{
    raw?: Record<string, unknown>;
    userId: number;
    displayName: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  }> {
    let response = await apiClient.get('/user', {
      headers: this.headers
    });
    let user = response.data.data;
    return {
      raw: user,
      userId: user.id,
      displayName: user.display_name,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
}
