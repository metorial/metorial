import { SlateTool } from 'slates';
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
      dueDate: z.string().optional().describe('Filter by due date'),
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
    if (ctx.input.assignedTo) params.assignedTo = ctx.input.assignedTo;
    if (ctx.input.completed !== undefined) params.completed = ctx.input.completed;
    if (ctx.input.dueDate) params.dueDate = ctx.input.dueDate;
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
          assignedTo: t.assignedTo,
          name: t.name,
          dueDate: t.dueDate,
          completed: t.completed,
          created: t.created
        })),
        total: result._metadata?.total
      },
      message: `Found **${tasks.length}** task(s)${result._metadata?.total ? ` of ${result._metadata.total} total` : ''}.`
    };
  })
  .build();
