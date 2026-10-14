import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks in Follow Up Boss. Supports filtering by person, assigned user, completion status, and due date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Filter by contact ID'),
      assignedTo: z.number().optional().describe('Filter by assigned user ID'),
      completed: z.boolean().optional().describe('Filter by completion status'),
      dueDate: z.string().optional().describe('Filter by a UTC due date in YYYY-MM-DD format'),
      sort: z.string().optional().describe('Sort field'),
      limit: z.number().optional().describe('Number of results (default 25, max 100)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.number(),
          personId: z.number().optional(),
          assignedTo: z.number().optional(),
          name: z.string().optional(),
          dueDate: z.string().optional(),
          completed: z.boolean().optional(),
          created: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};
    if (ctx.input.personId) params.personId = ctx.input.personId;
    if (ctx.input.assignedTo) params.assignedUserId = ctx.input.assignedTo;
    if (ctx.input.completed !== undefined) params.isCompleted = ctx.input.completed;
    if (ctx.input.dueDate !== undefined) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(ctx.input.dueDate) ||
        !Number.isFinite(Date.parse(ctx.input.dueDate))
      ) {
        throw createApiServiceError('Provide dueDate in YYYY-MM-DD format.');
      }
      params.dueStart = `${ctx.input.dueDate}T00:00:00Z`;
      params.dueEnd = `${ctx.input.dueDate}T23:59:59Z`;
    }
    if (ctx.input.sort) params.sort = ctx.input.sort;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listTasks(params);
    let tasks = result.tasks || [];

    return {
      output: {
        tasks: tasks.map((t: any) => ({
          taskId: t.id,
          personId: t.personId,
          assignedTo: t.assignedUserId,
          name: t.name,
          dueDate: t.dueDate,
          completed:
            t.isCompleted === undefined || t.isCompleted === null
              ? undefined
              : t.isCompleted === true || t.isCompleted === 1,
          created: t.created
        })),
        total: result._metadata?.total
      },
      message: `Found **${tasks.length}** task(s)${result._metadata?.total ? ` of ${result._metadata.total} total` : ''}.`
    };
  })
  .build();
