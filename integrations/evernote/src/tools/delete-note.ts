import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteNoteTool = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Move a note to the trash. The note can be recovered from trash by the user. Permanent deletion (expunge) is not available to third-party integrations.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteGuid: z.string().describe('GUID of the note to move to trash')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('GUID of the deleted note'),
      updateSequenceNum: z.number().describe('Update sequence number after deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let usn = await client.deleteNote(ctx.input.noteGuid);

    return {
      output: {
        noteGuid: ctx.input.noteGuid,
        updateSequenceNum: usn
      },
      message: `Moved note \`${ctx.input.noteGuid}\` to trash.`
    };
  })
  .build();
