import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNoteContentTool = SlateTool.create(spec, {
  name: 'Get Note Content',
  key: 'get_note_content',
  description: `Retrieve only the ENML content body of a note. This is a lightweight alternative to **Get Note** when you only need the note body and not the metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteGuid: z.string().describe('GUID of the note to retrieve content for')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('GUID of the note'),
      content: z.string().describe('ENML content of the note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let content = await client.getNoteContent(ctx.input.noteGuid);

    return {
      output: {
        noteGuid: ctx.input.noteGuid,
        content
      },
      message: `Retrieved content for note \`${ctx.input.noteGuid}\` (${content.length} characters).`
    };
  })
  .build();
