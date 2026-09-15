import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';
import { payoutEventSchema } from './event-schemas';
import { matchesStripeEvent } from './event-types';
import { stripeEvents } from './events-trigger-group';

export let payoutEvents = SlateTrigger.create(spec, {
  name: 'Payout Events',
  key: 'payout_events',
  description:
    'Triggered when payout events occur, including creation, success, failure, and cancellation of transfers to your bank account or debit card.'
})
  .triggerGroup(stripeEvents)
  .input(payoutEventSchema)
  .output(
    z.object({
      payoutId: z.string().describe('Payout ID'),
      amount: z.number().describe('Payout amount'),
      currency: z.string().describe('Currency code'),
      status: z.string().describe('Payout status'),
      method: z.string().optional().describe('Payout method'),
      arrivalDate: z.number().optional().describe('Estimated arrival date'),
      failureMessage: z
        .string()
        .optional()
        .nullable()
        .describe('Failure message if applicable'),
      created: z.number().optional().describe('Payout creation timestamp')
    })
  )
  .matches(payload => matchesStripeEvent('payout', payload))
  .map(async ctx => {
    let resource = ctx.input.data.object;
    return {
      type: ctx.input.type,
      id: ctx.input.id,
      output: {
        payoutId: resource.id,
        amount: resource.amount,
        currency: resource.currency,
        status: resource.status,
        method: resource.method,
        arrivalDate: resource.arrival_date,
        failureMessage: resource.failure_message || null,
        created: resource.created
      }
    };
  })
  .build();
