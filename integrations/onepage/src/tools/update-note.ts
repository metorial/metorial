import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { noteSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update an existing note's text, linked deal, or date. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to update'),
      text: z.string().optional().describe('Updated note content'),
      linkedDealId: z.string().optional().describe('ID of a deal to link the note to'),
      date: z.string().optional().describe('Updated note date (YYYY-MM-DD)')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let { noteId, ...updateData } = ctx.input;
    let note = await client.updateNote(noteId, updateData);

    return {
      output: note,
      message: `Updated note (${note.noteId}).`
    };
  })
  .build();
