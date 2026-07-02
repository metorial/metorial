import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let unsubscribeTrigger = SlateTrigger.create(spec, {
  name: 'Unsubscribe',
  key: 'unsubscribe',
  description:
    'Triggers when a person unsubscribes from surveys by clicking the unsubscribe button in a survey email.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      personId: z.string().describe('ID of the person who unsubscribed'),
      email: z.string().nullable().describe('Email of the unsubscribed person'),
      name: z.string().nullable().describe('Name of the unsubscribed person'),
      unsubscribedAt: z.number().describe('Unix timestamp of when they unsubscribed')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('ID of the person who unsubscribed'),
      email: z.string().nullable().describe('Email of the unsubscribed person'),
      name: z.string().nullable().describe('Name of the unsubscribed person'),
      unsubscribedAt: z.number().describe('Unix timestamp of when they unsubscribed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type;
      let eventId = body.event_id;
      let eventData = body.event_data;

      if (!eventType || !eventData) {
        return { inputs: [] };
      }

      if (!eventType.startsWith('unsubscribe.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            personId: String(eventData.person_id || ''),
            email: eventData.email || null,
            name: eventData.name || null,
            unsubscribedAt: eventData.unsubscribed_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          personId: ctx.input.personId,
          email: ctx.input.email,
          name: ctx.input.name,
          unsubscribedAt: ctx.input.unsubscribedAt
        }
      };
    }
  })
  .build();
