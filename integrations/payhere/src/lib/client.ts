import { createAxios } from 'slates';

let apiClient = createAxios({
  baseURL: 'https://api.payhere.co/api/v1'
});

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginationMeta {
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  totalPages: number;
  totalCount: number;
}

export interface Plan {
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
  customFields: any[];
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
  customerId: number;
  name: string;
  email: string;
  ipAddress: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
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
  subscriptionId: number;
  status: string;
  billingInterval: string;
}

export interface PlanSummary {
  planId: number;
  name: string;
  price: string;
  currency: string;
}

export interface Company {
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
  planId: raw.id,
  paymentType: raw.payment_type,
  name: raw.name,
  description: raw.description,
  price: raw.price,
  priceInCents: raw.price_in_cents,
  currency: raw.currency,
  slug: raw.slug,
  billingInterval: raw.billing_interval,
  billingIntervalCount: raw.billing_interval_count,
  billingDay: raw.billing_day,
  trialPeriodDays: raw.trial_period_days,
  setupFee: raw.setup_fee,
  hasSetupFee: raw.has_setup_fee,
  hidden: raw.hidden,
  limitedQty: raw.limited_qty,
  qty: raw.qty,
  cancelAfter: raw.cancel_after,
  minBillingCycles: raw.min_billing_cycles,
  successUrl: raw.success_url,
  webhookUrl: raw.webhook_url,
  receiptText: raw.receipt_text,
  customFields: raw.custom_fields || [],
  userSelectsAmount: raw.user_selects_amount,
  showQty: raw.show_qty,
  payButtonText: raw.pay_button_text,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapPayment = (raw: any): Payment => ({
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
        subscriptionId: raw.subscription.id,
        status: raw.subscription.status,
        billingInterval: raw.subscription.billing_interval
      }
    : null,
  plan: raw.item
    ? {
        planId: raw.item.id,
        name: raw.item.name,
        price: raw.item.price,
        currency: raw.item.currency
      }
    : null
});

let mapCustomer = (raw: any): Customer => ({
  customerId: raw.id,
  name: raw.name,
  email: raw.email,
  ipAddress: raw.ip_address,
  location: raw.location,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapSubscription = (raw: any): Subscription => ({
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
        planId: raw.plan.id,
        name: raw.plan.name,
        price: raw.plan.price,
        currency: raw.plan.currency
      }
    : null
});

let mapCompany = (raw: any): Company => ({
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
  currency: raw.currency,
  paymentsLast30: raw.payments_last_30,
  paymentsComparison: raw.payments_comparison,
  subscribersLast30: raw.subscribers_last_30,
  subscribersComparison: raw.subscribers_comparison,
  paymentsAllTime: raw.payments_all_time
});

let mapHook = (raw: any): Hook => ({
  hookId: raw.id,
  companyId: raw.company_id,
  resource: raw.resource,
  postUrl: raw.post_url,
  integration: raw.integration,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let mapMeta = (raw: any): PaginationMeta => ({
  currentPage: raw.current_page,
  nextPage: raw.next_page,
  prevPage: raw.prev_page,
  totalPages: raw.total_pages,
  totalCount: raw.total_count
});

let toSnakeCase = (params: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
};

export class PayhereClient {
  private token: string;

  constructor(config: { token: string }) {
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
  ): Promise<{ plans: Plan[]; meta: PaginationMeta }> {
    let response = await apiClient.get('/plans', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      plans: response.data.data.map(mapPlan),
      meta: mapMeta(response.data.meta)
    };
  }

  async getPlan(planId: number): Promise<Plan> {
    let response = await apiClient.get(`/plans/${planId}`, {
      headers: this.headers
    });
    return mapPlan(response.data.data);
  }

  async createPlan(params: CreatePlanParams): Promise<Plan> {
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
    let body = toSnakeCase(params);

    let response = await apiClient.put(`/plans/${planId}`, body, {
      headers: this.headers
    });
    return mapPlan(response.data.data);
  }

  // Payments
  async listPayments(
    params?: PaginationParams
  ): Promise<{ payments: Payment[]; meta: PaginationMeta }> {
    let response = await apiClient.get('/payments', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      payments: response.data.data.map(mapPayment),
      meta: mapMeta(response.data.meta)
    };
  }

  async getPayment(paymentId: number): Promise<PaymentDetail> {
    let response = await apiClient.get(`/payments/${paymentId}`, {
      headers: this.headers
    });
    return mapPaymentDetail(response.data.data);
  }

  // Customers
  async listCustomers(
    params?: PaginationParams
  ): Promise<{ customers: Customer[]; meta: PaginationMeta }> {
    let response = await apiClient.get('/customers', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      customers: response.data.data.map(mapCustomer),
      meta: mapMeta(response.data.meta)
    };
  }

  async getCustomer(customerId: number): Promise<Customer> {
    let response = await apiClient.get(`/customers/${customerId}`, {
      headers: this.headers
    });
    return mapCustomer(response.data.data);
  }

  // Subscriptions
  async listSubscriptions(
    params?: PaginationParams
  ): Promise<{ subscriptions: Subscription[]; meta: PaginationMeta }> {
    let response = await apiClient.get('/subscriptions', {
      headers: this.headers,
      params: params ? { page: params.page, per_page: params.perPage } : undefined
    });
    return {
      subscriptions: response.data.data.map(mapSubscription),
      meta: mapMeta(response.data.meta)
    };
  }

  async getSubscription(subscriptionId: number): Promise<Subscription> {
    let response = await apiClient.get(`/subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
    return mapSubscription(response.data.data);
  }

  async cancelSubscription(subscriptionId: number): Promise<void> {
    await apiClient.delete(`/subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
  }

  // Refunds
  async createRefund(params: RefundParams): Promise<void> {
    let body = {
      payment_id: params.paymentId,
      amount: params.amount,
      reason: params.reason
    };
    await apiClient.post('/refunds', body, {
      headers: this.headers
    });
  }

  // Company
  async getCompany(): Promise<Company> {
    let response = await apiClient.get('/current_company', {
      headers: this.headers
    });
    return mapCompany(response.data.data);
  }

  async updateCompany(params: UpdateCompanyParams): Promise<Company> {
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
    return mapCompanyStats(response.data.data);
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
    await apiClient.delete(`/hooks/${hookId}`, {
      headers: this.headers
    });
  }

  // User
  async getUser(): Promise<{
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
      userId: user.id,
      displayName: user.display_name,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
}
