import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description: 'Triggered when an internal note is added to a conversation.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      noteId: z.string().describe('Note ID'),
      content: z.string().optional().describe('Note content'),
      authorId: z.string().optional().describe('Author user ID'),
      authorName: z.string().optional().describe('Author display name'),
      conversationId: z.string().optional().describe('Conversation ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('Note ID'),
      content: z.string().optional().describe('Note content'),
      authorId: z.string().optional().describe('Author user ID'),
      authorName: z.string().optional().describe('Author display name'),
      conversationId: z.string().optional().describe('Conversation ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { type: 'note_created' }
      ]);

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let note = data.note || data.payload?.note || {};
      let author = note.author || {};

      return {
        inputs: [
          {
            eventId: data.id,
            noteId: note.id || data.id,
            content: note.content,
            authorId: author.id,
            authorName: author.name,
            conversationId: note.conversation_id,
            createdAt: note.created_at,
            updatedAt: note.updated_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'note.created',
        id: ctx.input.eventId,
        output: {
          noteId: ctx.input.noteId,
          content: ctx.input.content,
          authorId: ctx.input.authorId,
          authorName: ctx.input.authorName,
          conversationId: ctx.input.conversationId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
