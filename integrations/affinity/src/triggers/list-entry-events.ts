import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let listEntryEvents = SlateTrigger.create(spec, {
  name: 'List Entry Events',
  key: 'list_entry_events',
  description: 'Triggers when an entity is added to or removed from an Affinity list.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (list_entry.created or list_entry.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      listEntryId: z.number().describe('ID of the list entry'),
      listId: z.number().nullable().describe('ID of the list'),
      entityId: z.number().nullable().describe('ID of the entity'),
      entityType: z
        .number()
        .nullable()
        .describe('Type of entity (0=person, 1=organization, 8=opportunity)'),
      creatorId: z.number().nullable().describe('ID of the user who made the change'),
      createdAt: z.string().nullable().describe('When the entry was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['list_entry.created', 'list_entry.deleted']
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
      if (!type?.startsWith('list_entry.')) {
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
          listEntryId: body.id ?? 0,
          listId: body.list_id ?? null,
          entityId: body.entity_id ?? null,
          entityType: body.entity_type ?? null,
          creatorId: body.creator_id ?? null,
          createdAt: body.created_at ?? null
        }
      };
    }
  })
  .build();
