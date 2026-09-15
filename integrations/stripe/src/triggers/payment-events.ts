import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';
import { paymentEventSchema, referenceId } from './event-schemas';
import { matchesStripeEvent } from './event-types';
import { stripeEvents } from './events-trigger-group';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggered when payment-related events occur, including PaymentIntent, Charge, Refund, and Dispute lifecycle changes such as creation, success, failure, and refunds.'
})
  .triggerGroup(stripeEvents)
  .input(paymentEventSchema)
  .output(
    z.object({
      resourceId: z.string().describe('ID of the payment resource'),
      resourceType: z
        .string()
        .describe('Type of resource (payment_intent, charge, refund, dispute)'),
      amount: z.number().optional().describe('Amount in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Current status of the resource'),
      customerId: z.string().optional().nullable().describe('Associated customer ID'),
      description: z.string().optional().nullable().describe('Description'),
      failureMessage: z
        .string()
        .optional()
        .nullable()
        .describe('Failure message if applicable'),
      receiptUrl: z.string().optional().nullable().describe('Receipt URL (for charges)'),
      created: z.number().optional().describe('Resource creation timestamp')
    })
  )
  .matches(payload => matchesStripeEvent('payment', payload))
  .map(async ctx => {
    let resource = ctx.input.data.object;
    return {
      type: ctx.input.type,
      id: ctx.input.id,
      output: {
        resourceId: resource.id,
        resourceType: resource.object,
        amount: resource.amount,
        currency: resource.currency,
        status: resource.status ?? undefined,
        customerId: referenceId(resource.customer) ?? null,
        description: resource.description || null,
        failureMessage:
          resource.failure_message || resource.last_payment_error?.message || null,
        receiptUrl: resource.receipt_url || null,
        created: resource.created
      }
    };
  })
  .build();
