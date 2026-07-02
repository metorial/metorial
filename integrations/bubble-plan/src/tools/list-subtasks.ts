import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubtasks = SlateTool.create(spec, {
  name: 'List Subtasks',
  key: 'list_subtasks',
  description: `Retrieve a list of subtasks from Project Bubble. Supports filtering by parent task, user, team, dates, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Filter subtasks by parent task ID'),
      userId: z.string().optional().describe('Filter subtasks by assigned user ID'),
      teamId: z.string().optional().describe('Filter subtasks by assigned team ID'),
      dueFrom: z
        .string()
        .optional()
        .describe('Filter subtasks due from this date (yyyymmdd format)'),
      dueTo: z
        .string()
        .optional()
        .describe('Filter subtasks due to this date (yyyymmdd format)'),
      completedFrom: z
        .string()
        .optional()
        .describe('Filter subtasks completed from this date (yyyymmdd format)'),
      completedTo: z
        .string()
        .optional()
        .describe('Filter subtasks completed to this date (yyyymmdd format)'),
      status: z
        .enum(['open', 'completed', 'active', 'onhold', 'inactive', 'archived'])
        .optional()
        .describe('Filter subtasks by status'),
      limit: z.number().optional().describe('Maximum number of records to return (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      subtasks: z
        .array(
          z.object({
            subtaskId: z.string().describe('Subtask ID'),
            subtaskName: z.string().describe('Subtask name'),
            description: z.string().optional().describe('Subtask description'),
            taskId: z.string().optional().describe('Parent task ID'),
            color: z.string().optional().describe('Subtask color'),
            startDate: z.string().optional().describe('Subtask start date'),
            dueDate: z.string().optional().describe('Subtask due date'),
            progress: z.number().optional().describe('Subtask progress percentage'),
            users: z.array(z.any()).optional().describe('Assigned users')
          })
        )
        .describe('List of subtasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getSubtasks({
      taskId: ctx.input.taskId,
      userId: ctx.input.userId,
      teamId: ctx.input.teamId,
      dueFrom: ctx.input.dueFrom,
      dueTo: ctx.input.dueTo,
      completedFrom: ctx.input.completedFrom,
      completedTo: ctx.input.completedTo,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let subtasks = data.map((s: any) => ({
      subtaskId: String(s.subtask_id),
      subtaskName: s.subtask_name || '',
      description: s.description || undefined,
      taskId: s.task_id ? String(s.task_id) : undefined,
      color: s.color || undefined,
      startDate: s.start_date || undefined,
      dueDate: s.due_date || undefined,
      progress: s.progress ?? undefined,
      users: s.users || undefined
    }));

    return {
      output: { subtasks },
      message: `Found **${subtasks.length}** subtask(s).`
    };
  })
  .build();
