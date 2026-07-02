import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addSessionNote = SlateTool.create(spec, {
  name: 'Add Session Note',
  key: 'add_session_note',
  description: `Add a note to a visitor session. Notes can be used to annotate sessions with additional context, comments, or observations from your team.`
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID of the visitor session to add a note to'),
      content: z.string().describe('Text content of the note to add')
    })
  )
  .output(
    z.object({
      note: z.record(z.string(), z.unknown()).describe('The created note data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let note = await client.addSessionNote(ctx.input.sessionId, ctx.input.content);

    return {
      output: {
        note
      },
      message: `Added note to session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();
