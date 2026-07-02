import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelTask = SlateTool.create(spec, {
  name: 'Cancel Task',
  key: 'cancel_task',
  description: `Cancel a pending Scale AI task. Only tasks with status \`pending\` (queued, not yet in progress) can be canceled. Calling cancel on an already canceled task is idempotent.`,
  constraints: [
    'Only pending tasks that are queued (not yet in progress) can be canceled.',
    'Attempting to cancel a completed or in-progress task returns an error.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to cancel'),
      clearUniqueId: z
        .boolean()
        .optional()
        .describe('If true, removes the unique_id association so it can be reused')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('ID of the canceled task'),
        status: z.string().optional().describe('Updated status of the task')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.cancelTask(ctx.input.taskId, ctx.input.clearUniqueId);

    return {
      output: {
        taskId: result.task_id ?? ctx.input.taskId,
        status: result.status,
        ...result
      },
      message: `Canceled task **${ctx.input.taskId}**.`
    };
  })
  .build();
