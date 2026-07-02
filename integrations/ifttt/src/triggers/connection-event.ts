import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let connectionEventTrigger = SlateTrigger.create(spec, {
  name: 'Connection Event',
  key: 'connection_event',
  description:
    'Fires when a user enables, updates, or disables an IFTTT connection. IFTTT sends webhook notifications to your service endpoint for connection lifecycle events.'
})
  .input(
    z.object({
      eventType: z
        .enum(['enabled', 'updated', 'disabled'])
        .describe('The type of connection lifecycle event'),
      connectionId: z.string().describe('The connection ID'),
      userId: z.string().describe('The user ID who triggered the event'),
      occurredAt: z.string().describe('ISO 8601 timestamp of when the event occurred'),
      rawPayload: z.any().describe('The full raw webhook payload')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID affected'),
      userId: z.string().describe('The user ID who enabled/disabled/updated the connection'),
      occurredAt: z.string().describe('ISO 8601 timestamp of when the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');

      let eventType = 'enabled';
      let lastSegment = pathParts[pathParts.length - 1];
      if (lastSegment === 'disabled') eventType = 'disabled';
      else if (lastSegment === 'updated') eventType = 'updated';
      else if (lastSegment === 'enabled') eventType = 'enabled';

      if (body?.type) {
        if (body.type.includes('disabled')) eventType = 'disabled';
        else if (body.type.includes('updated')) eventType = 'updated';
        else if (body.type.includes('enabled')) eventType = 'enabled';
      }

      let connectionId = body?.connection_id || body?.connectionId || '';
      let userId = body?.user_id || body?.userId || '';
      let occurredAt = body?.occurred_at || body?.occurredAt || new Date().toISOString();

      return {
        inputs: [
          {
            eventType: eventType as 'enabled' | 'updated' | 'disabled',
            connectionId,
            userId,
            occurredAt,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `connection.${ctx.input.eventType}`,
        id: `${ctx.input.connectionId}-${ctx.input.userId}-${ctx.input.occurredAt}`,
        output: {
          connectionId: ctx.input.connectionId,
          userId: ctx.input.userId,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
