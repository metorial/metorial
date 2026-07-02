import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let noteChangesTrigger = SlateTrigger.create(spec, {
  name: 'Note Changes',
  key: 'note_changes',
  description:
    'Receive notifications when notes are created or updated via Evernote webhooks. Webhook registration must be configured manually through Evernote developer support.'
})
  .input(
    z.object({
      userId: z.string().describe('Numeric user ID from the webhook'),
      notebookGuid: z.string().describe('GUID of the affected notebook'),
      noteGuid: z.string().optional().describe('GUID of the affected note (if applicable)'),
      reason: z
        .string()
        .describe(
          'Reason for the notification: create, update, business_create, or business_update'
        )
    })
  )
  .output(
    z.object({
      noteGuid: z.string().optional().describe('GUID of the affected note'),
      title: z.string().optional().describe('Title of the affected note'),
      notebookGuid: z.string().describe('GUID of the affected notebook'),
      userId: z.string().describe('Numeric user ID'),
      reason: z.string().describe('Event reason code'),
      createdAt: z.string().optional().describe('ISO timestamp when the note was created'),
      updatedAt: z.string().optional().describe('ISO timestamp when the note was last updated')
    })
  )
  .webhook({
    // Evernote webhook registration is manual (via developer support ticket)
    // so we do NOT implement autoRegisterWebhook/autoUnregisterWebhook

    handleRequest: async ctx => {
      // Evernote sends webhooks as HTTP GET requests with query parameters
      let url = new URL(ctx.request.url);
      let userId = url.searchParams.get('userId') || '';
      let notebookGuid = url.searchParams.get('notebookGuid') || '';
      let noteGuid = url.searchParams.get('guid') || undefined;
      let reason = url.searchParams.get('reason') || '';

      if (!userId || !reason) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            userId,
            notebookGuid,
            noteGuid,
            reason
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let noteTitle: string | undefined;
      let createdAt: string | undefined;
      let updatedAt: string | undefined;

      // Try to fetch note details if we have a noteGuid
      if (ctx.input.noteGuid) {
        try {
          let client = new Client({
            token: ctx.auth.token,
            noteStoreUrl: ctx.auth.noteStoreUrl
          });
          let note = await client.getNote(ctx.input.noteGuid, false, false, false, false);
          noteTitle = note.title;
          createdAt = note.created ? new Date(note.created).toISOString() : undefined;
          updatedAt = note.updated ? new Date(note.updated).toISOString() : undefined;
        } catch {
          // Unable to fetch note details
        }
      }

      let eventType =
        ctx.input.reason === 'create' || ctx.input.reason === 'business_create'
          ? 'note.created'
          : 'note.updated';

      return {
        type: eventType,
        id: `${ctx.input.userId}-${ctx.input.noteGuid || ctx.input.notebookGuid}-${ctx.input.reason}-${Date.now()}`,
        output: {
          noteGuid: ctx.input.noteGuid,
          title: noteTitle,
          notebookGuid: ctx.input.notebookGuid,
          userId: ctx.input.userId,
          reason: ctx.input.reason,
          createdAt,
          updatedAt
        }
      };
    }
  })
  .build();
