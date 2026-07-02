import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description:
    'Triggers when a note is created, updated, or deleted in your Folk workspace. Note content is not included in webhook payloads.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of note event'),
      eventId: z.string().describe('Unique event ID'),
      noteId: z.string().describe('ID of the affected note'),
      noteUrl: z.string().describe('API URL for the note'),
      details: z.record(z.string(), z.unknown()).optional().describe('Additional details'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the affected note'),
      noteUrl: z.string().describe('API URL for the note'),
      entityId: z.string().optional().describe('ID of the entity the note is attached to'),
      entityType: z.string().optional().describe('Type of entity'),
      visibility: z.string().optional().describe('Note visibility'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        name: 'Slates - Note Events',
        targetUrl: ctx.input.webhookBaseUrl,
        subscribedEvents: [
          { eventType: 'note.created' },
          { eventType: 'note.updated' },
          { eventType: 'note.deleted' }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signingSecret: webhook.signingSecret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let data = body.data as Record<string, unknown> | undefined;

      return {
        inputs: [
          {
            eventType: body.type as string,
            eventId: body.id as string,
            noteId: (data?.id as string) ?? '',
            noteUrl: (data?.url as string) ?? '',
            details: (data?.details as Record<string, unknown>) ?? undefined,
            createdAt: body.createdAt as string
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, unknown> = {
        noteId: ctx.input.noteId,
        noteUrl: ctx.input.noteUrl,
        createdAt: ctx.input.createdAt
      };

      if (ctx.input.details) {
        let details = ctx.input.details;
        if (details.entityId) output.entityId = details.entityId;
        if (details.entityType) output.entityType = details.entityType;
      }

      // Try to fetch note details for non-delete events
      if (ctx.input.eventType !== 'note.deleted' && ctx.input.noteId) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let note = await client.getNote(ctx.input.noteId);
          output.entityId = note.entity.id;
          output.entityType = note.entity.entityType;
          output.visibility = note.visibility;
        } catch {
          // Note may not be fetchable
        }
      }

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: output as {
          noteId: string;
          noteUrl: string;
          createdAt: string;
          entityId?: string;
          entityType?: string;
          visibility?: string;
        }
      };
    }
  })
  .build();
