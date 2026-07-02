import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let cancelBuild = SlateTool.create(spec, {
  name: 'Cancel Build',
  key: 'cancel_build',
  description: `Cancels a running or queued build by its task ID. Use this to stop builds that are no longer needed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID of the build to cancel')
    })
  )
  .output(
    z
      .object({
        success: z.boolean().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.cancelBuild(ctx.input.taskId);

    return {
      output: result ?? { success: true },
      message: `Build task **${ctx.input.taskId}** has been canceled.`
    };
  })
  .build();
