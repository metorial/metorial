import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve all tasks for a given project. Optionally filter by completion status. Returns a summary list with task IDs and names. Use **Get Task** for full task details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project whose tasks to list'),
      complete: z
        .boolean()
        .optional()
        .describe(
          'Filter by completion status. true = completed tasks only, false = incomplete tasks only, omit = all tasks'
        )
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string().describe('Unique task identifier'),
          taskName: z.string().describe('Name of the task')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tasks = await client.listTasks(ctx.input.projectId, ctx.input.complete);

    let mapped = (Array.isArray(tasks) ? tasks : []).map((t: any) => ({
      taskId: t.taskId ?? '',
      taskName: t.taskName ?? ''
    }));

    return {
      output: { tasks: mapped },
      message: `Found **${mapped.length}** task(s) in project ${ctx.input.projectId}.`
    };
  })
  .build();
