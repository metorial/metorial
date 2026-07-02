import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let entryEvents = SlateTrigger.create(spec, {
  name: 'Entry Events',
  key: 'entry_events',
  description: 'Triggers when someone joins a waitlist (entry.created).'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (entry.created)'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      entryId: z.string().describe('Entry ID'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      productId: z.string().nullable().describe('Product ID'),
      productTitle: z.string().nullable().describe('Product title'),
      planId: z.string().nullable().describe('Plan ID'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('Entry ID'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      productId: z.string().nullable().describe('Product ID'),
      productTitle: z.string().nullable().describe('Product title'),
      planId: z.string().nullable().describe('Plan ID'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.type;

      if (!eventType?.startsWith('entry.')) {
        return { inputs: [] };
      }

      let entry = body.data || {};

      return {
        inputs: [
          {
            eventType,
            eventId: `${entry.id}_${eventType}_${entry.created_at || Date.now()}`,
            entryId: entry.id,
            userId: entry.user?.id || null,
            username: entry.user?.username || null,
            userEmail: entry.user?.email || null,
            productId: entry.product?.id || null,
            productTitle: entry.product?.title || null,
            planId: entry.plan?.id || null,
            createdAt: entry.created_at || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          entryId: ctx.input.entryId,
          userId: ctx.input.userId,
          username: ctx.input.username,
          userEmail: ctx.input.userEmail,
          productId: ctx.input.productId,
          productTitle: ctx.input.productTitle,
          planId: ctx.input.planId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
