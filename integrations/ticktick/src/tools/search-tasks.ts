import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, projectIdSchema, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchTasks = SlateTool.create(spec, {
  name: 'Search Tasks',
  key: 'search_tasks',
  description:
    'Find TickTick tasks by text, project, tags, completion status, and due dates. Call list_projects to discover project IDs when limiting the search to particular lists.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      keywords: z
        .string()
        .optional()
        .describe('Text to search for. A supplied blank value returns no tasks.'),
      projectIds: z
        .array(projectIdSchema)
        .optional()
        .describe('Project IDs to search; call list_projects to discover them'),
      tags: z.array(z.string()).optional().describe('Tags to filter by'),
      status: z
        .array(z.number().int())
        .optional()
        .describe('Task status codes, such as 0 for active or 2 for completed'),
      dueFrom: z
        .string()
        .optional()
        .describe(
          'Include tasks due on or after this date-time, for example 2026-07-01T00:00:00+0000'
        ),
      dueTo: z
        .string()
        .optional()
        .describe(
          'Include tasks due on or before this date-time, for example 2026-07-31T23:59:59+0000'
        )
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema),
      totalCount: z.number().describe('Number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let tasks = await new Client({ token: ctx.auth.token }).searchTasks(ctx.input);
    return {
      output: { tasks: tasks.map(mapTask), totalCount: tasks.length },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
