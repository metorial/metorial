import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTaskTool = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Get a task by ID, including its deadline, responsible user, linked entity, completion state, and result.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z.number().int().positive().describe('Task ID from list_tasks or create_task')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || (ctx.config as { subdomain?: string }).subdomain
    });
    let task = await client.getTask(ctx.input.taskId);
    return { output: mapTask(task), message: `Retrieved task **${task.id}**.` };
  })
  .build();
