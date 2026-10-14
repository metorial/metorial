import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBatchTask = SlateTool.create(spec, {
  name: 'Delete Batch Task',
  key: 'delete_batch_task',
  description:
    'Delete an Eagle Doc batch processing task and its saved results, including failed or unfinished tasks. Retrieve any needed results with Check Batch Task before deleting.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      taskId: z.string().min(1).describe('Task ID returned by Submit Batch Processing')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      deleted: z.boolean().describe('Whether the provider accepted deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await client.deleteBatchTask(ctx.input.taskId);
    return {
      output: { taskId: ctx.input.taskId, deleted: true },
      message: `Batch task **${ctx.input.taskId}** deleted.`
    };
  })
  .build();
