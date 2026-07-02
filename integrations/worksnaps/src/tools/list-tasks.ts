import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve all tasks within a specific project. Optionally includes task assignment details showing which users are assigned to each task.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project to list tasks for'),
      includeTaskAssignments: z
        .boolean()
        .optional()
        .describe('Include task assignment details for each task')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of tasks in the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let tasks = await client.listTasks(ctx.input.projectId, ctx.input.includeTaskAssignments);

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s) in project **${ctx.input.projectId}**.`
    };
  })
  .build();
