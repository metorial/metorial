import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addNote = SlateTool.create(spec, {
  name: 'Add Note',
  key: 'add_note',
  description: `Add a note to a job or other record in ServiceM8. Notes appear in the job diary and can include text content linked to a specific job by UUID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobUuid: z.string().describe('UUID of the job to add the note to'),
      noteContent: z.string().describe('Text content of the note')
    })
  )
  .output(
    z.object({
      noteUuid: z.string().describe('UUID of the newly created note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let noteUuid = await client.createNote({
      related_object: 'job',
      related_object_uuid: ctx.input.jobUuid,
      note: ctx.input.noteContent
    });

    return {
      output: { noteUuid },
      message: `Added note to job **${ctx.input.jobUuid}**.`
    };
  })
  .build();
