import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawResponseSchema } from '../lib/response';
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
      raw: z.array(rawResponseSchema).describe('Provider subscription responses'),
      subscriptions: z
        .array(subscriptionSchema)
        .describe('List of subscriptions for this email'),
      count: z.number().describe('Number of subscriptions found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.verifySubscription(ctx.input.email);

    let subscriptions = results.map((sub: Record<string, unknown>) => {
      let product = sub.product as Record<string, unknown>;
      let subscriber = (sub.subscriber ?? {}) as Record<string, unknown>;

      return {
        subscriptionId: sub.subscription_id as string,
        createdAt: sub.created_at as string,
        cancelAt: sub.cancel_at as string | null,
        canceledAt: sub.canceled_at as string | null,
        trialEnd: sub.trial_end as string | null,
        trialStart: sub.trial_start as string | null,
        currency: sub.currency as string,
        amount: sub.amount as number,
        interval: sub.interval as string,
        intervalCount: sub.interval_count as number,
        status: sub.status as string,
        productTitle: product.title as string,
        subscriberName: subscriber.name as string | undefined,
        subscriberEmail: subscriber.email as string | undefined
      };
    });

    return {
      output: {
        raw: results,
        subscriptions,
        count: subscriptions.length
      },
      message: `Found **${subscriptions.length}** subscription(s).`
    };
  })
  .build();
