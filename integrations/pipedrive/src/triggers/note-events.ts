import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description: 'Triggers when a note is created, updated, or deleted in Pipedrive.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      current: z.any().optional().describe('Current state of the note'),
      previous: z.any().optional().describe('Previous state of the note')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('Note ID'),
      content: z.string().optional().describe('Note content'),
      dealId: z.number().optional().nullable().describe('Attached deal ID'),
      personId: z.number().optional().nullable().describe('Attached person ID'),
      organizationId: z.number().optional().nullable().describe('Attached organization ID'),
      leadId: z.string().optional().nullable().describe('Attached lead ID'),
      userId: z.number().optional().describe('Creator user ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let result = await client.createWebhook({
        subscription_url: ctx.input.webhookBaseUrl,
        event_action: '*',
        event_object: 'note'
      });
      return {
        registrationDetails: { webhookId: result?.data?.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let action = data.meta?.action;
      let current = data.current;
      let previous = data.previous;

      let actionMap: Record<string, string> = {
        added: 'created',
        updated: 'changed',
        deleted: 'deleted'
      };

      return {
        inputs: [
          {
            action: actionMap[action] || action,
            eventId: `note-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let note = ctx.input.current || ctx.input.previous || {};

      return {
        type: `note.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          noteId: note.id,
          content: note.content,
          dealId: note.deal_id,
          personId: note.person_id,
          organizationId: note.org_id,
          leadId: note.lead_id,
          userId: note.user_id,
          addTime: note.add_time,
          updateTime: note.update_time
        }
      };
    }
  });
