import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { positiveIntegerSchema } from '../lib/schemas';
import { mapTaskSummary, taskSummarySchema } from '../lib/tasks';
import { spec } from '../spec';

export let listUserTasks = SlateTool.create(spec, {
  name: 'List User Tasks',
  key: 'list_user_tasks',
  description:
    'List tasks assigned to a user across BugHerd projects. Call list_users to discover user IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: positiveIntegerSchema.describe('User ID from list_users'),
      priority: z
        .enum(['not set', 'critical', 'important', 'normal', 'minor'])
        .optional()
        .describe('Filter by priority'),
      tag: z.string().optional().describe('Filter by tag name'),
      assignedToId: positiveIntegerSchema
        .optional()
        .describe('Filter by assignee user ID from list_users'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return tasks updated after this timestamp'),
      createdSince: z
        .string()
        .optional()
        .describe('Only return tasks created after this timestamp'),
      page: positiveIntegerSchema
        .optional()
        .describe('Page number starting at 1 (up to 100 tasks per page)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSummarySchema).describe('Tasks assigned to the user'),
      totalCount: z.number().describe('Total number of matching tasks across all pages')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new BugherdClient(ctx.auth.token).getUserTasks(
      ctx.input.userId,
      ctx.input
    );
    let tasks = result.tasks.map(mapTaskSummary);
    return {
      output: { tasks, totalCount: result.meta?.count ?? tasks.length },
      message: `Found **${tasks.length}** task(s) assigned to user ${ctx.input.userId}.`
    };
  })
  .build();
