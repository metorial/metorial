import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscriptionSchema = z.object({
  subscriptionId: z.string().describe('Stripe subscription ID'),
  createdAt: z.string().describe('Creation timestamp'),
  cancelAt: z.string().nullable().describe('Scheduled cancellation date'),
  canceledAt: z.string().nullable().describe('Actual cancellation date'),
  trialEnd: z.string().nullable().describe('Trial period end date'),
  trialStart: z.string().nullable().describe('Trial period start date'),
  currency: z.string().describe('Currency code'),
  amount: z.number().describe('Amount in smallest currency unit (cents)'),
  interval: z.string().describe('Billing frequency: day, week, month, or year'),
  intervalCount: z.number().describe('Interval multiplier'),
  status: z
    .string()
    .describe(
      'Subscription status: incomplete, incomplete_expired, trialing, active, past_due, canceled, or unpaid'
    ),
  productTitle: z.string().describe('Product name'),
  subscriberName: z.string().optional().describe('Subscriber name'),
  subscriberEmail: z.string().optional().describe('Subscriber email')
});

export let verifySubscription = SlateTool.create(spec, {
  name: 'Verify Subscription',
  key: 'verify_subscription',
  description: `Verify subscription status by subscriber email. Returns all subscriptions associated with the given email address, including status, billing details, trial dates, and cancellation information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber')
    })
  )
  .output(
    z.object({
      subscriptions: z
        .array(subscriptionSchema)
        .describe('List of subscriptions for this email'),
      count: z.number().describe('Number of subscriptions found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.verifySubscription(ctx.input.email);

    let subscriptions = (Array.isArray(results) ? results : []).map(
      (sub: Record<string, unknown>) => {
        let product = (sub.product || {}) as Record<string, unknown>;
        let subscriber = (sub.subscriber || {}) as Record<string, unknown>;

        return {
          subscriptionId: sub.subscription_id as string,
          createdAt: String(sub.created_at),
          cancelAt: sub.cancel_at ? String(sub.cancel_at) : null,
          canceledAt: sub.canceled_at ? String(sub.canceled_at) : null,
          trialEnd: sub.trial_end ? String(sub.trial_end) : null,
          trialStart: sub.trial_start ? String(sub.trial_start) : null,
          currency: sub.currency as string,
          amount: sub.amount as number,
          interval: sub.interval as string,
          intervalCount: sub.interval_count as number,
          status: sub.status as string,
          productTitle: product.title as string,
          subscriberName: subscriber.name as string | undefined,
          subscriberEmail: subscriber.email as string | undefined
        };
      }
    );

    return {
      output: {
        subscriptions,
        count: subscriptions.length
      },
      message: `Found **${subscriptions.length}** subscription(s) for **${ctx.input.email}**.`
    };
  })
  .build();
