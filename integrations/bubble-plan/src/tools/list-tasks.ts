import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve a list of tasks from Project Bubble. Supports filtering by project, dates, tags, and status. Use this to browse tasks or find specific ones matching criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter tasks by project ID'),
      dueFrom: z
        .string()
        .optional()
        .describe('Filter tasks due from this date (yyyymmdd format)'),
      dueTo: z.string().optional().describe('Filter tasks due to this date (yyyymmdd format)'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter tasks created from this date (yyyymmdd format)'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter tasks created to this date (yyyymmdd format)'),
      completedFrom: z
        .string()
        .optional()
        .describe('Filter tasks completed from this date (yyyymmdd format)'),
      completedTo: z
        .string()
        .optional()
        .describe('Filter tasks completed to this date (yyyymmdd format)'),
      tag: z.string().optional().describe('Filter tasks by tag'),
      status: z
        .enum(['open', 'completed', 'active', 'onhold', 'inactive', 'archived'])
        .optional()
        .describe('Filter tasks by status'),
      limit: z.number().optional().describe('Maximum number of records to return (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Task ID'),
            taskName: z.string().describe('Task name'),
            description: z.string().optional().describe('Task description'),
            projectId: z.string().optional().describe('Parent project ID'),
            startDate: z.string().optional().describe('Task start date'),
            dueDate: z.string().optional().describe('Task due date'),
            progress: z.number().optional().describe('Task progress percentage (0-100)'),
            status: z.string().optional().describe('Task status'),
            users: z.array(z.any()).optional().describe('Assigned users'),
            teams: z.array(z.any()).optional().describe('Assigned teams')
          })
        )
        .describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getTasks({
      projectId: ctx.input.projectId,
      dueFrom: ctx.input.dueFrom,
      dueTo: ctx.input.dueTo,
      createdFrom: ctx.input.createdFrom,
      createdTo: ctx.input.createdTo,
      completedFrom: ctx.input.completedFrom,
      completedTo: ctx.input.completedTo,
      tag: ctx.input.tag,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let tasks = data.map((t: any) => ({
      taskId: String(t.task_id),
      taskName: t.task_name || '',
      description: t.description || undefined,
      projectId: t.project_id ? String(t.project_id) : undefined,
      startDate: t.start_date || undefined,
      dueDate: t.due_date || undefined,
      progress: t.progress ?? undefined,
      status: t.status || undefined,
      users: t.users || undefined,
      teams: t.teams || undefined
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
