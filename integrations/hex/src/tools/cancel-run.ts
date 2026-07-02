import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelRun = SlateTool.create(spec, {
  name: 'Cancel Run',
  key: 'cancel_run',
  description: `Cancel an active project run. Only runs with PENDING or RUNNING status can be cancelled.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project'),
      runId: z.string().describe('UUID of the run to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await client.cancelRun(ctx.input.projectId, ctx.input.runId);

    return {
      output: { cancelled: true },
      message: `Cancelled run **${ctx.input.runId}** for project ${ctx.input.projectId}.`
    };
  })
  .build();
