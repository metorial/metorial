import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';
import { checkoutEventSchema, referenceId } from './event-schemas';
import { matchesStripeEvent } from './event-types';
import { stripeEvents } from './events-trigger-group';

export let checkoutEvents = SlateTrigger.create(spec, {
  name: 'Checkout Events',
  key: 'checkout_events',
  description:
    'Triggered when a Checkout session completes, expires, or its asynchronous payment succeeds or fails. Use this to fulfill orders, activate services, or handle abandoned checkouts.'
})
  .triggerGroup(stripeEvents)
  .input(checkoutEventSchema)
  .output(
    z.object({
      sessionId: z.string().describe('Checkout session ID'),
      customerId: z.string().optional().nullable().describe('Customer ID'),
      customerEmail: z.string().optional().nullable().describe('Customer email'),
      mode: z.string().describe('Checkout mode (payment, subscription, setup)'),
      paymentStatus: z.string().describe('Payment status'),
      status: z.string().nullable().describe('Session status'),
      amountTotal: z.number().optional().nullable().describe('Total amount'),
      currency: z.string().optional().nullable().describe('Currency code'),
      paymentIntentId: z
        .string()
        .optional()
        .nullable()
        .describe('Associated PaymentIntent ID'),
      subscriptionId: z.string().optional().nullable().describe('Associated subscription ID')
    })
  )
  .matches(payload => matchesStripeEvent('checkout', payload))
  .map(async ctx => {
    let resource = ctx.input.data.object;
    return {
      type: ctx.input.type,
      id: ctx.input.id,
      output: {
        sessionId: resource.id,
        customerId: referenceId(resource.customer) ?? null,
        customerEmail: resource.customer_email || resource.customer_details?.email || null,
        mode: resource.mode,
        paymentStatus: resource.payment_status,
        status: resource.status,
        amountTotal: resource.amount_total,
        currency: resource.currency,
        paymentIntentId: referenceId(resource.payment_intent) ?? null,
        subscriptionId: referenceId(resource.subscription) ?? null
      }
    };
  })
  .build();
