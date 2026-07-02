import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTrigger.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: 'Triggers when a list is created, updated, or deleted in Affinity.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (list.created, list.updated, list.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('ID of the affected list'),
      name: z.string().nullable().describe('List name'),
      type: z
        .number()
        .nullable()
        .describe('Entity type (0=person, 1=organization, 8=opportunity)'),
      public: z.boolean().describe('Whether the list is public'),
      ownerId: z.number().nullable().describe('ID of the list owner'),
      creatorId: z.number().nullable().describe('ID of the list creator')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['list.created', 'list.updated', 'list.deleted']
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let type = data.type as string;
      if (!type?.startsWith('list.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: type,
            eventId: `${type}-${data.body?.id ?? ''}-${data.sent_at ?? Date.now()}`,
            sentAt: data.sent_at ?? null,
            body: data.body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let body = ctx.input.body ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          listId: body.id ?? 0,
          name: body.name ?? null,
          type: body.type ?? null,
          public: body.public ?? false,
          ownerId: body.owner_id ?? null,
          creatorId: body.creator_id ?? null
        }
      };
    }
  })
  .build();
