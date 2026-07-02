import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks in Salesflare. Filter by assignees, task type, account, and search terms. Defaults to tasks assigned to the current user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Full-text search across task fields'),
      assigneeIds: z
        .array(z.number())
        .optional()
        .describe('Filter by assignee user IDs (defaults to current user)'),
      accountId: z.number().optional().describe('Filter by account ID'),
      type: z.array(z.string()).optional().describe('Filter by task type(s)'),
      limit: z.number().optional().default(20).describe('Max results to return'),
      offset: z.number().optional().default(0).describe('Pagination offset'),
      orderBy: z.array(z.string()).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      tasks: z.array(z.record(z.string(), z.any())).describe('List of task objects'),
      count: z.number().describe('Number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.assigneeIds) params.assignees = ctx.input.assigneeIds;
    if (ctx.input.accountId) params.account = ctx.input.accountId;
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.orderBy) params.order_by = ctx.input.orderBy;

    let tasks = await client.listTasks(params);
    let list = Array.isArray(tasks) ? tasks : [];

    return {
      output: {
        tasks: list,
        count: list.length
      },
      message: `Found **${list.length}** task(s).`
    };
  })
  .build();
