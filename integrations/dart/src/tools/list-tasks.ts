import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { conciseTaskSchema } from '../lib/types';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Lists and filters tasks across dartboards. Supports filtering by assignee, dartboard, status, priority, tag, completion state, date ranges, and more. Returns paginated results with support for custom ordering.`,
  instructions: [
    'By default, Dart applies default filters (e.g., excluding completed tasks). Set noDefaults to true to disable this.',
    'For ordering, use field names like "created_at", "-created_at" (descending), "updated_at", "title", etc.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      assignee: z.string().optional().describe('Filter by assignee name or email'),
      dartboard: z.string().optional().describe('Filter by dartboard name'),
      status: z.string().optional().describe('Filter by status name'),
      priority: z
        .string()
        .optional()
        .describe('Filter by priority (Critical, High, Medium, Low)'),
      tag: z.string().optional().describe('Filter by tag name'),
      isCompleted: z.boolean().optional().describe('Filter by completion status'),
      dueDateBefore: z.string().optional().describe('Tasks due before this date (ISO 8601)'),
      dueDateAfter: z.string().optional().describe('Tasks due after this date (ISO 8601)'),
      createdAtAfter: z
        .string()
        .optional()
        .describe('Tasks created after this date (ISO 8601)'),
      createdAtBefore: z
        .string()
        .optional()
        .describe('Tasks created before this date (ISO 8601)'),
      updatedAtAfter: z
        .string()
        .optional()
        .describe('Tasks updated after this date (ISO 8601)'),
      updatedAtBefore: z
        .string()
        .optional()
        .describe('Tasks updated before this date (ISO 8601)'),
      parentId: z.string().optional().describe('Filter by parent task ID (for subtasks)'),
      title: z.string().optional().describe('Filter by title text'),
      inTrash: z.boolean().optional().describe('Include trashed tasks'),
      ordering: z
        .array(z.string())
        .optional()
        .describe('Ordering fields (e.g., ["-created_at", "title"])'),
      limit: z.number().optional().describe('Max results per page (default 25)'),
      offset: z.number().optional().describe('Pagination offset'),
      noDefaults: z.boolean().optional().describe('Disable default filters and sorting')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of matching tasks'),
      tasks: z.array(conciseTaskSchema).describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTasks(ctx.input);

    return {
      output: {
        count: result.count,
        tasks: result.results
      },
      message: `Found **${result.count}** task(s). Returned ${result.results.length} result(s).`
    };
  })
  .build();
