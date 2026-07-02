import { z } from 'zod';

export let paymentSourceSchema = z.object({
  type: z.string().nullable().describe('Payment method type (e.g. "card", "bank_account")'),
  last4: z.string().nullable().describe('Last 4 digits of card or account number'),
  brand: z
    .string()
    .nullable()
    .describe('Card brand (e.g. "Visa", "Mastercard"). Only present for cards'),
  expMonth: z.number().nullable().describe('Card expiration month. Only present for cards'),
  expYear: z.number().nullable().describe('Card expiration year. Only present for cards'),
  bankName: z.string().nullable().describe('Bank name. Only present for ACH payments')
});

export let couponSchema = z.object({
  code: z.string().describe('Coupon code'),
  duration: z.string().describe('Coupon duration (e.g. "once", "repeating", "forever")'),
  amountOff: z.number().nullable().describe('Fixed discount amount in cents'),
  currency: z.string().nullable().describe('Currency of the amount_off discount'),
  percentOff: z.number().nullable().describe('Percentage discount'),
  durationInMonths: z
    .number()
    .nullable()
    .describe('Number of months the coupon applies if duration is "repeating"'),
  maxRedemptions: z
    .number()
    .nullable()
    .describe('Maximum number of times the coupon can be redeemed')
});

export let discountSchema = z.object({
  coupon: couponSchema.nullable().describe('Applied coupon details'),
  startedAt: z.string().nullable().describe('When the discount started (ISO 8601)'),
  endedAt: z.string().nullable().describe('When the discount ended (ISO 8601)')
});

export let customFieldSchema = z.object({
  customFieldId: z.number().describe('ID of the custom field'),
  type: z.string().describe('Field type (e.g. "string", "address")'),
  response: z.unknown().describe('The response value collected at checkout')
});

export let subscriptionPlanSchema = z.object({
  planId: z.string().nullable().describe('Plan ID'),
  planReference: z.string().nullable().describe('Stripe plan reference ID'),
  amount: z.number().describe('Plan amount in cents'),
  currency: z.string().describe('Plan currency'),
  interval: z.string().describe('Billing interval (e.g. "month", "year")'),
  intervalCount: z.number().describe('Number of intervals between billings')
});

export let subscriptionSchema = z.object({
  subscriptionId: z.number().describe('MoonClerk subscription ID'),
  subscriptionReference: z.string().describe('Stripe subscription reference ID'),
  status: z.string().describe('Subscription status'),
  start: z.string().nullable().describe('Subscription start date (ISO 8601)'),
  firstPaymentAttempt: z.string().nullable().describe('First payment attempt date (ISO 8601)'),
  nextPaymentAttempt: z.string().nullable().describe('Next payment attempt date (ISO 8601)'),
  currentPeriodStart: z
    .string()
    .nullable()
    .describe('Current billing period start (ISO 8601)'),
  currentPeriodEnd: z.string().nullable().describe('Current billing period end (ISO 8601)'),
  trialStart: z.string().nullable().describe('Trial start date (ISO 8601)'),
  trialEnd: z.string().nullable().describe('Trial end date (ISO 8601)'),
  expiresAt: z.string().nullable().describe('Subscription expiration date (ISO 8601)'),
  canceledAt: z.string().nullable().describe('Cancellation date (ISO 8601)'),
  endedAt: z.string().nullable().describe('End date (ISO 8601)'),
  plan: subscriptionPlanSchema.nullable().describe('Plan details')
});

export let paymentSchema = z.object({
  paymentId: z.number().describe('MoonClerk payment ID'),
  date: z.string().describe('Payment date (ISO 8601)'),
  status: z.string().describe('Payment status: successful, refunded, or failed'),
  currency: z.string().describe('Three-letter currency code (e.g. "USD")'),
  amount: z.number().describe('Payment amount in cents'),
  fee: z.number().describe('Stripe processing fee in cents'),
  amountRefunded: z.number().describe('Amount refunded in cents'),
  amountDescription: z
    .string()
    .nullable()
    .describe('Description of the amount option selected'),
  name: z.string().describe('Payer name'),
  email: z.string().describe('Payer email'),
  paymentSource: paymentSourceSchema.describe('Payment method details'),
  customId: z.string().nullable().describe('Custom ID set via integration'),
  chargeReference: z.string().nullable().describe('Stripe charge reference ID'),
  customerId: z
    .number()
    .nullable()
    .describe('MoonClerk customer ID (present for recurring payments)'),
  customerReference: z.string().nullable().describe('Stripe customer reference ID'),
  invoiceReference: z.string().nullable().describe('Stripe invoice reference ID'),
  formId: z.number().describe('Associated MoonClerk form ID'),
  coupon: couponSchema.nullable().describe('Applied coupon details'),
  customFields: z
    .record(z.string(), customFieldSchema)
    .describe('Custom fields collected at checkout'),
  checkout: z.record(z.string(), z.unknown()).nullable().describe('Checkout details')
});

export let customerSchema = z.object({
  customerId: z.number().describe('MoonClerk customer ID'),
  accountBalance: z.number().describe('Account balance in cents'),
  name: z.string().describe('Customer name'),
  email: z.string().describe('Customer email'),
  paymentSource: paymentSourceSchema.describe('Payment method on file'),
  customId: z.string().nullable().describe('Custom ID set via integration'),
  customerReference: z.string().nullable().describe('Stripe customer reference ID'),
  discount: discountSchema.nullable().describe('Active discount details'),
  delinquent: z.boolean().describe('Whether the customer is delinquent on payments'),
  managementUrl: z.string().describe('URL for managing this customer/plan'),
  formId: z.number().describe('Associated MoonClerk form ID'),
  customFields: z
    .record(z.string(), customFieldSchema)
    .describe('Custom fields collected at checkout'),
  checkout: z.record(z.string(), z.unknown()).nullable().describe('Checkout details'),
  subscription: subscriptionSchema.nullable().describe('Subscription details')
});

export let formSchema = z.object({
  formId: z.number().describe('MoonClerk form ID'),
  title: z.string().describe('Form title'),
  accessToken: z.string().describe('Form access token for embedding'),
  currency: z.string().describe('Form currency'),
  paymentVolume: z.number().describe('Total payment volume in cents'),
  successfulCheckoutCount: z.number().describe('Number of successful checkouts'),
  createdAt: z.string().describe('Form creation date (ISO 8601)'),
  updatedAt: z.string().describe('Form last update date (ISO 8601)')
});
