import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { positiveIntegerSchema } from '../lib/schemas';
import { spec } from '../spec';

export let moveTasks = SlateTool.create(spec, {
  name: 'Move Tasks',
  key: 'move_tasks',
  description: `Move one or more tasks from one BugHerd project to another in bulk. Use project-scoped local task IDs returned by list_tasks or get_task.`,
  constraints: [
    'Bulk moves may be unavailable for some accounts. Contact BugHerd support if the API returns 404.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceProjectId: positiveIntegerSchema.describe('Project ID to move tasks from'),
      taskIds: z
        .array(positiveIntegerSchema)
        .min(1)
        .describe(
          'Project-scoped local task IDs to move (localTaskId from list_tasks or get_task)'
        ),
      targetProjectId: positiveIntegerSchema.describe('Project ID to move tasks to')
    })
  )
  .output(
    z.object({
      moved: z.boolean().describe('Whether the tasks were successfully moved'),
      taskCount: z.number().describe('Number of tasks moved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    await client.moveTasks(
      ctx.input.sourceProjectId,
      ctx.input.taskIds,
      ctx.input.targetProjectId
    );

    return {
      output: {
        moved: true,
        taskCount: ctx.input.taskIds.length
      },
      message: `Moved **${ctx.input.taskIds.length}** task(s) from project ${ctx.input.sourceProjectId} to project ${ctx.input.targetProjectId}.`
    };
  })
  .build();
