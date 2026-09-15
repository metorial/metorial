import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { subscriptionItemSchema } from '../lib/subscriptions';
import { spec } from '../spec';
import { referenceId, subscriptionEventSchema } from './event-schemas';
import { matchesStripeEvent } from './event-types';
import { stripeEvents } from './events-trigger-group';

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggered when subscription lifecycle events occur, including creation, updates, cancellation, trial expiration, pausing, and resumption.'
})
  .triggerGroup(stripeEvents)
  .input(subscriptionEventSchema)
  .output(
    z.object({
      items: z.array(subscriptionItemSchema).optional(),
      itemsHasMore: z.boolean().optional(),
      subscriptionId: z.string().describe('Subscription ID'),
      customerId: z.string().describe('Customer ID'),
      status: z.string().describe('Subscription status'),
      currentPeriodStart: z.number().optional().describe('Start of current billing period'),
      currentPeriodEnd: z.number().optional().describe('End of current billing period'),
      cancelAtPeriodEnd: z
        .boolean()
        .optional()
        .describe('Whether subscription will cancel at period end'),
      canceledAt: z.number().optional().nullable().describe('Cancellation timestamp'),
      trialStart: z.number().optional().nullable().describe('Trial start timestamp'),
      trialEnd: z.number().optional().nullable().describe('Trial end timestamp'),
      created: z.number().optional().describe('Subscription creation timestamp')
    })
  )
  .matches(payload => matchesStripeEvent('subscription', payload))
  .map(async ctx => {
    let resource = ctx.input.data.object;
    const items = resource.items.data;
    const first = items[0];
    const sharedPeriod =
      !resource.items.has_more &&
      first &&
      items.every(
        item =>
          item.current_period_start === first.current_period_start &&
          item.current_period_end === first.current_period_end
      )
        ? first
        : undefined;
    return {
      type: ctx.input.type,
      id: ctx.input.id,
      output: {
        subscriptionId: resource.id,
        customerId: referenceId(resource.customer),
        status: resource.status,
        items: items.map(item => ({
          subscriptionItemId: item.id,
          priceId: referenceId(item.price),
          quantity: item.quantity ?? undefined,
          currentPeriodStart: item.current_period_start,
          currentPeriodEnd: item.current_period_end
        })),
        itemsHasMore: resource.items.has_more,
        currentPeriodStart: sharedPeriod?.current_period_start,
        currentPeriodEnd: sharedPeriod?.current_period_end,
        cancelAtPeriodEnd: resource.cancel_at_period_end,
        canceledAt: resource.canceled_at || null,
        trialStart: resource.trial_start || null,
        trialEnd: resource.trial_end || null,
        created: resource.created
      }
    };
  })
  .build();
