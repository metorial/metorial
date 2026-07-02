import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

export let createSubscription = SlateTool.create(spec, {
  name: 'Create Subscription',
  key: 'create_subscription',
  description: `Subscribe a customer to an existing plan. The customer must have a valid payment authorization (from a previous transaction). Supports card and direct debit (Nigeria).`,
  tags: {
    destructive: false,
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
          'Authorization code from a previous successful transaction. Required if the customer has multiple authorizations'
        ),
      startDate: z
        .string()
        .optional()
        .describe('When to start the subscription (ISO 8601). Defaults to now')
    })
  )
  .output(
    z.object({
      subscriptionCode: z.string().describe('Subscription code'),
      emailToken: z.string().describe('Email token for managing the subscription'),
      amount: z.number().describe('Subscription amount'),
      status: z.string().describe('Subscription status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createSubscription({
      customer: ctx.input.customer,
      plan: ctx.input.plan,
      authorization: ctx.input.authorization,
      startDate: ctx.input.startDate
    });

    let sub = result.data;

    return {
      output: {
        subscriptionCode: sub.subscription_code,
        emailToken: sub.email_token,
        amount: sub.amount,
        status: sub.status
      },
      message: `Subscription **${sub.subscription_code}** created for customer on plan. Status: **${sub.status}**.`
    };
  })
  .build();

export let getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description: `Fetch details for a single subscription by its ID or code. Returns the subscription's status, plan, customer, billing history, and next payment date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionIdOrCode: z.string().describe('Subscription ID or subscription code')
    })
  )
  .output(
    z.object({
      subscriptionCode: z.string().describe('Subscription code'),
      status: z
        .string()
        .describe(
          'Subscription status (active, non-renewing, attention, completed, cancelled)'
        ),
      amount: z.number().describe('Subscription amount'),
      planCode: z.string().describe('Plan code'),
      customerCode: z.string().describe('Customer code'),
      nextPaymentDate: z.string().nullable().describe('Next billing date'),
      emailToken: z.string().describe('Token for managing the subscription via email'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.getSubscription(ctx.input.subscriptionIdOrCode);
    let sub = result.data;

    return {
      output: {
        subscriptionCode: sub.subscription_code,
        status: sub.status,
        amount: sub.amount,
        planCode: sub.plan?.plan_code ?? '',
        customerCode: sub.customer?.customer_code ?? '',
        nextPaymentDate: sub.next_payment_date ?? null,
        emailToken: sub.email_token,
        createdAt: sub.created_at ?? sub.createdAt
      },
      message: `Subscription **${sub.subscription_code}**: status **${sub.status}**, next payment: ${sub.next_payment_date ?? 'N/A'}.`
    };
  })
  .build();

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
  .output(
    z.object({
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
      totalCount: z.number().describe('Total subscriptions'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listSubscriptions({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      customer: ctx.input.customer,
      plan: ctx.input.plan
    });

    let subs = (result.data ?? []).map((s: any) => ({
      subscriptionCode: s.subscription_code,
      status: s.status,
      amount: s.amount,
      planCode: s.plan?.plan_code ?? '',
      customerEmail: s.customer?.email ?? '',
      nextPaymentDate: s.next_payment_date ?? null
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        subscriptions: subs,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? subs.length}** subscriptions.`
    };
  })
  .build();

export let disableSubscription = SlateTool.create(spec, {
  name: 'Disable Subscription',
  key: 'disable_subscription',
  description: `Cancel/disable an active subscription. Requires the subscription code and the email token (returned when the subscription was created or can be found in subscription details).`,
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
  .output(
    z.object({
      success: z.boolean().describe('Whether the subscription was disabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    await client.disableSubscription({
      code: ctx.input.subscriptionCode,
      token: ctx.input.emailToken
    });

    return {
      output: {
        success: true
      },
      message: `Subscription **${ctx.input.subscriptionCode}** has been disabled.`
    };
  })
  .build();

export let enableSubscription = SlateTool.create(spec, {
  name: 'Enable Subscription',
  key: 'enable_subscription',
  description: `Re-enable a previously disabled subscription. Requires the subscription code and the email token.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionCode: z.string().describe('Subscription code to enable'),
      emailToken: z.string().describe('Email token for the subscription')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the subscription was enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    await client.enableSubscription({
      code: ctx.input.subscriptionCode,
      token: ctx.input.emailToken
    });

    return {
      output: {
        success: true
      },
      message: `Subscription **${ctx.input.subscriptionCode}** has been enabled.`
    };
  })
  .build();
