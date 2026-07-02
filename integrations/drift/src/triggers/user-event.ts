import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let userEvent = SlateTrigger.create(spec, {
  name: 'User Event',
  key: 'user_event',
  description:
    'Triggers on user events including availability changes and email unsubscriptions.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of user event: user_availability_updated or user_unsubscribed'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      userId: z.number().optional().describe('Drift user ID'),
      availability: z
        .string()
        .optional()
        .describe('New availability status (for availability events)'),
      email: z.string().optional().describe('User email (for unsubscribe events)'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('Drift user ID'),
      availability: z.string().optional().describe('New availability status'),
      email: z.string().optional().describe('User email'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type || 'unknown';
      let eventData = data.data || {};
      let timestamp = data.createdAt || Date.now();

      if (eventType !== 'user_availability_updated' && eventType !== 'user_unsubscribed') {
        return { inputs: [] };
      }

      let userId = eventData.userId || eventData.id;

      return {
        inputs: [
          {
            eventType,
            eventId: `${eventType}-${userId}-${timestamp}`,
            userId,
            availability: eventData.availability,
            email: eventData.email,
            createdAt: timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `user.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          userId: ctx.input.userId,
          availability: ctx.input.availability,
          email: ctx.input.email,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
