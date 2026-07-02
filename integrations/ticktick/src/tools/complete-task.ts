import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let completeTask = SlateTool.create(spec, {
  name: 'Complete Task',
  key: 'complete_task',
  description: `Mark a task as complete in TickTick. Requires both the task ID and the project ID the task belongs to.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to complete'),
      projectId: z.string().describe('ID of the project the task belongs to')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the completed task'),
      projectId: z.string().describe('ID of the project'),
      completed: z.boolean().describe('Whether the task was successfully completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.completeTask(ctx.input.projectId, ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId,
        projectId: ctx.input.projectId,
        completed: true
      },
      message: `Marked task \`${ctx.input.taskId}\` as complete.`
    };
  })
  .build();
