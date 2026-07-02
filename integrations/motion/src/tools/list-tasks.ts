import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks from Motion workspaces with optional filtering by workspace, project, assignee, status, label, or name. Returns paginated results. If no workspace is specified, returns tasks from all workspaces.`,
  instructions: [
    'The `status` and `includeAllStatuses` filters are mutually exclusive - use one or the other.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Filter tasks to a specific workspace'),
      projectId: z.string().optional().describe('Filter tasks to a specific project'),
      assigneeId: z.string().optional().describe('Filter tasks assigned to a specific user'),
      status: z
        .array(z.string())
        .optional()
        .describe('Filter by task statuses. Mutually exclusive with includeAllStatuses.'),
      includeAllStatuses: z
        .boolean()
        .optional()
        .describe('Include tasks with any status. Mutually exclusive with status filter.'),
      label: z.string().optional().describe('Filter by label name'),
      name: z
        .string()
        .optional()
        .describe('Search for tasks containing this string (case-insensitive)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Unique identifier of the task'),
            name: z.string().describe('Title of the task'),
            description: z.string().optional().describe('HTML description'),
            dueDate: z.string().optional().describe('ISO 8601 due date'),
            priority: z.string().optional().describe('Priority level'),
            status: z.any().optional().describe('Current status'),
            completed: z.boolean().optional().describe('Whether the task is completed'),
            labels: z.array(z.any()).optional().describe('Labels attached to the task'),
            assignees: z.array(z.any()).optional().describe('Assigned users'),
            projectId: z.string().optional().describe('Associated project ID'),
            workspaceId: z.string().optional().describe('Workspace ID'),
            scheduledStart: z.string().optional().describe('Auto-scheduled start time'),
            scheduledEnd: z.string().optional().describe('Auto-scheduled end time'),
            schedulingIssue: z.boolean().optional().describe('Whether scheduling failed')
          })
        )
        .describe('List of tasks'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      pageSize: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let result = await client.listTasks({
      workspaceId: ctx.input.workspaceId,
      projectId: ctx.input.projectId,
      assigneeId: ctx.input.assigneeId,
      status: ctx.input.status,
      includeAllStatuses: ctx.input.includeAllStatuses,
      label: ctx.input.label,
      name: ctx.input.name,
      cursor: ctx.input.cursor
    });

    let tasks = (result.tasks || []).map((t: any) => ({
      taskId: t.id,
      name: t.name,
      description: t.description,
      dueDate: t.dueDate,
      priority: t.priority,
      status: t.status,
      completed: t.completed,
      labels: t.labels,
      assignees: t.assignees,
      projectId: t.project?.id,
      workspaceId: t.workspace?.id,
      scheduledStart: t.scheduledStart,
      scheduledEnd: t.scheduledEnd,
      schedulingIssue: t.schedulingIssue
    }));

    return {
      output: {
        tasks,
        nextCursor: result.meta?.nextCursor,
        pageSize: result.meta?.pageSize
      },
      message: `Found **${tasks.length}** task(s)${result.meta?.nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
