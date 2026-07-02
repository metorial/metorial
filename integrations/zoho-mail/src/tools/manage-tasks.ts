import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `Create, list, update, or delete tasks in Zoho Mail. Supports both personal tasks and group tasks. Tasks can have titles, descriptions, priorities, statuses, due dates, and assignees.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      scope: z
        .enum(['personal', 'group'])
        .default('personal')
        .describe('Whether this is a personal or group task'),
      groupId: z.string().optional().describe('Group ID (required when scope is "group")'),
      taskId: z.string().optional().describe('Task ID (required for update, delete)'),
      title: z.string().optional().describe('Task title (required for create)'),
      description: z.string().optional().describe('Task description'),
      priority: z.string().optional().describe('Task priority (e.g. "high", "medium", "low")'),
      status: z
        .string()
        .optional()
        .describe('Task status (e.g. "open", "inprogress", "completed")'),
      dueDate: z.string().optional().describe('Due date string'),
      start: z.number().optional().describe('Starting position for list pagination'),
      limit: z.number().optional().describe('Number of tasks to return')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).optional().describe('List of tasks (for list action)'),
      task: taskSchema.optional().describe('Created or updated task'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let { action, scope, groupId } = ctx.input;

    if (scope === 'group' && !groupId && action !== 'list') {
      throw new Error('groupId is required for group task operations');
    }

    let mapTask = (t: any) => ({
      taskId: String(t.taskId || t.id),
      title: t.title || t.taskTitle,
      description: t.description,
      priority: t.priority,
      status: t.status || t.taskStatus,
      dueDate: t.dueDate,
      createdTime: t.createdTime ? String(t.createdTime) : undefined,
      completedTime: t.completedTime ? String(t.completedTime) : undefined,
      assignee: t.assignee,
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
      let mapped = tasks.map(mapTask);
      return {
        output: { tasks: mapped, success: true },
        message: `Retrieved **${mapped.length}** ${scope} task(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.title) throw new Error('title is required for create action');
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
      if (!ctx.input.taskId) throw new Error('taskId is required for update action');
      let taskData: any = {};
      if (ctx.input.title) taskData.title = ctx.input.title;
      if (ctx.input.description) taskData.description = ctx.input.description;
      if (ctx.input.priority) taskData.priority = ctx.input.priority;
      if (ctx.input.status) taskData.status = ctx.input.status;
      if (ctx.input.dueDate) taskData.dueDate = ctx.input.dueDate;
      let result =
        scope === 'group' && groupId
          ? await client.updateGroupTask(groupId, ctx.input.taskId, taskData)
          : await client.updatePersonalTask(ctx.input.taskId, taskData);
      return {
        output: {
          task: mapTask(result || { taskId: ctx.input.taskId, ...taskData }),
          success: true
        },
        message: `Updated ${scope} task ${ctx.input.taskId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.taskId) throw new Error('taskId is required for delete action');
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

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
