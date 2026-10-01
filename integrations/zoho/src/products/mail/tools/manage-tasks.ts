import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { Client } from '../lib/client';

let taskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  title: z.string().optional().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  priority: z.string().optional().describe('Task priority'),
  status: z.string().optional().describe('Task status'),
  dueDate: z.string().optional().describe('Due date'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  completedTime: z.string().optional().describe('Completion timestamp'),
  assignee: z.string().optional().describe('Assignee email'),
  groupId: z.string().optional().describe('Group ID if group task')
});

export let manageTasks = SlateTool.create(spec, {
  name: 'Mail Manage Tasks',
  key: 'mail_manage_tasks',
  description: `Create, list, update, or delete tasks in Zoho Mail. Supports both personal tasks and group tasks. Tasks can have titles, descriptions, priorities, statuses, due dates, and assignees.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['listGroups', 'list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      scope: z
        .enum(['personal', 'group'])
        .default('personal')
        .describe('Whether this is a personal or group task'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Group ID. Call mail_manage_tasks with listGroups to discover groups. Required when scope is "group")'
        ),
      taskId: z.string().optional().describe('Task ID (required for update, delete)'),
      title: z.string().optional().describe('Task title (required for create)'),
      description: z.string().optional().describe('Task description'),
      priority: z
        .string()
        .optional()
        .describe(
          'Task priority (high, medium, low). For list, filters the current returned page.'
        ),
      status: z
        .string()
        .optional()
        .describe(
          'Task status (inprogress or completed). For list, filters the current returned page.'
        ),
      dueDate: z.string().optional().describe('Due date string'),
      start: z.number().optional().describe('Starting position for list pagination'),
      limit: z.number().optional().describe('Number of tasks to return')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).optional().describe('List of tasks (for list action)'),
      task: taskSchema.optional().describe('Created or updated task'),
      groups: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let { action, scope, groupId } = ctx.input;
    if (action === 'listGroups') {
      let groups = await client.listTaskGroups();
      return {
        output: {
          success: true,
          groups: groups.map((group: any) => ({
            id: String(group.groupId || group.id || group.zgid),
            name: group.groupName || group.name
          }))
        },
        message: `Retrieved ${groups.length} groups.`
      };
    }

    if (scope === 'group' && !groupId) {
      throw createApiServiceError('groupId is required for group task operations');
    }

    let mapTask = (t: any) => ({
      taskId: String(t.taskId || t.id),
      title: t.title || t.taskTitle,
      description: t.description,
      priority: t.priority,
      status: t.status || t.taskStatus,
      dueDate: t.dueDate,
      createdTime:
        t.createdAt || t.createdTime ? String(t.createdAt || t.createdTime) : undefined,
      completedTime: t.completedTime ? String(t.completedTime) : undefined,
      assignee:
        t.assignee && typeof t.assignee === 'object'
          ? String(t.assignee.id)
          : t.assignee || undefined,
      groupId: t.groupId ? String(t.groupId) : groupId || undefined
    });

    if (action === 'list') {
      let params = {
        status: ctx.input.status,
        priority: ctx.input.priority,
        start: ctx.input.start,
        limit: ctx.input.limit
      };
      let tasks =
        scope === 'group' && groupId
          ? await client.listGroupTasks(groupId, params)
          : await client.listPersonalTasks(params);
      // Filters apply to this returned provider page; pagination remains provider pagination.
      let normalize = (value: unknown) =>
        String(value || '')
          .toLowerCase()
          .replace(/[\s_-]/g, '');
      let normalizePriority = (value: unknown) => {
        let priority = normalize(value);
        return priority === 'normal' ? 'medium' : priority;
      };
      let filtered = tasks.filter(
        (task: any) =>
          (!ctx.input.status ||
            normalize(task.status || task.taskStatus) === normalize(ctx.input.status)) &&
          (!ctx.input.priority ||
            normalizePriority(task.priority) === normalizePriority(ctx.input.priority))
      );
      let mapped = filtered.map(mapTask);
      return {
        output: { tasks: mapped, success: true },
        message: `Retrieved **${mapped.length}** ${scope} task(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.title) {
        throw createApiServiceError('title is required for create action');
      }
      let taskData: any = {
        title: ctx.input.title,
        description: ctx.input.description,
        priority: ctx.input.priority,
        status: ctx.input.status,
        dueDate: ctx.input.dueDate
      };
      let result =
        scope === 'group' && groupId
          ? await client.createGroupTask(groupId, taskData)
          : await client.createPersonalTask(taskData);
      return {
        output: { task: mapTask(result || {}), success: true },
        message: `Created ${scope} task "**${ctx.input.title}**".`
      };
    }

    if (action === 'update') {
      if (!ctx.input.taskId) {
        throw createApiServiceError('taskId is required for update action');
      }
      let taskData: Record<string, string> = {};
      for (let field of ['title', 'description', 'priority', 'status', 'dueDate'] as const) {
        let value = ctx.input[field];
        if (value !== undefined) taskData[field] = value;
      }
      if (!Object.keys(taskData).length)
        throw createApiServiceError('Provide at least one task field to update');
      if (taskData.priority && !['high', 'medium', 'low'].includes(taskData.priority))
        throw createApiServiceError('priority must be high, medium, or low');
      if (taskData.status && !['inprogress', 'completed'].includes(taskData.status))
        throw createApiServiceError('status must be inprogress or completed');
      if (taskData.dueDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(taskData.dueDate))
        throw createApiServiceError('dueDate must use DD/MM/YYYY');
      // Provider documents one field per update operation, at the same resource URL.
      // https://www.zoho.com/mail/help/api/put-change-task-title.html
      // https://www.zoho.com/mail/help/api/put-change-task-description.html
      // https://www.zoho.com/mail/help/api/put-change-task-priority.html
      // https://www.zoho.com/mail/help/api/put-change-task-status.html
      // https://www.zoho.com/mail/help/api/put-change-task-due-date.html
      for (let [field, value] of Object.entries(taskData)) {
        if (scope === 'group' && groupId)
          await client.updateGroupTask(groupId, ctx.input.taskId, { [field]: value });
        else await client.updatePersonalTask(ctx.input.taskId, { [field]: value });
      }
      let result =
        scope === 'group' && groupId
          ? await client.getGroupTask(groupId, ctx.input.taskId)
          : await client.getPersonalTask(ctx.input.taskId);
      return {
        output: {
          task: mapTask(result || { taskId: ctx.input.taskId, ...taskData }),
          success: true
        },
        message: `Updated ${scope} task ${ctx.input.taskId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.taskId) {
        throw createApiServiceError('taskId is required for delete action');
      }
      if (scope === 'group' && groupId) {
        await client.deleteGroupTask(groupId, ctx.input.taskId);
      } else {
        await client.deletePersonalTask(ctx.input.taskId);
      }
      return {
        output: { success: true },
        message: `Deleted ${scope} task ${ctx.input.taskId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
