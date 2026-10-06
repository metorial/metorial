import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource, validateInput } from '../lib/helpers';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks from Outreach. Filter by state, type, owner, or prospect.
Tasks include action items, calls, emails, and in-person tasks assigned to users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      state: z.enum(['incomplete', 'complete']).optional().describe('Filter by task state'),
      taskType: z
        .enum(['action_item', 'call', 'email', 'in_person'])
        .optional()
        .describe('Filter by task action: action_item, call, email or in_person.'),
      ownerId: z.string().optional().describe('Filter by owner user ID'),
      prospectId: z.string().optional().describe('Filter by prospect ID'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageOffset: z
        .number()
        .optional()
        .describe('Legacy offset from 0 to 10000; omit to use cursor pagination.'),
      pageAfter: z
        .string()
        .optional()
        .describe('Returned nextPageAfter cursor; keep the same filters and sorting.'),
      sortBy: z.string().optional().describe('Sort field (e.g. "dueAt", "-createdAt")')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          state: z.string().optional(),
          taskType: z.string().optional(),
          action: z.string().optional(),
          subject: z.string().optional(),
          dueAt: z.string().optional(),
          completedAt: z.string().optional(),
          prospectId: z.string().optional(),
          ownerId: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      hasMore: z.boolean(),
      nextPageOffset: z
        .number()
        .optional()
        .describe('Use as pageOffset for the next page with the same filters.'),
      nextPageAfter: z
        .string()
        .optional()
        .describe('Pass as pageAfter for the next page with unchanged filters.'),
      totalCount: z
        .number()
        .optional()
        .describe('Exact provider count when available and not truncated.')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let filterParams = buildFilterParams({
      state: ctx.input.state,
      action: ctx.input.taskType,
      'owner/id': ctx.input.ownerId,
      'prospect/id': ctx.input.prospectId
    });

    let params: Record<string, string> = { ...filterParams };
    if (ctx.input.pageSize) params['page[limit]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageAfter !== undefined) params['page[after]'] = ctx.input.pageAfter;
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;

    let result = await client.listTasks(params);

    let tasks = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        taskId: flat.id,
        state: flat.state,
        taskType: flat.taskType,
        action: flat.action,
        subject: flat.subject,
        dueAt: flat.dueAt,
        completedAt: flat.completedAt,
        prospectId: flat.prospectId,
        ownerId: flat.ownerId,
        updatedAt: flat.updatedAt
      };
    });

    return {
      output: {
        tasks,
        hasMore: result.hasMore,
        nextPageOffset: result.nextPageOffset,
        nextPageAfter: result.nextPageAfter,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${tasks.length}** tasks${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
