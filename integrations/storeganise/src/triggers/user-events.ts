import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let userEventsTrigger = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when users are created, updated, or when their billing details are modified.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      userId: z.string().optional().describe('The affected user ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('The affected user ID'),
      eventType: z.string().describe('The type of user event'),
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

      let userEventTypes = ['user.created', 'user.updated', 'user.billing.updated'];

      if (!userEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}_${body.created || Date.now()}`,
            userId: body.data?.userId || body.data?.id,
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
          userId: ctx.input.userId,
          eventType: ctx.input.eventType,
          created: ctx.input.webhookPayload.created as string | undefined,
          webhookPayload: ctx.input.webhookPayload
        }
      };
    }
  })
  .build();
