import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve tasks from Teamwork. Can list all tasks, tasks for a specific project, or tasks in a specific task list. Supports filtering by assignee, priority, dates, tags, and search term.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter tasks by project ID'),
      taskListId: z.string().optional().describe('Filter tasks by task list ID'),
      searchTerm: z.string().optional().describe('Search tasks by name'),
      assigneeIds: z
        .string()
        .optional()
        .describe('Comma-separated person IDs to filter by assignee'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Filter by priority'),
      includeCompleted: z.boolean().optional().describe('Include completed tasks'),
      tagIds: z.string().optional().describe('Comma-separated tag IDs to filter'),
      startDate: z.string().optional().describe('Filter by start date (YYYYMMDD)'),
      endDate: z.string().optional().describe('Filter by end date (YYYYMMDD)'),
      sort: z.string().optional().describe('Sort field'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Unique task ID'),
            content: z.string().describe('Task title'),
            description: z.string().optional().describe('Task description'),
            priority: z.string().optional().describe('Task priority'),
            startDate: z.string().optional().describe('Start date'),
            dueDate: z.string().optional().describe('Due date'),
            completed: z.boolean().optional().describe('Whether the task is completed'),
            projectId: z.string().optional().describe('Parent project ID'),
            taskListId: z.string().optional().describe('Parent task list ID'),
            assigneeIds: z.array(z.string()).optional().describe('Assigned person IDs')
          })
        )
        .describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTasks({
      projectId: ctx.input.projectId,
      taskListId: ctx.input.taskListId,
      searchTerm: ctx.input.searchTerm,
      responsiblePartyIds: ctx.input.assigneeIds,
      priority: ctx.input.priority,
      includeCompleted: ctx.input.includeCompleted,
      tagIds: ctx.input.tagIds,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      sort: ctx.input.sort,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let items = result['todo-items'] || result.tasks || [];
    let tasks = items.map((t: any) => ({
      taskId: String(t.id),
      content: t.content || '',
      description: t.description || undefined,
      priority: t.priority || undefined,
      startDate: t['start-date'] || t.startDate || undefined,
      dueDate: t['due-date'] || t.dueDate || undefined,
      completed: t.completed ?? undefined,
      projectId: t['project-id']
        ? String(t['project-id'])
        : t.projectId
          ? String(t.projectId)
          : undefined,
      taskListId: t['todo-list-id']
        ? String(t['todo-list-id'])
        : t.taskListId
          ? String(t.taskListId)
          : undefined,
      assigneeIds: t['responsible-party-ids']
        ? String(t['responsible-party-ids']).split(',')
        : undefined
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
