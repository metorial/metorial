import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieve a task within a project, optionally including its assigned users. Call list_projects and list_tasks to discover the project and task IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .string()
        .min(1)
        .describe('Project ID. Call list_projects to discover available projects.'),
      taskId: z
        .string()
        .min(1)
        .describe('Task ID. Call list_tasks for tasks in the selected project.'),
      includeTaskAssignments: z
        .boolean()
        .optional()
        .describe('Include users assigned to the task')
    })
  )
  .output(z.object({ task: z.record(z.string(), z.unknown()).describe('Task details') }))
  .handleInvocation(async ctx => {
    let task = await new Client(ctx.auth.token).getTask(
      ctx.input.projectId,
      ctx.input.taskId,
      ctx.input.includeTaskAssignments
    );
    return { output: { task }, message: `Retrieved task **${ctx.input.taskId}**.` };
  })
  .build();
