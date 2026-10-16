import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import type { z } from 'zod';
import { customerSchema, formSchema, paymentSchema } from './schemas';

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
  if (!isApiErrorRecord(source)) {
    throw createApiServiceError('MoonClerk returned invalid payment method data.', {
      reason: 'invalid_response'
    });
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
    code: coupon.code as string,
    duration: coupon.duration as string,
    amountOff: (coupon.amount_off as number) ?? null,
    currency: (coupon.currency as string) ?? null,
    percentOff: (coupon.percent_off as number) ?? null,
    durationInMonths: (coupon.duration_in_months as number) ?? null,
    maxRedemptions: (coupon.max_redemptions as number) ?? null
  };
};

let mapDiscount = (discount: Record<string, unknown> | null): Discount | null => {
  if (!discount) return null;
  if (!isApiErrorRecord(discount)) {
    throw createApiServiceError('MoonClerk returned invalid discount data.', {
      reason: 'invalid_response'
    });
  }
  return {
    coupon: mapCoupon((discount.coupon as Record<string, unknown>) ?? null),
    startedAt: ((discount.starts_at ?? discount.started_at) as string) ?? null,
    endedAt: ((discount.ends_at ?? discount.ended_at) as string) ?? null
  };
};

let mapCustomFields = (fields: Record<string, unknown>): Record<string, CustomField> => {
  if (!isApiErrorRecord(fields)) {
    throw createApiServiceError('MoonClerk returned invalid custom field data.', {
      reason: 'invalid_response'
    });
  }
  let result: Record<string, CustomField> = {};
  for (let [key, value] of Object.entries(fields)) {
    if (!isApiErrorRecord(value)) {
      throw createApiServiceError('MoonClerk returned an invalid custom field.', {
        reason: 'invalid_response'
      });
    }
    let field = value;
    result[key] = {
      customFieldId: field.id as number,
      type: field.type as string,
      response: field.response
    };
  }
  return result;
};

let mapSubscription = (sub: Record<string, unknown> | null): Subscription | null => {
  if (!sub) return null;
  let plan = (sub.plan as Record<string, unknown>) ?? null;
  return {
    subscriptionId: sub.id as number,
    subscriptionReference: sub.subscription_reference as string,
    status: sub.status as string,
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
          planId:
            typeof plan.id === 'number' || typeof plan.id === 'string'
              ? String(plan.id)
              : null,
          planReference: (plan.plan_reference as string) ?? null,
          amount: plan.amount as number,
          currency: plan.currency as string,
          interval: plan.interval as string,
          intervalCount: plan.interval_count as number
        }
      : null
  };
};

let mapPayment = (raw: Record<string, unknown>): Payment => {
  return {
    paymentId: raw.id as number,
    date: raw.date as string,
    status: raw.status as string,
    currency: raw.currency as string,
    amount: raw.amount as number,
    fee: raw.fee as number,
    amountRefunded: raw.amount_refunded as number,
    amountDescription: (raw.amount_description as string) ?? null,
    name: raw.name as string,
    email: raw.email as string,
    paymentSource: mapPaymentSource(
      ((raw.payment_method ?? raw.payment_source) as Record<string, unknown>) ?? null
    ),
    customId: (raw.custom_id as string) ?? null,
    chargeReference: (raw.charge_reference as string) ?? null,
    customerId: (raw.customer_id as number) ?? null,
    customerReference: (raw.customer_reference as string) ?? null,
    invoiceReference: (raw.invoice_reference as string) ?? null,
    formId: raw.form_id as number,
    coupon: mapCoupon((raw.coupon as Record<string, unknown>) ?? null),
    customFields: mapCustomFields(raw.custom_fields as Record<string, unknown>),
    checkout: (raw.checkout as Record<string, unknown>) ?? null
  };
};

let mapCustomer = (raw: Record<string, unknown>): Customer => {
  return {
    customerId: raw.id as number,
    accountBalance: raw.account_balance as number,
    name: raw.name as string,
    email: raw.email as string,
    paymentSource: mapPaymentSource(
      ((raw.payment_method ?? raw.payment_source) as Record<string, unknown>) ?? null
    ),
    customId: (raw.custom_id as string) ?? null,
    customerReference: (raw.customer_reference as string) ?? null,
    discount: mapDiscount((raw.discount as Record<string, unknown>) ?? null),
    delinquent: raw.delinquent as boolean,
    managementUrl: raw.management_url as string,
    formId: raw.form_id as number,
    customFields: mapCustomFields(raw.custom_fields as Record<string, unknown>),
    checkout: (raw.checkout as Record<string, unknown>) ?? null,
    subscription: mapSubscription((raw.subscription as Record<string, unknown>) ?? null)
  };
};

let mapForm = (raw: Record<string, unknown>): Form => {
  return {
    formId: raw.id as number,
    title: raw.title as string,
    accessToken: raw.access_token as string,
    currency: raw.currency as string,
    paymentVolume: raw.payment_volume as number,
    successfulCheckoutCount: raw.successful_checkout_count as number,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string
  };
};

let parseResource = <T>(
  value: unknown,
  map: (raw: Record<string, unknown>) => T,
  schema: z.ZodType<T>,
  resource: string
): T => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`MoonClerk returned an invalid ${resource} object.`, {
      reason: 'invalid_response'
    });
  }
  let result = schema.safeParse(map(value));
  if (!result.success) {
    let fields = result.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw createApiServiceError(`MoonClerk returned invalid ${resource} fields: ${fields}.`, {
      reason: 'invalid_response'
    });
  }
  return result.data;
};

let parseList = <T>(
  value: unknown,
  map: (raw: Record<string, unknown>) => T,
  schema: z.ZodType<T>,
  resource: string
): T[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`MoonClerk returned an invalid ${resource} list.`, {
      reason: 'invalid_response'
    });
  }
  return value.map(item => parseResource(item, map, schema, resource));
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A MoonClerk API key is required.', {
        reason: 'missing_api_key'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.moonclerk.com',
      timeout: 30_000,
      authHeader: { value: `Token token=${config.token}` },
      contentType: false,
      headers: { Accept: 'application/vnd.moonclerk+json;version=1' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'MoonClerk',
          reason: 'moonclerk_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  private async get(path: string, params?: Record<string, unknown>) {
    let response = await this.axios.get<unknown>(path, { params });
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('MoonClerk returned an invalid JSON response.', {
        reason: 'invalid_response'
      });
    }
    return response.data;
  }

  async listPayments(params?: PaymentListParams): Promise<Payment[]> {
    let data = await this.get(
      '/payments',
      pickDefined({
        count: params?.count,
        offset: params?.offset,
        form_id: params?.formId,
        customer_id: params?.customerId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        status: params?.status
      })
    );
    return parseList(data.payments, mapPayment, paymentSchema, 'payment');
  }

  async getPayment(paymentId: number): Promise<Payment> {
    let data = await this.get(`/payments/${paymentId}`);
    return parseResource(data.payment, mapPayment, paymentSchema, 'payment');
  }

  async listCustomers(params?: CustomerListParams): Promise<Customer[]> {
    let data = await this.get(
      '/customers',
      pickDefined({
        count: params?.count,
        offset: params?.offset,
        form_id: params?.formId,
        checkout_from: params?.checkoutFrom,
        checkout_to: params?.checkoutTo,
        next_payment_from: params?.nextPaymentFrom,
        next_payment_to: params?.nextPaymentTo,
        status: params?.status
      })
    );
    return parseList(data.customers, mapCustomer, customerSchema, 'customer');
  }

  async getCustomer(customerId: number): Promise<Customer> {
    let data = await this.get(`/customers/${customerId}`);
    return parseResource(data.customer, mapCustomer, customerSchema, 'customer');
  }

  async listForms(params?: ListParams): Promise<Form[]> {
    let data = await this.get(
      '/forms',
      pickDefined({
        count: params?.count,
        offset: params?.offset
      })
    );
    return parseList(data.forms, mapForm, formSchema, 'form');
  }

  async getForm(formId: number): Promise<Form> {
    let data = await this.get(`/forms/${formId}`);
    return parseResource(data.form, mapForm, formSchema, 'form');
  }
}
