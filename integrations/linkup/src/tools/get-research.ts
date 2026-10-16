import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { researchTaskSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getResearch = SlateTool.create(spec, {
  name: 'Get Research',
  key: 'get_research',
  description:
    'Retrieve a research task and its current status, sourced answer or structured output, and any task failure. Get a task ID from create_research or list_research.',
  instructions: [
    'Pending and processing tasks are still running. Poll after at least two seconds, increasing the interval up to ten seconds for longer tasks.',
    'Stop polling when status is completed or failed. A failed task includes error details.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      researchId: z
        .string()
        .min(1)
        .describe('Research task ID returned by create_research or list_research')
    })
  )
  .output(researchTaskSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getResearch(ctx.input.researchId);
    return {
      output: result,
      message: `Research task **${result.id}** is **${result.status}**.${result.error ? ` ${result.error}` : ''}`
    };
  })
  .build();
