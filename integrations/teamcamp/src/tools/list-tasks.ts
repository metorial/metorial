import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredString, requireRecords } from '../lib/response';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Call list_projects to discover project IDs. Retrieve all tasks for a given project. Optionally filter by completion status. Returns a summary list with task IDs and names. Use **Get Task** for full task details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
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
      raw: z
        .unknown()
        .optional()
        .describe(
          'Complete provider response, including values without a compatible summary field'
        ),
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

    let mapped = requireRecords(tasks).map(item => ({
      taskId: requiredString(item.taskId, 'taskId'),
      taskName: requiredString(item.taskName, 'taskName')
    }));

    return {
      output: { tasks: mapped, raw: tasks },
      message: `Found **${mapped.length}** task(s) in project ${ctx.input.projectId}.`
    };
  })
  .build();
