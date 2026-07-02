import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNote = SlateTool.create(spec, {
  name: 'Manage Note',
  key: 'manage_note',
  description: `Create, update, or delete a research note in Dovetail. Notes capture interview summaries, research observations, and qualitative data. Use this to create new notes with content and fields, update existing note content, or delete notes (moved to trash for 30 days).`,
  instructions: [
    'To create a note, provide title and/or content. At least one of title, content, or fields must be provided.',
    'To update a note, provide the noteId along with the fields to update.',
    'To delete a note, provide the noteId and set action to "delete".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      noteId: z.string().optional().describe('Note ID (required for update and delete)'),
      title: z.string().optional().describe('Note title'),
      content: z.string().optional().describe('Note content body'),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Field label (must match an existing field)'),
            value: z.string().optional().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields to set on the note')
    })
  )
  .output(
    z.object({
      noteId: z.string(),
      title: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let note = await client.createNote({
        title: ctx.input.title,
        content: ctx.input.content,
        fields: ctx.input.fields
      });
      return {
        output: {
          noteId: note.id,
          title: note.title,
          createdAt: note.created_at,
          updatedAt: note.updated_at
        },
        message: `Created note **${note.title || 'Untitled'}** (ID: ${note.id}).`
      };
    }

    if (!ctx.input.noteId) {
      throw new Error('noteId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      let note = await client.updateNote(ctx.input.noteId, {
        title: ctx.input.title,
        content: ctx.input.content,
        fields: ctx.input.fields
      });
      return {
        output: {
          noteId: note.id,
          title: note.title,
          updatedAt: note.updated_at
        },
        message: `Updated note **${note.title || ctx.input.noteId}**.`
      };
    }

    // delete
    let result = await client.deleteNote(ctx.input.noteId);
    return {
      output: {
        noteId: result.id,
        title: result.title,
        deleted: true
      },
      message: `Deleted note **${result.title || ctx.input.noteId}**. It can be restored from trash within 30 days.`
    };
  })
  .build();
