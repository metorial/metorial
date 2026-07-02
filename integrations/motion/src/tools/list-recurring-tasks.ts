import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listRecurringTasks = SlateTool.create(spec, {
  name: 'List Recurring Tasks',
  key: 'list_recurring_tasks',
  description: `List all recurring tasks for a given workspace. Returns paginated results with task details, assignees, and scheduling information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to list recurring tasks from'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      recurringTasks: z
        .array(
          z.object({
            recurringTaskId: z.string().describe('ID of the recurring task'),
            name: z.string().describe('Title of the recurring task'),
            priority: z.string().optional().describe('Priority level'),
            status: z.any().optional().describe('Task status'),
            assignee: z.any().optional().describe('Assigned user'),
            creator: z.any().optional().describe('Creator details'),
            labels: z.array(z.any()).optional().describe('Labels'),
            project: z.any().optional().describe('Associated project'),
            customFieldValues: z.any().optional().describe('Custom field values')
          })
        )
        .describe('List of recurring tasks'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      pageSize: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let result = await client.listRecurringTasks({
      workspaceId: ctx.input.workspaceId,
      cursor: ctx.input.cursor
    });

    let recurringTasks = (result.tasks || []).map((t: any) => ({
      recurringTaskId: t.id,
      name: t.name,
      priority: t.priority,
      status: t.status,
      assignee: t.assignee,
      creator: t.creator,
      labels: t.labels,
      project: t.project,
      customFieldValues: t.customFieldValues
    }));

    return {
      output: {
        recurringTasks,
        nextCursor: result.meta?.nextCursor,
        pageSize: result.meta?.pageSize
      },
      message: `Found **${recurringTasks.length}** recurring task(s)`
    };
  })
  .build();
