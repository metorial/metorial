import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let noteEventTypes = ['notesCreated', 'notesUpdated', 'notesDeleted'] as const;

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description: 'Triggered when notes are created, updated, or deleted on contacts.'
})
  .input(
    z.object({
      eventType: z.enum(noteEventTypes).describe('Type of note event'),
      eventId: z.string().describe('Unique event ID'),
      noteId: z.number().describe('Note ID affected'),
      resourceUri: z.string().optional().describe('URI to fetch the full resource'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('Note ID'),
      eventType: z.string().describe('Type of event'),
      resourceUri: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let eventType of noteEventTypes) {
        let result = await client.createWebhook({
          event: eventType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhooks.push({ webhookId: result.id, event: eventType });
      }

      return { registrationDetails: { webhooks: registeredWebhooks } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhooks = ctx.input.registrationDetails?.webhooks || [];
      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            eventId: String(data.eventId),
            noteId: data.resourceIds?.[0] || 0,
            resourceUri: data.uri,
            timestamp: data.timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let action = ctx.input.eventType.replace('notes', '').toLowerCase();

      return {
        type: `note.${action}`,
        id: ctx.input.eventId,
        output: {
          noteId: ctx.input.noteId,
          eventType: ctx.input.eventType,
          resourceUri: ctx.input.resourceUri,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
