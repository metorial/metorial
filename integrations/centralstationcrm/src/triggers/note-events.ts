import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description: 'Triggers when a note is created, updated, or deleted in CentralStationCRM.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that triggered the event (create, update, destroy)'),
      noteId: z.number().describe('ID of the affected note'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the note'),
      content: z.string().optional().describe('Note content'),
      attachableType: z.string().optional().describe('Type of object the note is attached to'),
      attachableId: z.number().optional().describe('ID of the object the note is attached to'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let createHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/create`,
        object_type: 'Action',
        action: 'create'
      });

      let updateHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/update`,
        object_type: 'Action',
        action: 'update'
      });

      let deleteHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/destroy`,
        object_type: 'Action',
        action: 'destroy'
      });

      return {
        registrationDetails: {
          createHookId: (createHook?.hook ?? createHook)?.id,
          updateHookId: (updateHook?.hook ?? updateHook)?.id,
          deleteHookId: (deleteHook?.hook ?? deleteHook)?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let details = ctx.input.registrationDetails as Record<string, number>;
      if (details.createHookId) await client.deleteWebhook(details.createHookId);
      if (details.updateHookId) await client.deleteWebhook(details.updateHookId);
      if (details.deleteHookId) await client.deleteWebhook(details.deleteHookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let actionFromPath = pathParts[pathParts.length - 1] ?? 'unknown';

      let note = data?.action ?? data;

      return {
        inputs: [
          {
            eventAction: actionFromPath,
            noteId: note?.id ?? 0,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let note = ctx.input.rawPayload?.action ?? ctx.input.rawPayload;

      return {
        type: `note.${ctx.input.eventAction === 'destroy' ? 'deleted' : ctx.input.eventAction === 'create' ? 'created' : 'updated'}`,
        id: `note_${ctx.input.noteId}_${ctx.input.eventAction}_${Date.now()}`,
        output: {
          noteId: ctx.input.noteId,
          content: note?.content,
          attachableType: note?.attachable_type,
          attachableId: note?.attachable_id,
          createdAt: note?.created_at,
          updatedAt: note?.updated_at
        }
      };
    }
  })
  .build();
