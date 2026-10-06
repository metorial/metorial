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
      requestId: z
        .string()
        .describe('The request ID returned by the permanent deletion endpoint.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.deleteNote(ctx.input.noteId);

    return {
      output: {
        requestId: response.request_id
      },
      message:
        'Mem accepted the permanent note deletion. Read the exact note ID to verify retirement; deletion cannot be restored.'
    };
  })
  .build();
