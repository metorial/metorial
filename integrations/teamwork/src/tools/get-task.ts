import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve detailed information about a specific Teamwork task, including its status, assignees, dates, priority, and estimated time.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique task ID'),
      content: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      status: z.string().optional().describe('Task status'),
      priority: z.string().optional().describe('Task priority'),
      startDate: z.string().optional().describe('Start date'),
      dueDate: z.string().optional().describe('Due date'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      projectId: z.string().optional().describe('Parent project ID'),
      projectName: z.string().optional().describe('Parent project name'),
      taskListId: z.string().optional().describe('Parent task list ID'),
      taskListName: z.string().optional().describe('Parent task list name'),
      assigneeIds: z.array(z.string()).optional().describe('Assigned person IDs'),
      estimatedMinutes: z.number().optional().describe('Estimated time in minutes'),
      createdOn: z.string().optional().describe('Date the task was created'),
      lastChangedOn: z.string().optional().describe('Date the task was last changed'),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            tagName: z.string()
          })
        )
        .optional()
        .describe('Tags assigned to the task'),
      parentTaskId: z.string().optional().describe('Parent task ID (if subtask)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getTask(ctx.input.taskId);
    let t = result['todo-item'] || result.task || result;

    let tags = (t.tags || []).map((tag: any) => ({
      tagId: String(tag.id),
      tagName: tag.name || ''
    }));

    return {
      output: {
        taskId: String(t.id),
        content: t.content || '',
        description: t.description || undefined,
        status: t.status || undefined,
        priority: t.priority || undefined,
        startDate: t['start-date'] || t.startDate || undefined,
        dueDate: t['due-date'] || t.dueDate || undefined,
        completed: t.completed ?? undefined,
        projectId: t['project-id']
          ? String(t['project-id'])
          : t.projectId
            ? String(t.projectId)
            : undefined,
        projectName: t['project-name'] || t.projectName || undefined,
        taskListId: t['todo-list-id']
          ? String(t['todo-list-id'])
          : t.taskListId
            ? String(t.taskListId)
            : undefined,
        taskListName: t['todo-list-name'] || t.taskListName || undefined,
        assigneeIds: t['responsible-party-ids']
          ? String(t['responsible-party-ids']).split(',')
          : undefined,
        estimatedMinutes: t['estimated-minutes']
          ? Number(t['estimated-minutes'])
          : t.estimatedMinutes
            ? Number(t.estimatedMinutes)
            : undefined,
        createdOn: t['created-on'] || t.createdOn || undefined,
        lastChangedOn: t['last-changed-on'] || t.lastChangedOn || undefined,
        tags: tags.length > 0 ? tags : undefined,
        parentTaskId: t.parentTaskId
          ? String(t.parentTaskId)
          : t['parent-id']
            ? String(t['parent-id'])
            : undefined
      },
      message: `Retrieved task **${t.content || ctx.input.taskId}**.`
    };
  })
  .build();
