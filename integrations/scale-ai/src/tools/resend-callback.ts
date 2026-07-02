import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resendCallback = SlateTool.create(spec, {
  name: 'Resend Task Callback',
  key: 'resend_callback',
  description: `Re-trigger the completion callback for a completed or errored Scale AI task. Useful when the original callback delivery failed or when you need to re-process the result.`,
  constraints: ['Only works for tasks that are completed or errored.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to resend the callback for')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('ID of the task'),
        success: z.boolean().describe('Whether the callback was re-triggered')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.resendTaskCallback(ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId,
        success: true,
        ...result
      },
      message: `Re-triggered callback for task **${ctx.input.taskId}**.`
    };
  })
  .build();
