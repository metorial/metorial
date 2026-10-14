import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTaskTool = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Inspect a background task, including execution status, outcome, schedule and associated bot or contact. Use list_resources with resourceType tasks to discover task IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z
        .string()
        .describe('Task ID. Call list_resources with resourceType tasks to discover IDs.')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      task: z
        .record(z.string(), z.any())
        .describe('Task details, including state and related resource IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, runAsUserId: ctx.config.runAsUserId });
    let task = await client.fetchTask(ctx.input.taskId);
    return {
      output: { taskId: task.id ?? ctx.input.taskId, task },
      message: `Retrieved task **${task.id ?? ctx.input.taskId}**.`
    };
  })
  .build();
