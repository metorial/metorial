import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let noteCreated = SlateTrigger.create(spec, {
  name: 'New Note',
  key: 'note_created',
  description:
    'Triggers when a new internal note is created in a shared conversation. Notes are private team annotations that are not visible to the customer.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier for this event'),
      noteId: z.string().optional().describe('ID of the note'),
      conversationId: z.string().describe('ID of the conversation the note was added to'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      authorId: z.string().optional().describe('ID of the user who created the note'),
      authorName: z.string().optional().describe('Name of the user who created the note'),
      authorEmail: z.string().optional().describe('Email of the user who created the note'),
      body: z.string().optional().describe('Content of the note'),
      createdAt: z.string().optional().describe('Timestamp of note creation'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      noteId: z.string().optional().describe('ID of the note'),
      conversationId: z.string().describe('ID of the conversation'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      authorId: z.string().optional().describe('ID of the note author'),
      authorName: z.string().optional().describe('Name of the note author'),
      authorEmail: z.string().optional().describe('Email of the note author'),
      body: z.string().optional().describe('Content of the note'),
      createdAt: z.string().optional().describe('Timestamp of creation')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: Record<string, any>) => {
        let note = event.note ?? event.data ?? event;
        let author = note.author ?? note.created_by ?? {};
        let conversationId = String(
          note.conversation_id ?? event.conversation_id ?? event.id ?? ''
        );

        return {
          eventId: event.event_id ?? event.id ?? `note-${conversationId}-${Date.now()}`,
          noteId: note.id ? String(note.id) : undefined,
          conversationId,
          inboxId: note.inbox_id ? String(note.inbox_id) : undefined,
          authorId: author.id ? String(author.id) : undefined,
          authorName: author.name,
          authorEmail: author.email,
          body: note.body ?? note.content ?? note.text,
          createdAt: note.created_at ?? event.timestamp ?? new Date().toISOString(),
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'note.created',
        id: ctx.input.eventId,
        output: {
          noteId: ctx.input.noteId,
          conversationId: ctx.input.conversationId,
          inboxId: ctx.input.inboxId,
          authorId: ctx.input.authorId,
          authorName: ctx.input.authorName,
          authorEmail: ctx.input.authorEmail,
          body: ctx.input.body,
          createdAt: ctx.input.createdAt
        }
      };
    }
  });
