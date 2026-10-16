import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description:
    'Retrieve a subscription by ID, including its customer, plan, and payment history.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID from list_subscriptions')
    })
  )
  .output(
    z.object({
      payments: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Payment history supplied by Payhere'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Original provider data'),
      subscriptionId: z.number().describe('Subscription identifier'),
      customerId: z.number().describe('Associated customer ID'),
      membershipPlanId: z.number().describe('Associated plan ID'),
      status: z.string().describe('Subscription status (e.g. "active", "cancelled")'),
      lastCharged: z.string().nullable().describe('Last charge timestamp'),
      nextChargeAt: z.string().nullable().describe('Next scheduled charge date'),
      billingInterval: z.string().describe('Billing frequency'),
      billingIntervalCount: z.number(),
      provider: z
        .string()
        .nullable()
        .describe('Payment provider (e.g. "stripe", "gocardless")'),
      customer: z
        .object({
          customerId: z.number(),
          name: z.string(),
          email: z.string(),
          location: z.string().nullable()
        })
        .nullable()
        .describe('Subscribed customer'),
      plan: z
        .object({
          planId: z.number(),
          name: z.string(),
          price: z.string(),
          currency: z.string()
        })
        .nullable()
        .describe('Subscribed plan'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let subscription = await new PayhereClient({ token: ctx.auth.token }).getSubscription(
      ctx.input.subscriptionId
    );
    return {
      output: subscription,
      message: `Subscription #${subscription.subscriptionId}: ${subscription.status}.`
    };
  })
  .build();
