import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getNote = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a note by its ID from Salesmate.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to retrieve')
    })
  )
  .output(
    z.object({
      note: z.record(z.string(), z.unknown()).describe('Full note record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getNote(ctx.input.noteId);
    let note = result?.Data ?? result;

    return {
      output: { note },
      message: `Retrieved note \`${ctx.input.noteId}\`.`
    };
  })
  .build();
