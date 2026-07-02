import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let invoiceEventsTrigger = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggers on invoice lifecycle events: creation, state changes (draft, sent, paid, void), payment updates, deletion, and reminder dispatch.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      invoiceId: z.string().optional().describe('The affected invoice ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional().describe('The affected invoice ID'),
      eventType: z.string().describe('The type of invoice event'),
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

      let invoiceEventTypes = [
        'invoice.created',
        'invoice.state.updated',
        'invoice.payments.updated',
        'invoice.deleted',
        'valet.invoice.created',
        'job.invoice_reminder.sent'
      ];

      if (!invoiceEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}_${body.created || Date.now()}`,
            invoiceId: body.data?.invoiceId || body.data?.id,
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
          invoiceId: ctx.input.invoiceId,
          eventType: ctx.input.eventType,
          created: ctx.input.webhookPayload.created as string | undefined,
          webhookPayload: ctx.input.webhookPayload
        }
      };
    }
  })
  .build();
