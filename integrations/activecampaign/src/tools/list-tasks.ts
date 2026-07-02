import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let mapTask = (task: any) => ({
  taskId: task.id,
  title: task.title || undefined,
  note: task.note || undefined,
  duedate: task.duedate || undefined,
  status: task.status !== undefined ? String(task.status) : undefined,
  relType: task.reltype || undefined,
  relId: task.relid || undefined,
  taskTypeId: task.dealTasktype || undefined,
  assigneeId: task.assignee || undefined,
  createdAt: task.cdate || undefined,
  updatedAt: task.udate || undefined
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description:
    'Lists deal tasks with filters for related object, status, task type, assignee, due date, and text fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Filter by task title'),
      relType: z.string().optional().describe('Filter by related object type, such as Deal'),
      relId: z.string().optional().describe('Filter by related object ID'),
      status: z.number().optional().describe('Filter by status: 0=incomplete, 1=complete'),
      note: z.string().optional().describe('Filter by note content'),
      dueDate: z.string().optional().describe('Filter by exact due date'),
      dueAfter: z.string().optional().describe('Filter tasks due after this date'),
      dueBefore: z.string().optional().describe('Filter tasks due before this date'),
      dueDateRange: z
        .string()
        .optional()
        .describe('Filter by date range or bucket, e.g. upcoming, scheduled, or overdue'),
      taskTypeId: z.string().optional().describe('Filter by deal task type ID'),
      assigneeUserId: z.string().optional().describe('Filter by assignee user ID'),
      outcomeId: z.number().optional().describe('Filter by task outcome ID'),
      limit: z.number().optional().describe('Maximum number of tasks to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          title: z.string().optional(),
          note: z.string().optional(),
          duedate: z.string().optional(),
          status: z.string().optional(),
          relType: z.string().optional(),
          relId: z.string().optional(),
          taskTypeId: z.string().optional(),
          assigneeId: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.title) params['filters[title]'] = ctx.input.title;
    if (ctx.input.relType) params['filters[reltype]'] = ctx.input.relType;
    if (ctx.input.relId) params['filters[relid]'] = ctx.input.relId;
    if (ctx.input.status !== undefined) params['filters[status]'] = ctx.input.status;
    if (ctx.input.note) params['filters[note]'] = ctx.input.note;
    if (ctx.input.dueDate) params['filters[duedate]'] = ctx.input.dueDate;
    if (ctx.input.dueAfter) params['filters[due_after]'] = ctx.input.dueAfter;
    if (ctx.input.dueBefore) params['filters[due_before]'] = ctx.input.dueBefore;
    if (ctx.input.dueDateRange) params['filters[duedate_range]'] = ctx.input.dueDateRange;
    if (ctx.input.taskTypeId) params['filters[d_tasktypeid]'] = ctx.input.taskTypeId;
    if (ctx.input.assigneeUserId)
      params['filters[assignee_userid]'] = ctx.input.assigneeUserId;
    if (ctx.input.outcomeId !== undefined) params['filters[outcome_id]'] = ctx.input.outcomeId;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listTasks(params);
    let tasks = (result.dealTasks || []).map(mapTask);
    let totalCount = result.meta?.total ? Number(result.meta.total) : undefined;

    return {
      output: { tasks, totalCount },
      message: `Found **${tasks.length}** tasks${totalCount !== undefined ? ` (out of ${totalCount} total)` : ''}.`
    };
  })
  .build();
