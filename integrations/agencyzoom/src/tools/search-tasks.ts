import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTasks = SlateTool.create(spec, {
  name: 'Search Tasks',
  key: 'search_tasks',
  description: `Search and list tasks in AgencyZoom. Filter by status, type, assignee, date range, or associated lead/customer. Returns paginated results with task details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter tasks by title or content'),
      status: z.enum(['open', 'completed']).optional().describe('Filter by task status'),
      type: z
        .enum(['to-do', 'email', 'call', 'meeting'])
        .optional()
        .describe('Filter by task type'),
      assigneeId: z.string().optional().describe('Filter tasks by assignee ID'),
      fromDate: z
        .string()
        .optional()
        .describe('Start date for filtering tasks (ISO date string, e.g. "2024-01-01")'),
      toDate: z
        .string()
        .optional()
        .describe('End date for filtering tasks (ISO date string, e.g. "2024-12-31")'),
      leadId: z.string().optional().describe('Filter tasks associated with a specific lead'),
      customerId: z
        .string()
        .optional()
        .describe('Filter tasks associated with a specific customer'),
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of tasks to return')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Unique task identifier'),
            title: z.string().describe('Task title'),
            type: z.string().describe('Task type (to-do, email, call, meeting)'),
            status: z.string().describe('Task status (open, completed)'),
            assignee: z.any().optional().describe('Assignee information'),
            dueDate: z.string().optional().describe('Task due date'),
            leadId: z.string().optional().describe('Associated lead ID'),
            customerId: z.string().optional().describe('Associated customer ID'),
            createdAt: z.string().optional().describe('Task creation timestamp')
          })
        )
        .describe('Array of matching tasks'),
      total: z.number().describe('Total number of tasks matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let params: Record<string, any> = {};
    if (ctx.input.search !== undefined) params.search = ctx.input.search;
    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.type !== undefined) params.type = ctx.input.type;
    if (ctx.input.assigneeId !== undefined) params.assigneeId = ctx.input.assigneeId;
    if (ctx.input.fromDate !== undefined) params.fromDate = ctx.input.fromDate;
    if (ctx.input.toDate !== undefined) params.toDate = ctx.input.toDate;
    if (ctx.input.leadId !== undefined) params.leadId = ctx.input.leadId;
    if (ctx.input.customerId !== undefined) params.customerId = ctx.input.customerId;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    let result = await client.searchTasks(params);

    let items = Array.isArray(result)
      ? result
      : (result.data ?? result.tasks ?? result.items ?? []);
    let total = typeof result.total === 'number' ? result.total : items.length;

    let tasks = items.map((t: any) => ({
      taskId: t.taskId ?? t.id ?? '',
      title: t.title ?? t.name ?? '',
      type: t.type ?? '',
      status: t.status ?? '',
      assignee: t.assignee ?? t.assignedTo ?? undefined,
      dueDate: t.dueDate ?? t.due_date ?? undefined,
      leadId: t.leadId ?? t.lead_id ?? undefined,
      customerId: t.customerId ?? t.customer_id ?? undefined,
      createdAt: t.createdAt ?? t.created_at ?? undefined
    }));

    return {
      output: { tasks, total },
      message: `Found **${total}** task(s).${tasks.length < total ? ` Showing ${tasks.length}.` : ''}`
    };
  })
  .build();
