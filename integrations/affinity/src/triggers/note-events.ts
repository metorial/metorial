import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description: 'Triggers when a note is created, updated, or deleted in Affinity.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (note.created, note.updated, note.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the note'),
      creatorId: z.number().nullable().describe('ID of the note creator'),
      personIds: z.array(z.number()).describe('Associated person IDs'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs'),
      opportunityIds: z.array(z.number()).describe('Associated opportunity IDs'),
      content: z.string().nullable().describe('Note content'),
      createdAt: z.string().nullable().describe('Creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['note.created', 'note.updated', 'note.deleted']
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
      if (!type?.startsWith('note.')) {
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
          noteId: body.id ?? 0,
          creatorId: body.creator_id ?? null,
          personIds: body.person_ids ?? [],
          organizationIds: body.organization_ids ?? [],
          opportunityIds: body.opportunity_ids ?? [],
          content: body.content ?? null,
          createdAt: body.created_at ?? null
        }
      };
    }
  })
  .build();
