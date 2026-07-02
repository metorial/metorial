import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let unitRentalEventsTrigger = SlateTrigger.create(spec, {
  name: 'Unit Rental Events',
  key: 'unit_rental_events',
  description:
    'Triggers on unit rental changes: detail updates, overdue status changes, rental invoice creation, and rent price update notifications.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      rentalId: z.string().optional().describe('The affected unit rental ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      rentalId: z.string().optional().describe('The affected unit rental ID'),
      eventType: z.string().describe('The type of unit rental event'),
      created: z.string().optional().describe('Timestamp when the event occurred'),
      webhookPayload: z
        .record(z.string(), z.any())
        .describe('Full webhook payload for additional context')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;
      let eventType = (body.type as string) || '';

      let rentalEventTypes = [
        'unitRental.updated',
        'unitRental.markOverdue',
        'unitRental.unmarkOverdue',
        'unitRental.invoice.created',
        'job.unitRental_updatePrice.notified',
        'job.unitRental_updatePrice.completed'
      ];

      if (!rentalEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}_${body.created || Date.now()}`,
            rentalId: body.data?.unitRentalId || body.data?.id,
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          rentalId: ctx.input.rentalId,
          eventType: ctx.input.eventType,
          created: ctx.input.webhookPayload.created as string | undefined,
          webhookPayload: ctx.input.webhookPayload
        }
      };
    }
  })
  .build();
