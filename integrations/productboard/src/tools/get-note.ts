import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNoteTool = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a single note by its ID. Returns full note details including title, content, tags, and associated user information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('The ID of the note to retrieve')
    })
  )
  .output(
    z.object({
      note: z.record(z.string(), z.any()).describe('The note object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let note = await client.getNote(ctx.input.noteId);

    return {
      output: { note },
      message: `Retrieved note **${note.title || ctx.input.noteId}**.`
    };
  })
  .build();
