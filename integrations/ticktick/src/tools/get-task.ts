import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a specific task by its ID from TickTick, including all details such as subtasks, reminders, tags, and completion status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve'),
      projectId: z.string().describe('ID of the project the task belongs to')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let task = await client.getTask(ctx.input.projectId, ctx.input.taskId);

    return {
      output: mapTask(task),
      message: `Retrieved task **${task.title}** (priority: ${task.priority}, status: ${task.status === 2 ? 'completed' : 'active'}).`
    };
  })
  .build();
