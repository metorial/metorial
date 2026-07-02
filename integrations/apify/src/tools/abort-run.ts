import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let abortRun = SlateTool.create(spec, {
  name: 'Abort Run',
  key: 'abort_run',
  description: `Abort a running Actor execution. Transitions the run to ABORTING and then ABORTED status. Use this to stop long-running or stuck Actors.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      runId: z.string().describe('ID of the Actor run to abort')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('ID of the aborted run'),
      status: z.string().describe('Updated run status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let run = await client.abortRun(ctx.input.runId);

    return {
      output: {
        runId: run.id,
        status: run.status
      },
      message: `Run \`${run.id}\` abort requested. Status: **${run.status}**.`
    };
  })
  .build();
