import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelRun = SlateTool.create(spec, {
  name: 'Cancel Run',
  key: 'cancel_run',
  description: `Request cancellation of a PENDING or RUNNING project run. The acknowledgement does not prove the run has stopped; check its status afterward.`,
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
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    });
    await client.cancelRun(ctx.input.projectId, ctx.input.runId);

    return {
      output: { cancelled: true },
      message: `Hex accepted cancellation of run **${ctx.input.runId}** for project ${ctx.input.projectId}. Check its status to confirm it stopped.`
    };
  })
  .build();
