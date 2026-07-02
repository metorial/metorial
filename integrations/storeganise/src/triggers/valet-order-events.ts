import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let valetOrderEventsTrigger = SlateTrigger.create(spec, {
  name: 'Valet Order Events',
  key: 'valet_order_events',
  description:
    'Triggers on valet order lifecycle events: submission, creation (pending approval), confirmation, completion, and cancellation.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      orderId: z.string().optional().describe('The valet order ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      orderId: z.string().optional().describe('The valet order ID'),
      eventType: z.string().describe('The type of valet order event'),
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

      let valetEventTypes = [
        'job.valetOrder.submitted',
        'job.valetOrder.created',
        'job.valetOrder.started',
        'job.valetOrder.completed',
        'job.valetOrder.cancelled',
        'items.updated'
      ];

      if (!valetEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}_${body.created || Date.now()}`,
            orderId: body.data?.valetOrderId || body.data?.jobId || body.data?.id,
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
          orderId: ctx.input.orderId,
          eventType: ctx.input.eventType,
          created: ctx.input.webhookPayload.created as string | undefined,
          webhookPayload: ctx.input.webhookPayload
        }
      };
    }
  })
  .build();
