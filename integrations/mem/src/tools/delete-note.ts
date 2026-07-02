import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently delete a note from your Mem knowledge base by its ID.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('The UUID of the note to delete.')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('The request ID confirming the deletion.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.deleteNote(ctx.input.noteId);

    return {
      output: {
        requestId: response.request_id
      },
      message: `Deleted note \`${ctx.input.noteId}\`.`
    };
  })
  .build();
