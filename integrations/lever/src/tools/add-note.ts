import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addNoteTool = SlateTool.create(spec, {
  name: 'Add Note',
  key: 'add_note',
  description: `Add a note to an opportunity in Lever. Notes can be used to record internal feedback, observations, or any other relevant information about a candidate.`
})
  .input(
    z.object({
      opportunityId: z.string().describe('ID of the opportunity to add a note to'),
      value: z.string().describe('The note content (supports HTML)'),
      notifyFollowers: z
        .boolean()
        .optional()
        .describe('Whether to notify followers of the opportunity')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the created note'),
      note: z.any().describe('The full note object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let data: Record<string, any> = {
      value: ctx.input.value
    };
    if (ctx.input.notifyFollowers !== undefined) {
      data.notifyFollowers = ctx.input.notifyFollowers;
    }

    let result = await client.createNote(ctx.input.opportunityId, data);

    return {
      output: {
        noteId: result.data.id,
        note: result.data
      },
      message: `Added note to opportunity **${ctx.input.opportunityId}**.`
    };
  })
  .build();
