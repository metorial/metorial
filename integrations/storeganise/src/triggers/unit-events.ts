import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let unitEventsTrigger = SlateTrigger.create(spec, {
  name: 'Unit Events',
  key: 'unit_events',
  description:
    'Triggers when a storage unit changes state: reserved, occupied, blocked, unblocked, unassigned, or archived.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      unitId: z.string().optional().describe('The affected unit ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      unitId: z.string().optional().describe('The affected unit ID'),
      eventType: z.string().describe('The type of unit event'),
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

      let unitEventTypes = [
        'unit.reserved',
        'unit.occupied',
        'unit.blocked',
        'unit.unblocked',
        'unit.unassigned',
        'unit.archived'
      ];

      if (!unitEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}_${body.created || Date.now()}`,
            unitId: body.data?.unitId || body.data?.id,
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
          unitId: ctx.input.unitId,
          eventType: ctx.input.eventType,
          created: ctx.input.webhookPayload.created as string | undefined,
          webhookPayload: ctx.input.webhookPayload
        }
      };
    }
  })
  .build();
