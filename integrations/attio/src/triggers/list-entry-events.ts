import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

let LIST_ENTRY_EVENT_TYPES = [
  'list-entry.created',
  'list-entry.updated',
  'list-entry.deleted'
] as const;

export let listEntryEventsTrigger = SlateTrigger.create(spec, {
  name: 'List Entry Events',
  key: 'list_entry_events',
  description:
    'Triggers when records are added to, updated within, or removed from lists (e.g. sales pipelines, recruitment pipelines).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of list entry event'),
      eventId: z.string().describe('Unique event identifier'),
      listId: z.string().describe('The list ID'),
      entryId: z.string().describe('The entry ID'),
      parentObjectId: z.string().optional().describe('Parent object ID'),
      parentRecordId: z.string().optional().describe('Parent record ID'),
      attributeId: z
        .string()
        .optional()
        .describe('Attribute ID that changed (for update events)'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('The list ID'),
      entryId: z.string().describe('The entry ID'),
      parentObjectId: z.string().optional().describe('Parent object ID'),
      parentRecordId: z.string().optional().describe('Parent record ID'),
      attributeId: z
        .string()
        .optional()
        .describe('Attribute ID that changed (for update events)'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        LIST_ENTRY_EVENT_TYPES.map(eventType => ({ eventType }))
      );

      return {
        registrationDetails: {
          webhookId: webhook.id?.webhook_id ?? webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let events = body.events ?? [];

      let inputs = events
        .filter((e: any) => LIST_ENTRY_EVENT_TYPES.includes(e.event_type))
        .map((e: any) => ({
          eventType: e.event_type,
          eventId: e.id?.event_id ?? `${e.event_type}-${e.id?.entry_id}-${Date.now()}`,
          listId: e.id?.list_id ?? '',
          entryId: e.id?.entry_id ?? '',
          parentObjectId: e.id?.parent_object_id,
          parentRecordId: e.id?.parent_record_id,
          attributeId: e.id?.attribute_id,
          actorType: e.actor?.type,
          actorId: e.actor?.id
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          listId: ctx.input.listId,
          entryId: ctx.input.entryId,
          parentObjectId: ctx.input.parentObjectId,
          parentRecordId: ctx.input.parentRecordId,
          attributeId: ctx.input.attributeId,
          actorType: ctx.input.actorType,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
