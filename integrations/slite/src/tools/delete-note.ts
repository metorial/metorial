import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently delete a note and all of its children. This action is **irreversible** — the note and all nested content will be permanently removed.`,
  constraints: [
    'This action is irreversible. The note and all child notes will be permanently deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the note was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.deleteNote(ctx.input.noteId);

    return {
      output: {
        deleted: true
      },
      message: `Permanently deleted note \`${ctx.input.noteId}\` and all its children`
    };
  })
  .build();
