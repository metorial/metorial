import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/tasks';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Get a task with its title, description, state, due date, assignees, and team. Call list_tasks to discover task IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ taskId: z.string().describe('Task ID from list_tasks or manage_tasks') }))
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).getTask(ctx.input.taskId);
    if (!data.tasks?.id)
      throw createApiServiceError('Missive did not return the requested task.');
    return { output: mapTask(data.tasks), message: `Retrieved task **${data.tasks.id}**.` };
  })
  .build();
