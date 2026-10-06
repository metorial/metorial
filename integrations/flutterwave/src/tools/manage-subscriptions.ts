import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageFields, pageOutput } from '../lib/contracts';
import { spec } from '../spec';

let subscriptionSchema = z.object({
  subscriptionId: z.number().describe('Subscription ID'),
  amount: z.number().optional().describe('Subscription amount'),
  customerEmail: z.string().optional().describe('Customer email'),
  customerId: z.number().optional().describe('Customer ID'),
  planId: z.number().optional().describe('Associated payment plan ID'),
  status: z.string().describe('Subscription status (active, cancelled)'),
  createdAt: z.string().optional().describe('Subscription creation timestamp')
});

export let manageSubscriptions = SlateTool.create(spec, {
  name: 'Manage Subscriptions',
  key: 'manage_subscriptions',
  description: `List, cancel, or reactivate customer subscriptions. Subscriptions are created automatically when a customer is charged with a payment plan. Filter subscriptions by customer email, plan ID, or status.`,
  instructions: [
    'To list subscriptions, use action "list" with optional filters.',
    'To cancel, use action "cancel" with subscriptionId.',
    'To reactivate a cancelled subscription, use action "activate" with subscriptionId.'
  ],
  constraints: [
    'Subscriptions are tied to a customer email and cannot be changed.',
    'If a charge fails 3 consecutive times, the subscription is automatically cancelled.'
  ]
})
  .input(
    z.object({
      page: z.number().optional().describe('Positive page number for listing'),
      action: z.enum(['list', 'cancel', 'activate']).describe('Action to perform'),
      subscriptionId: z
        .number()
        .optional()
        .describe('Subscription ID (required for cancel/activate)'),
      email: z.string().optional().describe('Filter by customer email (for list)'),
      planId: z.number().optional().describe('Filter by payment plan ID (for list)'),
      status: z
        .enum(['active', 'cancelled'])
        .optional()
        .describe('Filter by status (for list)')
    })
  )
  .output(
    z.object({
      ...pageFields,
      subscriptions: z.array(subscriptionSchema).describe('Subscription(s) returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let { action } = ctx.input;

    if (action === 'cancel') {
      if (!ctx.input.subscriptionId)
        throw createApiServiceError('subscriptionId is required to cancel');
      let result = await client.cancelSubscription(ctx.input.subscriptionId);
      return {
        output: {
          subscriptions: [
            {
              subscriptionId: result.data.id,
              status: result.data.status
            }
          ]
        },
        message: `Subscription **${ctx.input.subscriptionId}** has been cancelled.`
      };
    }

    if (action === 'activate') {
      if (!ctx.input.subscriptionId)
        throw createApiServiceError('subscriptionId is required to activate');
      let result = await client.activateSubscription(ctx.input.subscriptionId);
      return {
        output: {
          subscriptions: [
            {
              subscriptionId: result.data.id,
              status: result.data.status
            }
          ]
        },
        message: `Subscription **${ctx.input.subscriptionId}** has been reactivated.`
      };
    }

    // list
    let result = await client.listSubscriptions({
      email: ctx.input.email,
      plan: ctx.input.planId,
      status: ctx.input.status,
      page: ctx.input.page
    });

    let subscriptions = (result.data || []).map((s: any) => ({
      subscriptionId: s.id,
      amount: s.amount,
      customerEmail: s.customer?.customer_email,
      customerId: s.customer?.id,
      planId: s.plan,
      status: s.status,
      createdAt: s.created_at
    }));

    return {
      output: { subscriptions, ...pageOutput(result) },
      message: `Found **${subscriptions.length}** subscriptions.`
    };
  })
  .build();
