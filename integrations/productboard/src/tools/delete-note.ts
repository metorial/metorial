import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteNoteTool = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently delete a note from the Insights board. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('The ID of the note to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteNote(ctx.input.noteId);

    return {
      output: { success: true },
      message: `Deleted note **${ctx.input.noteId}**.`
    };
  })
  .build();
