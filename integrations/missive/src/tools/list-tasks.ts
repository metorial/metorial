import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/tasks';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks filtered by organization, team, assignee, state, type, or due date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().optional().describe('Filter by organization ID'),
      teamId: z.string().optional().describe('Filter by team ID'),
      assigneeId: z.string().optional().describe('Filter by assignee user ID'),
      state: z
        .enum(['todo', 'in_progress', 'closed'])
        .optional()
        .describe('Filter by task state'),
      limit: z.number().min(1).max(200).optional().describe('Max tasks to return'),
      offset: z
        .number()
        .optional()
        .describe('Number of tasks to skip; fetched through cursor pagination'),
      until: z
        .number()
        .optional()
        .describe('Unix timestamp cursor; use the oldest lastActivityAt minus one'),
      type: z.enum(['task', 'conversation', 'all']).optional().describe('Task type filter'),
      conversationId: z.string().optional().describe('Parent conversation ID filter'),
      dueAtGteq: z.number().optional().describe('Earliest due date as Unix timestamp'),
      dueAtLteq: z.number().optional().describe('Latest due date as Unix timestamp')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema),
      nextUntil: z.number().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number | boolean> = {};

    if (ctx.input.organizationId) params.organization = ctx.input.organizationId;
    if (ctx.input.teamId) params.team = ctx.input.teamId;
    if (ctx.input.assigneeId) params.assignee = ctx.input.assigneeId;
    if (ctx.input.state) params.state = ctx.input.state;
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.conversationId) params.conversation = ctx.input.conversationId;
    if (ctx.input.dueAtGteq !== undefined) params.due_at_gteq = ctx.input.dueAtGteq;
    if (ctx.input.dueAtLteq !== undefined) params.due_at_lteq = ctx.input.dueAtLteq;
    let limit = ctx.input.limit ?? 50;
    let offset = ctx.input.offset ?? 0;
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || offset < 0) {
      throw createApiServiceError(
        'limit and offset must be whole numbers, with offset at least zero.'
      );
    }
    let cursor = ctx.input.until;
    let collected: any[] = [];
    while (collected.length < offset + limit) {
      let pageLimit = Math.max(2, Math.min(50, offset + limit - collected.length));
      let data = await client.listTasks({
        ...params,
        limit: pageLimit,
        ...(cursor === undefined ? {} : { until: cursor })
      });
      let page = data.tasks ?? [];
      collected.push(...page);
      let oldest = page.at(-1)?.last_activity_at;
      if (!page.length) break;
      let nextCursor = typeof oldest === 'number' ? oldest - 1 : undefined;
      if (nextCursor === undefined || (cursor !== undefined && nextCursor >= cursor)) {
        if (collected.length < offset + limit && page.length >= pageLimit) {
          throw createApiServiceError('Missive returned no usable task pagination cursor.');
        }
        cursor = undefined;
        break;
      }
      cursor = nextCursor;
      if (page.length < pageLimit) break;
    }

    let tasks = collected.slice(offset, offset + limit).map(mapTask);
    let lastActivityAt = tasks.at(-1)?.lastActivityAt;
    let nextUntil =
      tasks.length === limit && lastActivityAt !== undefined ? lastActivityAt - 1 : undefined;

    return {
      output: { tasks, nextUntil },
      message: `Retrieved **${tasks.length}** tasks.`
    };
  })
  .build();
