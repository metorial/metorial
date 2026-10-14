import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description:
    'Permanently delete a note and its associated files from a contact. This operation cannot be undone through the API.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({ noteId: z.string().describe('Note ID; use list_notes to discover notes') })
  )
  .output(z.object({ noteId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deleteNote(ctx.input.noteId);
    return {
      output: { noteId: ctx.input.noteId, deleted: true },
      message: `Deleted note ${ctx.input.noteId}.`
    };
  })
  .build();
