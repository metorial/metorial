import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let setupIntentEvents = SlateTrigger.create(spec, {
  name: 'Setup Intent Events',
  key: 'setup_intent_events',
  description:
    'Triggers when a customer saves their payment method via a setup intent (setup_intent.succeeded).'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (setup_intent.succeeded)'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      setupIntentId: z.string().describe('Setup intent ID'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      companyId: z.string().nullable().describe('Company ID'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
    })
  )
  .output(
    z.object({
      setupIntentId: z.string().describe('Setup intent ID'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      companyId: z.string().nullable().describe('Company ID'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.type;

      if (!eventType?.startsWith('setup_intent.')) {
        return { inputs: [] };
      }

      let intent = body.data || {};

      return {
        inputs: [
          {
            eventType,
            eventId: `${intent.id}_${eventType}_${intent.updated_at || intent.created_at || Date.now()}`,
            setupIntentId: intent.id,
            userId: intent.user?.id || null,
            username: intent.user?.username || null,
            userEmail: intent.user?.email || null,
            companyId: intent.company?.id || intent.company_id || null,
            createdAt: intent.created_at || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          setupIntentId: ctx.input.setupIntentId,
          userId: ctx.input.userId,
          username: ctx.input.username,
          userEmail: ctx.input.userEmail,
          companyId: ctx.input.companyId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
