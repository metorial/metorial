import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Search and list tasks in JobNimbus. Supports filtering by completion status, associated contact/job, and more. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parentRecordId: z
        .string()
        .optional()
        .describe('Filter tasks by the parent contact or job ID'),
      isCompleted: z
        .boolean()
        .optional()
        .describe('Filter by completion status (true for completed, false for open)'),
      from: z.number().optional().describe('Pagination offset (0-based). Defaults to 0.'),
      size: z
        .number()
        .optional()
        .describe('Number of results per page. Defaults to 25. Max 200.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching tasks'),
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Unique JobNimbus ID of the task'),
            title: z.string().optional().describe('Task title'),
            description: z.string().optional().describe('Task description'),
            number: z.string().optional().describe('Task number'),
            priority: z.string().optional().describe('Task priority'),
            isCompleted: z.boolean().optional().describe('Whether the task is completed'),
            parentRecordId: z.string().optional().describe('Parent contact/job ID'),
            owners: z.array(z.string()).optional().describe('Assignee IDs'),
            tags: z.array(z.string()).optional().describe('Tags'),
            dateStart: z.number().optional().describe('Unix timestamp of start date'),
            dateEnd: z.number().optional().describe('Unix timestamp of due date'),
            dateCreated: z.number().optional().describe('Unix timestamp of creation'),
            dateUpdated: z.number().optional().describe('Unix timestamp of last update'),
            createdByName: z.string().optional().describe('Name of the creator')
          })
        )
        .describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mustClauses: any[] = [];

    if (ctx.input.parentRecordId) {
      mustClauses.push({ term: { primary: ctx.input.parentRecordId } });
    }
    if (ctx.input.isCompleted !== undefined) {
      mustClauses.push({ term: { is_completed: ctx.input.isCompleted } });
    }

    let filter = mustClauses.length > 0 ? { must: mustClauses } : undefined;

    let result = await client.listTasks({
      from: ctx.input.from,
      size: ctx.input.size,
      filter
    });

    let tasks = (result.results || []).map((t: any) => ({
      taskId: t.jnid,
      title: t.title,
      description: t.description,
      number: t.number,
      priority: t.priority != null ? String(t.priority) : undefined,
      isCompleted: t.is_completed,
      parentRecordId: t.primary,
      owners: t.owners,
      tags: t.tags,
      dateStart: t.date_start,
      dateEnd: t.date_end,
      dateCreated: t.date_created,
      dateUpdated: t.date_updated,
      createdByName: t.created_by_name
    }));

    return {
      output: {
        totalCount: result.count || 0,
        tasks
      },
      message: `Found **${result.count || 0}** tasks. Returned ${tasks.length} results.`
    };
  })
  .build();
