import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageNote = SlateTool.create(spec, {
  name: 'Manage Note',
  key: 'manage_note',
  description: `Create or update a note in Freshsales. Notes can be attached to contacts, leads, accounts, or deals. Supports HTML content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z
        .number()
        .optional()
        .describe('ID of the note to update. Omit to create a new note.'),
      description: z.string().optional().describe('Note content (supports HTML)'),
      targetableId: z.number().optional().describe('ID of the associated record'),
      targetableType: z
        .enum(['Contact', 'Lead', 'SalesAccount', 'Deal'])
        .optional()
        .describe('Type of the associated record')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the note'),
      description: z.string().nullable().optional(),
      targetableType: z.string().nullable().optional(),
      targetableId: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let noteData: Record<string, any> = {};
    if (ctx.input.description !== undefined) noteData.description = ctx.input.description;
    if (ctx.input.targetableId !== undefined) noteData.targetable_id = ctx.input.targetableId;
    if (ctx.input.targetableType !== undefined)
      noteData.targetable_type = ctx.input.targetableType;

    let note: Record<string, any>;
    let action: string;

    if (ctx.input.noteId) {
      note = await client.updateNote(ctx.input.noteId, noteData);
      action = 'updated';
    } else {
      note = await client.createNote(noteData);
      action = 'created';
    }

    return {
      output: {
        noteId: note.id,
        description: note.description,
        targetableType: note.targetable_type,
        targetableId: note.targetable_id,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      },
      message: `Note **${note.id}** ${action} successfully.`
    };
  })
  .build();
