import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNote = SlateTool.create(spec, {
  name: 'Manage Note',
  key: 'manage_note',
  description:
    'Retrieve, edit, or permanently delete an existing Pipeline CRM note. Call list_notes to find note IDs. Deletion cannot be undone.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete']).describe('Operation to perform'),
      noteId: z.number().int().positive().describe('Note ID from list_notes or create_note'),
      content: z.string().optional().describe('Updated note content; update only'),
      title: z.string().optional().describe('Updated note title; update only'),
      noteCategoryId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Updated configured note category ID; update only'),
      notifyUserIds: z
        .array(z.number().int().positive())
        .optional()
        .describe('User IDs to notify when new comments are added; update only')
    })
  )
  .output(
    z.object({
      action: z.enum(['get', 'update', 'delete']).describe('Operation performed'),
      noteId: z.number().describe('Note ID'),
      deleted: z.boolean().describe('Whether the note was deleted'),
      title: z.string().nullable().optional().describe('Note title'),
      content: z.string().nullable().optional().describe('Note content'),
      dealId: z.number().nullable().optional().describe('Associated deal ID'),
      personId: z.number().nullable().optional().describe('Associated person ID'),
      companyId: z.number().nullable().optional().describe('Associated company ID'),
      noteCategoryId: z.number().nullable().optional().describe('Note category ID'),
      userId: z.number().nullable().optional().describe('Note owner user ID'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let changes = pickDefined({
      content: ctx.input.content,
      title: ctx.input.title,
      note_category_id: ctx.input.noteCategoryId,
      notify_user_ids: ctx.input.notifyUserIds
    });
    if (ctx.input.action === 'update' && Object.keys(changes).length === 0) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    if (ctx.input.action !== 'update' && Object.keys(changes).length > 0) {
      throw createApiServiceError('Note fields are only accepted for the update action.');
    }
    let client = new Client(ctx.auth);
    if (ctx.input.action === 'delete') {
      await client.deleteNote(ctx.input.noteId);
      return {
        output: { action: ctx.input.action, noteId: ctx.input.noteId, deleted: true },
        message: `Deleted note (ID: **${ctx.input.noteId}**)`
      };
    }
    let note =
      ctx.input.action === 'get'
        ? await client.getNote(ctx.input.noteId)
        : await client.updateNote(ctx.input.noteId, changes);
    return {
      output: {
        action: ctx.input.action,
        noteId: note.id,
        deleted: false,
        title: note.title ?? null,
        content: note.content ?? null,
        dealId: note.deal_id ?? null,
        personId: note.person_id ?? null,
        companyId: note.company_id ?? null,
        noteCategoryId: note.note_category_id ?? null,
        userId: note.user_id ?? null,
        createdAt: note.created_at ?? null,
        updatedAt: note.updated_at ?? null
      },
      message: `${ctx.input.action === 'get' ? 'Retrieved' : 'Updated'} note (ID: **${note.id}**)`
    };
  })
  .build();
