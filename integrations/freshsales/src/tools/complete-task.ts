import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let completeTask = SlateTool.create(spec, {
  name: 'Complete Task',
  key: 'complete_task',
  description: `Mark a Freshsales task as done by setting its status to completed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to mark as done')
    })
  )
  .output(
    z.object({
      taskId: z.number(),
      status: z.number().nullable().optional(),
      completed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let task = await client.completeTask(ctx.input.taskId);

    return {
      output: {
        taskId: task.id,
        status: task.status,
        completed: task.status === 1
      },
      message: `Task **${task.title || task.id}** marked as done.`
    };
  })
  .build();
