import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let noteEventsTrigger = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description:
    'Triggered when notes (feedback/insights) are created in the workspace. Captures new feedback items added to the Insights board.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of note event'),
      eventId: z.string().describe('Unique event identifier'),
      noteId: z.string().describe('ID of the affected note'),
      noteTitle: z.string().optional().describe('Title of the note'),
      raw: z.record(z.string(), z.any()).optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the affected note'),
      noteTitle: z.string().optional().describe('Title of the note'),
      note: z.record(z.string(), z.any()).optional().describe('Full note data if available')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        notificationUrl: ctx.input.webhookBaseUrl,
        eventType: 'note.created'
      });

      return {
        registrationDetails: { webhookIds: [webhook.id] }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      // Handle probe/verification request
      if (body.type === 'probe' || body.eventType === 'probe') {
        return { inputs: [] };
      }

      let eventType = body.eventType || body.type || 'note.created';
      let noteData = body.data || body;
      let noteId = noteData?.id || noteData?.note?.id || '';
      let noteTitle = noteData?.title || noteData?.note?.title;

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}-${noteId}-${Date.now()}`,
            noteId,
            noteTitle,
            raw: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let noteData: Record<string, any> | undefined;

      if (ctx.input.noteId) {
        try {
          let client = new Client({ token: ctx.auth.token });
          noteData = await client.getNote(ctx.input.noteId);
        } catch {
          // Note may not be accessible
        }
      }

      let rawData = ctx.input.raw as Record<string, any> | undefined;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          noteId: ctx.input.noteId,
          noteTitle: ctx.input.noteTitle || noteData?.title,
          note: noteData || (rawData?.data as Record<string, any> | undefined)
        }
      };
    }
  })
  .build();
