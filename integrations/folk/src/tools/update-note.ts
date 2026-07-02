import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Updates an existing note's content or visibility.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to update'),
      content: z.string().optional().describe('Updated note content'),
      visibility: z.enum(['public', 'private']).optional().describe('Updated visibility')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the updated note'),
      content: z.string().describe('Updated content'),
      visibility: z.string().describe('Updated visibility')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, unknown> = {};
    if (ctx.input.content !== undefined) input.content = ctx.input.content;
    if (ctx.input.visibility !== undefined) input.visibility = ctx.input.visibility;

    let note = await client.updateNote(ctx.input.noteId, input);

    return {
      output: {
        noteId: note.id,
        content: note.content,
        visibility: note.visibility
      },
      message: `Updated note ${note.id}`
    };
  })
  .build();
