import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let cancelBuild = SlateTool.create(spec, {
  name: 'Cancel Build',
  key: 'cancel_build',
  description: `Cancel a running build. If the build has already finished, the API will indicate it was already completed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      buildId: z.string().describe('ID of the build to cancel')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('ID of the cancelled build'),
      status: z.string().describe('Result status: "cancelled" or "already_finished"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let result = await client.cancelBuild(ctx.input.buildId);

    return {
      output: {
        buildId: ctx.input.buildId,
        status: result.status
      },
      message:
        result.status === 'already_finished'
          ? `Build **${ctx.input.buildId}** had already finished.`
          : `Build **${ctx.input.buildId}** has been cancelled.`
    };
  })
  .build();
