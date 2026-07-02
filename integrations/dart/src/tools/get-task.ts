import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskSchema } from '../lib/types';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieves full details of a single task by its ID, including description, attachments, custom properties, and task relationships.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.getTask(ctx.input.taskId);

    return {
      output: task,
      message: `Retrieved task **${task.title}** (${task.status}) in **${task.dartboard}**. [View task](${task.htmlUrl})`
    };
  })
  .build();
