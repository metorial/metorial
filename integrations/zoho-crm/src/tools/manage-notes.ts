import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNotes = SlateTool.create(spec, {
  name: 'Manage Notes',
  key: 'manage_notes',
  description: `List, create, or delete notes associated with a CRM record.
Set **action** to "list" to get notes, "create" to add a new note, or "delete" to remove a note.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      module: z
        .string()
        .describe('API name of the parent module (e.g. "Leads", "Contacts", "Deals")'),
      recordId: z.string().describe('ID of the parent record'),
      noteTitle: z
        .string()
        .optional()
        .describe('Title for the new note (required for "create")'),
      noteContent: z
        .string()
        .optional()
        .describe('Content body for the new note (required for "create")'),
      noteId: z
        .string()
        .optional()
        .describe('ID of the note to delete (required for "delete")'),
      page: z.number().optional().describe('Page number for listing notes'),
      perPage: z.number().optional().describe('Number of notes per page')
    })
  )
  .output(
    z.object({
      notes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of notes (for "list" action)'),
      createdNoteId: z
        .string()
        .optional()
        .describe('ID of the created note (for "create" action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the note was deleted (for "delete" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.getNotes(
        ctx.input.module,
        ctx.input.recordId,
        ctx.input.page,
        ctx.input.perPage
      );
      let notes = result?.data || [];
      return {
        output: { notes },
        message: `Retrieved **${notes.length}** note(s) for record **${ctx.input.recordId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createNote(
        ctx.input.module,
        ctx.input.recordId,
        ctx.input.noteTitle || '',
        ctx.input.noteContent || ''
      );
      let createdNoteId = result?.data?.[0]?.details?.id;
      return {
        output: { createdNoteId },
        message: `Created note **${createdNoteId}** on record **${ctx.input.recordId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteNote(ctx.input.module, ctx.input.recordId, ctx.input.noteId || '');
      return {
        output: { deleted: true },
        message: `Deleted note **${ctx.input.noteId}** from record **${ctx.input.recordId}**.`
      };
    }

    return {
      output: {},
      message: 'No action performed.'
    };
  })
  .build();
