import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

let NOTE_EVENT_TYPES = [
  'note.created',
  'note.updated',
  'note.deleted',
  'note-content.updated'
] as const;

export let noteEventsTrigger = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description:
    'Triggers when notes are created, updated (title changes), deleted, or when note content changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of note event'),
      eventId: z.string().describe('Unique event identifier'),
      noteId: z.string().describe('The note ID'),
      parentObjectId: z.string().optional().describe('Parent object ID'),
      parentRecordId: z.string().optional().describe('Parent record ID'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('The note ID'),
      parentObjectId: z.string().optional().describe('Parent object ID'),
      parentRecordId: z.string().optional().describe('Parent record ID'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        NOTE_EVENT_TYPES.map(eventType => ({ eventType }))
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
        .filter((e: any) => NOTE_EVENT_TYPES.includes(e.event_type))
        .map((e: any) => ({
          eventType: e.event_type,
          eventId: e.id?.event_id ?? `${e.event_type}-${e.id?.note_id}-${Date.now()}`,
          noteId: e.id?.note_id ?? '',
          parentObjectId: e.id?.parent_object_id,
          parentRecordId: e.id?.parent_record_id,
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
          noteId: ctx.input.noteId,
          parentObjectId: ctx.input.parentObjectId,
          parentRecordId: ctx.input.parentRecordId,
          actorType: ctx.input.actorType,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
