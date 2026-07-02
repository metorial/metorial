import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

let RECORD_EVENT_TYPES = [
  'record.created',
  'record.updated',
  'record.deleted',
  'record.merged'
] as const;

export let recordEventsTrigger = SlateTrigger.create(spec, {
  name: 'Record Events',
  key: 'record_events',
  description:
    'Triggers when records are created, updated, deleted, or merged in Attio. Covers all object types (People, Companies, Deals, custom objects).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of record event'),
      eventId: z.string().describe('Unique event identifier'),
      objectId: z.string().describe('Object ID the record belongs to'),
      recordId: z.string().describe('The affected record ID'),
      attributeId: z
        .string()
        .optional()
        .describe('Attribute ID that changed (for update events)'),
      duplicateRecordId: z
        .string()
        .optional()
        .describe('Duplicate record ID (for merge events)'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .output(
    z.object({
      objectId: z.string().describe('Object ID the record belongs to'),
      recordId: z.string().describe('The affected record ID'),
      attributeId: z
        .string()
        .optional()
        .describe('Attribute ID that changed (for update events)'),
      duplicateRecordId: z
        .string()
        .optional()
        .describe('Duplicate record ID (for merge events)'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        RECORD_EVENT_TYPES.map(eventType => ({ eventType }))
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
        .filter((e: any) => RECORD_EVENT_TYPES.includes(e.event_type))
        .map((e: any) => ({
          eventType: e.event_type,
          eventId: e.id?.event_id ?? `${e.event_type}-${e.id?.record_id}-${Date.now()}`,
          objectId: e.id?.object_id ?? '',
          recordId: e.id?.record_id ?? '',
          attributeId: e.id?.attribute_id,
          duplicateRecordId: e.id?.duplicate_record_id,
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
          objectId: ctx.input.objectId,
          recordId: ctx.input.recordId,
          attributeId: ctx.input.attributeId,
          duplicateRecordId: ctx.input.duplicateRecordId,
          actorType: ctx.input.actorType,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
