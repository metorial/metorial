import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string().describe('Task ID'),
          state: z.string().optional(),
          dueAt: z.number().optional(),
          conversationId: z.string().optional(),
          teamId: z.string().optional(),
          assignees: z
            .array(
              z.object({
                userId: z.string(),
                name: z.string().optional()
              })
            )
            .optional(),
          createdAt: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number | boolean> = {};

    if (ctx.input.organizationId) params.organization = ctx.input.organizationId;
    if (ctx.input.teamId) params.team = ctx.input.teamId;
    if (ctx.input.assigneeId) params.assignee = ctx.input.assigneeId;
    if (ctx.input.state) params.state = ctx.input.state;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let data = await client.listTasks(params);
    let tasks = (data.tasks || []).map((t: any) => ({
      taskId: t.id,
      state: t.state,
      dueAt: t.due_at,
      conversationId: t.conversation?.id,
      teamId: t.team?.id,
      assignees: t.assignees?.map((a: any) => ({ userId: a.id, name: a.name })),
      createdAt: t.created_at
    }));

    return {
      output: { tasks },
      message: `Retrieved **${tasks.length}** tasks.`
    };
  })
  .build();
