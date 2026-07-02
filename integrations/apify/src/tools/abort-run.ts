import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import { mapRun } from './shared';

export let abortRun = SlateTool.create(spec, {
  name: 'Abort Run',
  key: 'abort_run',
  description: `Abort a running Apify Actor execution. Use graceful abort when the Actor should receive an abort signal before forceful termination.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      runId: z.string().describe('Actor run ID to abort'),
      gracefully: z
        .boolean()
        .optional()
        .describe('If true, ask Apify to abort gracefully when supported by the Actor')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Actor run ID'),
      actorId: z.string().optional().describe('Actor ID'),
      status: z.string().optional().describe('Updated run status'),
      startedAt: z.string().optional(),
      finishedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let run = await client.abortRun(ctx.input.runId, { gracefully: ctx.input.gracefully });
    let output = mapRun(run);

    return {
      output,
      message: `Abort requested for run \`${output.runId}\`. Status: **${output.status}**.`
    };
  })
  .build();
