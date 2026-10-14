import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageNote = SlateTool.create(spec, {
  name: 'Manage Note',
  key: 'manage_note',
  description: `Create, update, or delete a research note in Dovetail. Notes capture interview summaries, research observations, and qualitative data. Create notes with initial content and fields, update titles and custom fields, or delete notes (moved to trash for 30 days).`,
  instructions: [
    'To create a note, provide projectId from list_projects and optionally title, initial content, or fields.',
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
      projectId: projectIdSchema
        .optional()
        .describe('Project ID from list_projects (required for create).'),
      title: z.string().optional().describe('Note title'),
      content: z
        .string()
        .optional()
        .describe('Initial note content body (create only; the API cannot patch content).'),
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
      if (!ctx.input.projectId)
        throw createApiServiceError(
          'projectId from list_projects is required to create a note.'
        );
      let note = await client.createNote({
        projectId: ctx.input.projectId,
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
      throw createApiServiceError('noteId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      if (ctx.input.content !== undefined)
        throw createApiServiceError(
          'Dovetail cannot patch note content. Update the title or custom fields, or create a new note with initial content.'
        );
      if (ctx.input.title === undefined && !ctx.input.fields?.length)
        throw createApiServiceError('Provide a title or custom fields to update the note.');
      let note = await client.updateNote(ctx.input.noteId, {
        title: ctx.input.title,
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
