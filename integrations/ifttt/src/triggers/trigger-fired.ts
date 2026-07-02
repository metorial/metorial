import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let triggerFiredTrigger = SlateTrigger.create(spec, {
  name: 'Trigger Fired',
  key: 'trigger_fired',
  description:
    'Fires when an IFTTT trigger subscription detects a new event and sends a webhook to your service endpoint. The payload contains trigger event data and user context from the connected service.'
})
  .input(
    z.object({
      triggerId: z.string().describe('The trigger identifier that fired'),
      triggerIdentity: z
        .string()
        .optional()
        .describe('The trigger identity for the specific configuration'),
      userId: z.string().describe('The user ID the trigger fired for'),
      connectionId: z.string().optional().describe('The connection ID'),
      eventId: z.string().describe('Unique identifier for this trigger event'),
      ingredients: z
        .record(z.string(), z.any())
        .optional()
        .describe('Trigger ingredient data from the connected service'),
      occurredAt: z.string().describe('ISO 8601 timestamp of when the trigger fired'),
      rawPayload: z.any().describe('The full raw webhook payload')
    })
  )
  .output(
    z.object({
      triggerId: z.string().describe('The trigger that fired'),
      triggerIdentity: z
        .string()
        .optional()
        .describe('The trigger identity for the specific configuration'),
      userId: z.string().describe('The user ID the trigger fired for'),
      connectionId: z.string().optional().describe('The connection ID'),
      ingredients: z
        .record(z.string(), z.any())
        .optional()
        .describe('Trigger ingredient data from the connected service'),
      occurredAt: z.string().describe('ISO 8601 timestamp of when the trigger event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let triggerId = body?.trigger_id || body?.triggerId || body?.trigger_slug || '';
      let triggerIdentity = body?.trigger_identity || body?.triggerIdentity;
      let userId = body?.user_id || body?.userId || '';
      let connectionId = body?.connection_id || body?.connectionId;
      let ingredients = body?.ingredients || body?.trigger_fields || body?.data;
      let occurredAt = body?.occurred_at || body?.occurredAt || new Date().toISOString();
      let requestId = ctx.request.headers.get('X-Request-ID') || '';
      let eventId =
        body?.event_id || body?.eventId || requestId || `${triggerId}-${userId}-${occurredAt}`;

      return {
        inputs: [
          {
            triggerId,
            triggerIdentity,
            userId,
            connectionId,
            eventId,
            ingredients,
            occurredAt,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `trigger.fired`,
        id: ctx.input.eventId,
        output: {
          triggerId: ctx.input.triggerId,
          triggerIdentity: ctx.input.triggerIdentity,
          userId: ctx.input.userId,
          connectionId: ctx.input.connectionId,
          ingredients: ctx.input.ingredients,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
