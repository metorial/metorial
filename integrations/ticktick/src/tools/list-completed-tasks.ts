import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, projectIdSchema, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCompletedTasks = SlateTool.create(spec, {
  name: 'List Completed Tasks',
  key: 'list_completed_tasks',
  description:
    'Retrieve completed TickTick tasks by project and completion-time range. Call list_projects to discover project IDs. Use filters to narrow the results.',
  constraints: [
    'TickTick returns at most 200 tasks per request; no pagination is documented.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectIds: z
        .array(projectIdSchema)
        .optional()
        .describe('Project IDs to filter by; call list_projects to discover them'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Inclusive earliest completion date-time, for example 2026-07-01T00:00:00+0000'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'Inclusive latest completion date-time, for example 2026-07-31T23:59:59+0000'
        )
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema),
      totalCount: z.number().describe('Number of tasks returned, not the total matching tasks')
    })
  )
  .handleInvocation(async ctx => {
    let tasks = await new Client({ token: ctx.auth.token }).listCompletedTasks(ctx.input);
    return {
      output: { tasks: tasks.map(mapTask), totalCount: tasks.length },
      message: `Retrieved **${tasks.length}** completed task(s).`
    };
  })
  .build();
