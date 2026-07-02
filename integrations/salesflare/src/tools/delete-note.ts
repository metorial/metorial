import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Internal Note',
  key: 'delete_note',
  description: `Permanently delete an internal note from an account's timeline in Salesflare.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.number().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteNote(ctx.input.noteId);

    return {
      output: { success: true },
      message: `Deleted internal note **${ctx.input.noteId}**.`
    };
  })
  .build();
