import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSubscriptions = SlateTool.create(spec, {
  name: 'Manage Subscriptions',
  key: 'manage_subscriptions',
  description: `Create, retrieve, update, cancel, pause, or resume subscriptions. Subscriptions handle recurring billing with support for trials, multiple items, proration, and various billing cycles.`,
  instructions: [
    'A subscription requires a customer and at least one price (via items). Use priceId to specify which price to subscribe the customer to.',
    'Use cancelAtPeriodEnd=true to cancel at end of current period instead of immediately.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'cancel', 'pause', 'resume', 'list'])
        .describe('Operation to perform'),
      subscriptionId: z
        .string()
        .optional()
        .describe('Subscription ID (required for get/update/cancel/pause/resume)'),
      customerId: z.string().optional().describe('Customer ID (required for create)'),
      priceId: z
        .string()
        .optional()
        .describe('Price ID to subscribe to (for create or adding items)'),
      items: z
        .array(
          z.object({
            priceId: z.string().describe('Price ID'),
            quantity: z.number().optional().describe('Quantity')
          })
        )
        .optional()
        .describe('Subscription items (for create or update)'),
      trialPeriodDays: z.number().optional().describe('Number of trial days'),
      trialEnd: z
        .string()
        .optional()
        .describe('Unix timestamp or "now" for when the trial ends'),
      cancelAtPeriodEnd: z
        .boolean()
        .optional()
        .describe('If true, cancel at end of current billing period'),
      couponId: z.string().optional().describe('Coupon ID to apply'),
      promotionCodeId: z.string().optional().describe('Promotion code ID to apply'),
      defaultPaymentMethodId: z.string().optional().describe('Default payment method ID'),
      prorationBehavior: z
        .enum(['create_prorations', 'none', 'always_invoice'])
        .optional()
        .describe('How to handle proration'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination'),
      status: z
        .enum([
          'active',
          'past_due',
          'unpaid',
          'canceled',
          'incomplete',
          'incomplete_expired',
          'trialing',
          'paused',
          'all'
        ])
        .optional()
        .describe('Filter by status (for list)')
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().optional().describe('Subscription ID'),
      customerId: z.string().optional().describe('Customer ID'),
      status: z.string().optional().describe('Subscription status'),
      currentPeriodStart: z.number().optional().describe('Start of current billing period'),
      currentPeriodEnd: z.number().optional().describe('End of current billing period'),
      cancelAtPeriodEnd: z
        .boolean()
        .optional()
        .describe('Whether it will cancel at period end'),
      trialStart: z.number().optional().nullable().describe('Trial start timestamp'),
      trialEnd: z.number().optional().nullable().describe('Trial end timestamp'),
      created: z.number().optional().describe('Creation timestamp'),
      subscriptions: z
        .array(
          z.object({
            subscriptionId: z.string(),
            customerId: z.string(),
            status: z.string(),
            currentPeriodEnd: z.number(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of subscriptions'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.customerId)
        throw stripeServiceError('customerId is required for create action');
      let params: Record<string, any> = { customer: ctx.input.customerId };

      if (ctx.input.items) {
        params.items = ctx.input.items.map(item => ({
          price: item.priceId,
          quantity: item.quantity
        }));
      } else if (ctx.input.priceId) {
        params.items = [{ price: ctx.input.priceId }];
      } else {
        throw stripeServiceError('priceId or items is required for create action');
      }

      if (ctx.input.trialPeriodDays !== undefined)
        params.trial_period_days = ctx.input.trialPeriodDays;
      if (ctx.input.trialEnd) params.trial_end = ctx.input.trialEnd;
      if (ctx.input.couponId) params.coupon = ctx.input.couponId;
      if (ctx.input.promotionCodeId) params.promotion_code = ctx.input.promotionCodeId;
      if (ctx.input.defaultPaymentMethodId)
        params.default_payment_method = ctx.input.defaultPaymentMethodId;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let sub = await client.createSubscription(params);
      return {
        output: {
          subscriptionId: sub.id,
          customerId: sub.customer,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialStart: sub.trial_start,
          trialEnd: sub.trial_end,
          created: sub.created
        },
        message: `Created subscription **${sub.id}** — status: ${sub.status}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.subscriptionId)
        throw stripeServiceError('subscriptionId is required for get action');
      let sub = await client.getSubscription(ctx.input.subscriptionId);
      return {
        output: {
          subscriptionId: sub.id,
          customerId: sub.customer,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialStart: sub.trial_start,
          trialEnd: sub.trial_end,
          created: sub.created
        },
        message: `Subscription **${sub.id}**: status ${sub.status}`
      };
    }

    if (action === 'update') {
      if (!ctx.input.subscriptionId)
        throw stripeServiceError('subscriptionId is required for update action');
      let params: Record<string, any> = {};

      if (ctx.input.items) {
        params.items = ctx.input.items.map(item => ({
          price: item.priceId,
          quantity: item.quantity
        }));
      }
      if (ctx.input.cancelAtPeriodEnd !== undefined)
        params.cancel_at_period_end = ctx.input.cancelAtPeriodEnd;
      if (ctx.input.couponId) params.coupon = ctx.input.couponId;
      if (ctx.input.promotionCodeId) params.promotion_code = ctx.input.promotionCodeId;
      if (ctx.input.defaultPaymentMethodId)
        params.default_payment_method = ctx.input.defaultPaymentMethodId;
      if (ctx.input.prorationBehavior) params.proration_behavior = ctx.input.prorationBehavior;
      if (ctx.input.trialEnd) params.trial_end = ctx.input.trialEnd;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let sub = await client.updateSubscription(ctx.input.subscriptionId, params);
      return {
        output: {
          subscriptionId: sub.id,
          customerId: sub.customer,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialStart: sub.trial_start,
          trialEnd: sub.trial_end,
          created: sub.created
        },
        message: `Updated subscription **${sub.id}** — status: ${sub.status}`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.subscriptionId)
        throw stripeServiceError('subscriptionId is required for cancel action');

      if (ctx.input.cancelAtPeriodEnd) {
        let sub = await client.updateSubscription(ctx.input.subscriptionId, {
          cancel_at_period_end: true
        });
        return {
          output: {
            subscriptionId: sub.id,
            customerId: sub.customer,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            created: sub.created
          },
          message: `Subscription **${sub.id}** will cancel at period end`
        };
      }

      let sub = await client.cancelSubscription(ctx.input.subscriptionId);
      return {
        output: {
          subscriptionId: sub.id,
          customerId: sub.customer,
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          created: sub.created
        },
        message: `Canceled subscription **${sub.id}**`
      };
    }

    if (action === 'pause') {
      if (!ctx.input.subscriptionId)
        throw stripeServiceError('subscriptionId is required for pause action');
      let sub = await client.pauseSubscription(ctx.input.subscriptionId);
      return {
        output: {
          subscriptionId: sub.id,
          customerId: sub.customer,
          status: sub.status,
          created: sub.created
        },
        message: `Paused subscription **${sub.id}**`
      };
    }

    if (action === 'resume') {
      if (!ctx.input.subscriptionId)
        throw stripeServiceError('subscriptionId is required for resume action');
      let sub = await client.resumeSubscription(ctx.input.subscriptionId);
      return {
        output: {
          subscriptionId: sub.id,
          customerId: sub.customer,
          status: sub.status,
          created: sub.created
        },
        message: `Resumed subscription **${sub.id}**`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.customerId) params.customer = ctx.input.customerId;
    if (ctx.input.status) params.status = ctx.input.status;

    let result = await client.listSubscriptions(params);
    return {
      output: {
        subscriptions: result.data.map((s: any) => ({
          subscriptionId: s.id,
          customerId: s.customer,
          status: s.status,
          currentPeriodEnd: s.current_period_end,
          created: s.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** subscription(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
