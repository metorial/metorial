import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Delete a note from Salesmate by its ID. This action is permanent.`,
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
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteNote(ctx.input.noteId);

    return {
      output: { success: true },
      message: `Note \`${ctx.input.noteId}\` deleted.`
    };
  })
  .build();
