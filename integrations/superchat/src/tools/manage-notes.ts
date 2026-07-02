import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.string().describe('Unique note identifier'),
  content: z.string().describe('Note content'),
  authorId: z.string().optional().describe('ID of the note author'),
  authorName: z.string().optional().describe('Name of the note author'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapNote = (note: any) => ({
  noteId: note.id,
  content: note.content,
  authorId: note.author?.id,
  authorName: note.author?.name,
  createdAt: note.created_at,
  updatedAt: note.updated_at
});

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Add an internal note to a conversation for team collaboration. Notes are not visible to contacts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to add the note to'),
      content: z.string().describe('Note content text')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.createNote(ctx.input.conversationId, ctx.input.content);

    return {
      output: mapNote(result),
      message: `Note created in conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List all internal notes within a conversation with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation'),
      limit: z.number().optional().describe('Maximum number of notes to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).describe('List of notes'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.listNotes(ctx.input.conversationId, {
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let notes = (result.results || []).map(mapNote);

    return {
      output: {
        notes,
        pagination: result.pagination
      },
      message: `Retrieved **${notes.length}** note(s) from conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update the content of an existing internal note in a conversation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation containing the note'),
      noteId: z.string().describe('ID of the note to update'),
      content: z.string().describe('Updated note content')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.updateNote(
      ctx.input.conversationId,
      ctx.input.noteId,
      ctx.input.content
    );

    return {
      output: mapNote(result),
      message: `Note \`${ctx.input.noteId}\` updated in conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Delete an internal note from a conversation. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation containing the note'),
      noteId: z.string().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the deleted note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    await client.deleteNote(ctx.input.conversationId, ctx.input.noteId);

    return {
      output: {
        noteId: ctx.input.noteId
      },
      message: `Note \`${ctx.input.noteId}\` deleted from conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();
