import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let copyNoteTool = SlateTool.create(spec, {
  name: 'Copy Note',
  key: 'copy_note',
  description: `Copy a note to a different notebook. Creates a new note with the same content, tags, and resources in the target notebook. The original note remains unchanged.`
})
  .input(
    z.object({
      noteGuid: z.string().describe('GUID of the note to copy'),
      toNotebookGuid: z.string().describe('GUID of the destination notebook')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('GUID of the newly created copy'),
      title: z.string().describe('Title of the copied note'),
      notebookGuid: z.string().describe('GUID of the destination notebook')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let note = await client.copyNote(ctx.input.noteGuid, ctx.input.toNotebookGuid);

    return {
      output: {
        noteGuid: note.noteGuid || '',
        title: note.title || '',
        notebookGuid: note.notebookGuid || ''
      },
      message: `Copied note **${note.title}** to notebook \`${note.notebookGuid}\`.`
    };
  })
  .build();
