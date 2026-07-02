import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently deletes a note. This action cannot be undone.`,
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
      noteId: z.string().describe('ID of the deleted note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteNote(ctx.input.noteId);

    return {
      output: {
        noteId: result.id
      },
      message: `Deleted note ${result.id}`
    };
  })
  .build();
