import { createAxios } from 'slates';

let paymentSourceSchema = {
  type: 'card' as string | null,
  last4: null as string | null,
  brand: null as string | null,
  expMonth: null as number | null,
  expYear: null as number | null,
  bankName: null as string | null
};

export type PaymentSource = typeof paymentSourceSchema;

export interface CustomField {
  customFieldId: number;
  type: string;
  response: unknown;
}

export interface Coupon {
  code: string;
  duration: string;
  amountOff: number | null;
  currency: string | null;
  percentOff: number | null;
  durationInMonths: number | null;
  maxRedemptions: number | null;
}

export interface Discount {
  coupon: Coupon | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface Payment {
  paymentId: number;
  date: string;
  status: string;
  currency: string;
  amount: number;
  fee: number;
  amountRefunded: number;
  amountDescription: string | null;
  name: string;
  email: string;
  paymentSource: PaymentSource;
  customId: string | null;
  chargeReference: string | null;
  customerId: number | null;
  customerReference: string | null;
  invoiceReference: string | null;
  formId: number;
  coupon: Coupon | null;
  customFields: Record<string, CustomField>;
  checkout: Record<string, unknown> | null;
}

export interface Subscription {
  subscriptionId: number;
  subscriptionReference: string;
  status: string;
  start: string | null;
  firstPaymentAttempt: string | null;
  nextPaymentAttempt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  expiresAt: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  plan: {
    planId: string | null;
    planReference: string | null;
    amount: number;
    currency: string;
    interval: string;
    intervalCount: number;
  } | null;
}

export interface Customer {
  customerId: number;
  accountBalance: number;
  name: string;
  email: string;
  paymentSource: PaymentSource;
  customId: string | null;
  customerReference: string | null;
  discount: Discount | null;
  delinquent: boolean;
  managementUrl: string;
  formId: number;
  customFields: Record<string, CustomField>;
  checkout: Record<string, unknown> | null;
  subscription: Subscription | null;
}

export interface Form {
  formId: number;
  title: string;
  accessToken: string;
  currency: string;
  paymentVolume: number;
  successfulCheckoutCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListParams {
  count?: number;
  offset?: number;
}

export interface PaymentListParams extends ListParams {
  formId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface CustomerListParams extends ListParams {
  formId?: number;
  checkoutFrom?: string;
  checkoutTo?: string;
  nextPaymentFrom?: string;
  nextPaymentTo?: string;
  status?: string;
}

let mapPaymentSource = (source: Record<string, unknown> | null): PaymentSource => {
  if (!source) {
    return {
      type: null,
      last4: null,
      brand: null,
      expMonth: null,
      expYear: null,
      bankName: null
    };
  }
  return {
    type: (source.type as string) ?? null,
    last4: (source.last4 as string) ?? null,
    brand: (source.brand as string) ?? null,
    expMonth: (source.exp_month as number) ?? null,
    expYear: (source.exp_year as number) ?? null,
    bankName: (source.bank_name as string) ?? null
  };
};

let mapCoupon = (coupon: Record<string, unknown> | null): Coupon | null => {
  if (!coupon) return null;
  return {
    code: (coupon.code as string) ?? '',
    duration: (coupon.duration as string) ?? '',
    amountOff: (coupon.amount_off as number) ?? null,
    currency: (coupon.currency as string) ?? null,
    percentOff: (coupon.percent_off as number) ?? null,
    durationInMonths: (coupon.duration_in_months as number) ?? null,
    maxRedemptions: (coupon.max_redemptions as number) ?? null
  };
};

let mapDiscount = (discount: Record<string, unknown> | null): Discount | null => {
  if (!discount) return null;
  return {
    coupon: mapCoupon((discount.coupon as Record<string, unknown>) ?? null),
    startedAt: (discount.started_at as string) ?? null,
    endedAt: (discount.ended_at as string) ?? null
  };
};

let mapCustomFields = (
  fields: Record<string, unknown> | null
): Record<string, CustomField> => {
  if (!fields) return {};
  let result: Record<string, CustomField> = {};
  for (let [key, value] of Object.entries(fields)) {
    let field = value as Record<string, unknown>;
    result[key] = {
      customFieldId: (field.id as number) ?? 0,
      type: (field.type as string) ?? 'string',
      response: field.response ?? null
    };
  }
  return result;
};

let mapSubscription = (sub: Record<string, unknown> | null): Subscription | null => {
  if (!sub) return null;
  let plan = (sub.plan as Record<string, unknown>) ?? null;
  return {
    subscriptionId: (sub.id as number) ?? 0,
    subscriptionReference: (sub.subscription_reference as string) ?? '',
    status: (sub.status as string) ?? '',
    start: (sub.start as string) ?? null,
    firstPaymentAttempt: (sub.first_payment_attempt as string) ?? null,
    nextPaymentAttempt: (sub.next_payment_attempt as string) ?? null,
    currentPeriodStart: (sub.current_period_start as string) ?? null,
    currentPeriodEnd: (sub.current_period_end as string) ?? null,
    trialStart: (sub.trial_start as string) ?? null,
    trialEnd: (sub.trial_end as string) ?? null,
    expiresAt: (sub.expires_at as string) ?? null,
    canceledAt: (sub.canceled_at as string) ?? null,
    endedAt: (sub.ended_at as string) ?? null,
    plan: plan
      ? {
          planId: (plan.id as string) ?? null,
          planReference: (plan.plan_reference as string) ?? null,
          amount: (plan.amount as number) ?? 0,
          currency: (plan.currency as string) ?? '',
          interval: (plan.interval as string) ?? '',
          intervalCount: (plan.interval_count as number) ?? 1
        }
      : null
  };
};

let mapPayment = (raw: Record<string, unknown>): Payment => {
  return {
    paymentId: (raw.id as number) ?? 0,
    date: (raw.date as string) ?? '',
    status: (raw.status as string) ?? '',
    currency: (raw.currency as string) ?? '',
    amount: (raw.amount as number) ?? 0,
    fee: (raw.fee as number) ?? 0,
    amountRefunded: (raw.amount_refunded as number) ?? 0,
    amountDescription: (raw.amount_description as string) ?? null,
    name: (raw.name as string) ?? '',
    email: (raw.email as string) ?? '',
    paymentSource: mapPaymentSource((raw.payment_source as Record<string, unknown>) ?? null),
    customId: (raw.custom_id as string) ?? null,
    chargeReference: (raw.charge_reference as string) ?? null,
    customerId: (raw.customer_id as number) ?? null,
    customerReference: (raw.customer_reference as string) ?? null,
    invoiceReference: (raw.invoice_reference as string) ?? null,
    formId: (raw.form_id as number) ?? 0,
    coupon: mapCoupon((raw.coupon as Record<string, unknown>) ?? null),
    customFields: mapCustomFields((raw.custom_fields as Record<string, unknown>) ?? null),
    checkout: (raw.checkout as Record<string, unknown>) ?? null
  };
};

let mapCustomer = (raw: Record<string, unknown>): Customer => {
  return {
    customerId: (raw.id as number) ?? 0,
    accountBalance: (raw.account_balance as number) ?? 0,
    name: (raw.name as string) ?? '',
    email: (raw.email as string) ?? '',
    paymentSource: mapPaymentSource((raw.payment_source as Record<string, unknown>) ?? null),
    customId: (raw.custom_id as string) ?? null,
    customerReference: (raw.customer_reference as string) ?? null,
    discount: mapDiscount((raw.discount as Record<string, unknown>) ?? null),
    delinquent: (raw.delinquent as boolean) ?? false,
    managementUrl: (raw.management_url as string) ?? '',
    formId: (raw.form_id as number) ?? 0,
    customFields: mapCustomFields((raw.custom_fields as Record<string, unknown>) ?? null),
    checkout: (raw.checkout as Record<string, unknown>) ?? null,
    subscription: mapSubscription((raw.subscription as Record<string, unknown>) ?? null)
  };
};

let mapForm = (raw: Record<string, unknown>): Form => {
  return {
    formId: (raw.id as number) ?? 0,
    title: (raw.title as string) ?? '',
    accessToken: (raw.access_token as string) ?? '',
    currency: (raw.currency as string) ?? '',
    paymentVolume: (raw.payment_volume as number) ?? 0,
    successfulCheckoutCount: (raw.successful_checkout_count as number) ?? 0,
    createdAt: (raw.created_at as string) ?? '',
    updatedAt: (raw.updated_at as string) ?? ''
  };
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.moonclerk.com',
      headers: {
        Authorization: `Token token=${config.token}`,
        Accept: 'application/vnd.moonclerk+json;version=1'
      }
    });
  }

  async listPayments(params?: PaymentListParams): Promise<Payment[]> {
    let queryParams: Record<string, string> = {};
    if (params?.count) queryParams.count = String(params.count);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.formId) queryParams.form_id = String(params.formId);
    if (params?.customerId) queryParams.customer_id = String(params.customerId);
    if (params?.dateFrom) queryParams.date_from = params.dateFrom;
    if (params?.dateTo) queryParams.date_to = params.dateTo;
    if (params?.status) queryParams.status = params.status;

    let response = await this.axios.get('/payments', { params: queryParams });
    let payments = (response.data as Record<string, unknown>).payments as Record<
      string,
      unknown
    >[];
    return (payments ?? []).map(mapPayment);
  }

  async getPayment(paymentId: number): Promise<Payment> {
    let response = await this.axios.get(`/payments/${paymentId}`);
    let payment = (response.data as Record<string, unknown>).payment as Record<
      string,
      unknown
    >;
    return mapPayment(payment);
  }

  async listCustomers(params?: CustomerListParams): Promise<Customer[]> {
    let queryParams: Record<string, string> = {};
    if (params?.count) queryParams.count = String(params.count);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.formId) queryParams.form_id = String(params.formId);
    if (params?.checkoutFrom) queryParams.checkout_from = params.checkoutFrom;
    if (params?.checkoutTo) queryParams.checkout_to = params.checkoutTo;
    if (params?.nextPaymentFrom) queryParams.next_payment_from = params.nextPaymentFrom;
    if (params?.nextPaymentTo) queryParams.next_payment_to = params.nextPaymentTo;
    if (params?.status) queryParams.status = params.status;

    let response = await this.axios.get('/customers', { params: queryParams });
    let customers = (response.data as Record<string, unknown>).customers as Record<
      string,
      unknown
    >[];
    return (customers ?? []).map(mapCustomer);
  }

  async getCustomer(customerId: number): Promise<Customer> {
    let response = await this.axios.get(`/customers/${customerId}`);
    let customer = (response.data as Record<string, unknown>).customer as Record<
      string,
      unknown
    >;
    return mapCustomer(customer);
  }

  async listForms(): Promise<Form[]> {
    let response = await this.axios.get('/forms');
    let forms = (response.data as Record<string, unknown>).forms as Record<string, unknown>[];
    return (forms ?? []).map(mapForm);
  }

  async getForm(formId: number): Promise<Form> {
    let response = await this.axios.get(`/forms/${formId}`);
    let form = (response.data as Record<string, unknown>).form as Record<string, unknown>;
    return mapForm(form);
  }
}
