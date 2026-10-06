import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import { optionalRecord, pagination, record, records, validateOutput } from '../lib/transport';
import { spec } from '../spec';

const createSubscriptionOutput = z.object({
  subscriptionCode: z.string().describe('Subscription code'),
  emailToken: z.string().describe('Email token for managing the subscription'),
  amount: z.number().describe('Subscription amount'),
  status: z.string().describe('Subscription status')
});

export let createSubscription = SlateTool.create(spec, {
  name: 'Create Subscription',
  key: 'create_subscription',
  description: `Subscribe a customer to an existing plan. The customer must have a valid payment authorization (from a previous transaction). Supports card and direct debit (Nigeria).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      customer: z.string().describe('Customer email or customer code'),
      plan: z.string().describe('Plan code to subscribe the customer to'),
      authorization: z
        .string()
        .optional()
        .describe(
          'Reusable authorization to debit. When omitted, Paystack uses the customer’s most recent authorization.'
        ),
      startDate: z
        .string()
        .optional()
        .describe('When to start the subscription (ISO 8601). Defaults to now')
    })
  )
  .output(createSubscriptionOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createSubscription(ctx.input);
    const sub = record(result.data);
    const output = {
      subscriptionCode: sub.subscription_code,
      emailToken: sub.email_token,
      amount: sub.amount,
      status: sub.status
    };
    return {
      output: validateOutput(createSubscriptionOutput, output),
      message: 'Subscription accepted; it can schedule recurring debits and notifications.'
    };
  })
  .build();
const getSubscriptionOutput = z.object({
  subscriptionCode: z.string().describe('Subscription code'),
  status: z
    .string()
    .describe('Subscription status (active, non-renewing, attention, completed, cancelled)'),
  amount: z.number().describe('Subscription amount'),
  planCode: z.string().describe('Plan code'),
  customerCode: z.string().describe('Customer code'),
  nextPaymentDate: z.string().nullable().describe('Next billing date'),
  emailToken: z.string().describe('Token for managing the subscription via email'),
  createdAt: z.string().describe('Creation timestamp')
});

export let getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description: `Fetch details for a single subscription by its ID or code. Returns the subscription's status, plan, customer, management token, and next payment date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionIdOrCode: z.string().describe('Subscription ID or subscription code')
    })
  )
  .output(getSubscriptionOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.getSubscription(ctx.input.subscriptionIdOrCode);
    const sub = record(result.data);
    const output = {
      subscriptionCode: sub.subscription_code,
      emailToken: sub.email_token,
      amount: sub.amount,
      status: sub.status,
      planCode: optionalRecord(sub.plan).plan_code,
      customerCode: optionalRecord(sub.customer).customer_code,
      nextPaymentDate: sub.next_payment_date ?? null,
      createdAt: sub.created_at ?? sub.createdAt
    };
    return {
      output: validateOutput(getSubscriptionOutput, output),
      message: 'Subscription details retrieved.'
    };
  })
  .build();
const listSubscriptionsOutput = z.object({
  subscriptions: z.array(
    z.object({
      subscriptionCode: z.string().describe('Subscription code'),
      status: z.string().describe('Status'),
      amount: z.number().describe('Amount'),
      planCode: z.string().describe('Plan code'),
      customerEmail: z.string().describe('Customer email'),
      nextPaymentDate: z.string().nullable().describe('Next payment date')
    })
  ),
  totalCount: z.number().optional().describe('Total subscriptions'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `Retrieve a paginated list of subscriptions. Filter by customer or plan.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      customer: z.string().optional().describe('Filter by customer ID'),
      plan: z.string().optional().describe('Filter by plan ID')
    })
  )
  .output(listSubscriptionsOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listSubscriptions(ctx.input);
    const output = {
      subscriptions: records(result.data).map(item => ({
        subscriptionCode: item.subscription_code,
        status: item.status,
        amount: item.amount,
        planCode: optionalRecord(item.plan).plan_code,
        customerEmail: optionalRecord(item.customer).email,
        nextPaymentDate: item.next_payment_date ?? null
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listSubscriptionsOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
const disableSubscriptionOutput = z.object({
  success: z.boolean().describe('Whether the subscription was disabled')
});

export let disableSubscription = SlateTool.create(spec, {
  name: 'Disable Subscription',
  key: 'disable_subscription',
  description: `Stop future renewal of a subscription; it can remain non-renewing until the current billing period ends. Requires the subscription code and the email token (returned when the subscription was created or can be found in subscription details).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionCode: z.string().describe('Subscription code to disable'),
      emailToken: z.string().describe('Email token for the subscription')
    })
  )
  .output(disableSubscriptionOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    await client.disableSubscription({
      code: ctx.input.subscriptionCode,
      token: ctx.input.emailToken
    });
    const output = { success: true };
    return {
      output: validateOutput(disableSubscriptionOutput, output),
      message:
        'Subscription disable request confirmed; verify non-renewing state before relying on cancellation.'
    };
  })
  .build();
const enableSubscriptionOutput = z.object({
  success: z.boolean().describe('Whether the subscription was enabled')
});

export let enableSubscription = SlateTool.create(spec, {
  name: 'Enable Subscription',
  key: 'enable_subscription',
  description: `Re-enable a previously disabled subscription. Requires the subscription code and the email token.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionCode: z.string().describe('Subscription code to enable'),
      emailToken: z.string().describe('Email token for the subscription')
    })
  )
  .output(enableSubscriptionOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    await client.enableSubscription({
      code: ctx.input.subscriptionCode,
      token: ctx.input.emailToken
    });
    const output = { success: true };
    return {
      output: validateOutput(enableSubscriptionOutput, output),
      message: 'Subscription enable request confirmed; recurring debits may resume.'
    };
  })
  .build();
