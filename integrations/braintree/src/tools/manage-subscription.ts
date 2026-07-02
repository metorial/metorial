import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeRestClient } from '../lib/client';
import { buildXml, parseXml } from '../lib/xml';
import { spec } from '../spec';

let subscriptionOutputSchema = z.object({
  subscriptionId: z.string().describe('Subscription ID'),
  planId: z.string().optional().describe('Plan ID'),
  status: z.string().describe('Subscription status'),
  paymentMethodToken: z.string().optional().describe('Payment method token'),
  merchantAccountId: z.string().optional().describe('Merchant account ID'),
  price: z.string().optional().describe('Subscription price'),
  firstBillingDate: z.string().optional().nullable().describe('First billing date'),
  nextBillingDate: z.string().optional().nullable().describe('Next billing date'),
  billingDayOfMonth: z.number().optional().nullable().describe('Billing day of month'),
  numberOfBillingCycles: z.number().optional().nullable().describe('Total billing cycles'),
  currentBillingCycle: z.number().optional().nullable().describe('Current billing cycle'),
  balance: z.string().optional().nullable().describe('Outstanding balance'),
  paidThroughDate: z.string().optional().nullable().describe('Paid through date'),
  failureCount: z.number().optional().nullable().describe('Number of failed payments'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let createSubscription = SlateTool.create(spec, {
  name: 'Create Subscription',
  key: 'create_subscription',
  description: `Creates a new recurring billing subscription in Braintree. Requires a plan ID (configured in the Control Panel) and a payment method token.`,
  instructions: [
    'Plan IDs are configured in the Braintree Control Panel and are read-only via the API.',
    'The payment method token must belong to a vaulted payment method.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      planId: z.string().describe('The subscription plan ID'),
      paymentMethodToken: z.string().describe('Token of the vaulted payment method to charge'),
      subscriptionId: z
        .string()
        .optional()
        .describe('Custom subscription ID. Braintree generates one if omitted.'),
      price: z.string().optional().describe('Override the plan price (e.g. "9.99")'),
      merchantAccountId: z
        .string()
        .optional()
        .describe('Merchant account ID for this subscription'),
      firstBillingDate: z.string().optional().describe('First billing date (YYYY-MM-DD)'),
      numberOfBillingCycles: z.number().optional().describe('Total number of billing cycles'),
      trialDuration: z.number().optional().describe('Trial duration value'),
      trialDurationUnit: z.enum(['day', 'month']).optional().describe('Trial duration unit'),
      neverExpires: z
        .boolean()
        .optional()
        .describe('Whether the subscription should never expire')
    })
  )
  .output(subscriptionOutputSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let data: Record<string, any> = {
      planId: ctx.input.planId,
      paymentMethodToken: ctx.input.paymentMethodToken
    };

    if (ctx.input.subscriptionId) data.id = ctx.input.subscriptionId;
    if (ctx.input.price) data.price = ctx.input.price;
    if (ctx.input.merchantAccountId) data.merchantAccountId = ctx.input.merchantAccountId;
    if (ctx.input.firstBillingDate) data.firstBillingDate = ctx.input.firstBillingDate;
    if (ctx.input.numberOfBillingCycles !== undefined)
      data.numberOfBillingCycles = ctx.input.numberOfBillingCycles;
    if (ctx.input.trialDuration !== undefined) data.trialDuration = ctx.input.trialDuration;
    if (ctx.input.trialDurationUnit) data.trialDurationUnit = ctx.input.trialDurationUnit;
    if (ctx.input.neverExpires !== undefined) data.neverExpires = ctx.input.neverExpires;

    let body = buildXml('subscription', data);
    let xml = await rest.post('/subscriptions', body);
    let parsed = parseXml(xml);
    let sub = parsed.subscription || parsed;

    return {
      output: mapSubscription(sub),
      message: `Subscription \`${sub.id}\` created on plan **${ctx.input.planId}** — status: **${sub.status}**`
    };
  })
  .build();

export let findSubscription = SlateTool.create(spec, {
  name: 'Find Subscription',
  key: 'find_subscription',
  description: `Retrieves details of a Braintree subscription by its ID, including status, billing info, and payment method.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('The subscription ID to look up')
    })
  )
  .output(subscriptionOutputSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.get(`/subscriptions/${ctx.input.subscriptionId}`);
    let parsed = parseXml(xml);
    let sub = parsed.subscription || parsed;

    return {
      output: mapSubscription(sub),
      message: `Subscription \`${ctx.input.subscriptionId}\` — **${sub.status}** — price: **${sub.price || 'N/A'}** — next billing: ${sub.nextBillingDate || 'N/A'}`
    };
  })
  .build();

export let updateSubscription = SlateTool.create(spec, {
  name: 'Update Subscription',
  key: 'update_subscription',
  description: `Updates an existing Braintree subscription. Can change payment method, price, billing cycles, and other settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('The subscription ID to update'),
      paymentMethodToken: z.string().optional().describe('New payment method token'),
      price: z.string().optional().describe('New price'),
      planId: z.string().optional().describe('New plan ID'),
      merchantAccountId: z.string().optional().describe('New merchant account ID'),
      numberOfBillingCycles: z.number().optional().describe('New total billing cycles'),
      neverExpires: z.boolean().optional().describe('Whether the subscription never expires')
    })
  )
  .output(subscriptionOutputSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let data: Record<string, any> = {};
    if (ctx.input.paymentMethodToken) data.paymentMethodToken = ctx.input.paymentMethodToken;
    if (ctx.input.price) data.price = ctx.input.price;
    if (ctx.input.planId) data.planId = ctx.input.planId;
    if (ctx.input.merchantAccountId) data.merchantAccountId = ctx.input.merchantAccountId;
    if (ctx.input.numberOfBillingCycles !== undefined)
      data.numberOfBillingCycles = ctx.input.numberOfBillingCycles;
    if (ctx.input.neverExpires !== undefined) data.neverExpires = ctx.input.neverExpires;

    let body = buildXml('subscription', data);
    let xml = await rest.put(`/subscriptions/${ctx.input.subscriptionId}`, body);
    let parsed = parseXml(xml);
    let sub = parsed.subscription || parsed;

    return {
      output: mapSubscription(sub),
      message: `Subscription \`${ctx.input.subscriptionId}\` updated — status: **${sub.status}**`
    };
  })
  .build();

export let cancelSubscription = SlateTool.create(spec, {
  name: 'Cancel Subscription',
  key: 'cancel_subscription',
  description: `Cancels a Braintree subscription. The subscription will stop recurring billing immediately. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('The subscription ID to cancel')
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().describe('Subscription ID'),
      status: z.string().describe('Subscription status after cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.put(`/subscriptions/${ctx.input.subscriptionId}/cancel`, '');
    let parsed = parseXml(xml);
    let sub = parsed.subscription || parsed;

    return {
      output: {
        subscriptionId: sub.id || ctx.input.subscriptionId,
        status: sub.status || 'Canceled'
      },
      message: `Subscription \`${ctx.input.subscriptionId}\` canceled`
    };
  })
  .build();

let mapSubscription = (sub: any) => ({
  subscriptionId: sub.id || '',
  planId: sub.planId,
  status: sub.status || '',
  paymentMethodToken: sub.paymentMethodToken,
  merchantAccountId: sub.merchantAccountId,
  price: sub.price,
  firstBillingDate: sub.firstBillingDate,
  nextBillingDate: sub.nextBillingDate,
  billingDayOfMonth: sub.billingDayOfMonth,
  numberOfBillingCycles: sub.numberOfBillingCycles,
  currentBillingCycle: sub.currentBillingCycle,
  balance: sub.balance,
  paidThroughDate: sub.paidThroughDate,
  failureCount: sub.failureCount,
  createdAt: sub.createdAt,
  updatedAt: sub.updatedAt
});
