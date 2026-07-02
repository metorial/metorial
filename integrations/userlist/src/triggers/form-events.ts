import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formEvents = SlateTrigger.create(spec, {
  name: 'Form Events',
  key: 'form_events',
  description: 'Triggers when a user submits a Userlist form.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name.'),
      eventId: z.string().describe('Unique event ID for deduplication.'),
      user: z
        .record(z.string(), z.unknown())
        .describe('Raw user object from the webhook payload.'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional event properties.'),
      occurredAt: z.string().describe('When the event occurred.')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Internal Userlist user ID.'),
      userIdentifier: z
        .string()
        .optional()
        .nullable()
        .describe('Application-provided user identifier.'),
      userEmail: z.string().optional().nullable().describe('User email address.'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Form submission properties.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventName = data.name as string;

      if (eventName !== 'form_submitted') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName,
            eventId: data.id,
            user: data.user || {},
            properties: data.properties || {},
            occurredAt: data.occurred_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let user = ctx.input.user as any;

      return {
        type: ctx.input.eventName,
        id: ctx.input.eventId,
        output: {
          userId: user.id || '',
          userIdentifier: user.identifier || null,
          userEmail: user.email || null,
          properties: ctx.input.properties || {}
        }
      };
    }
  })
  .build();
