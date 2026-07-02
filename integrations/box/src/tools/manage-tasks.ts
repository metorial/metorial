import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { boxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTasks = SlateTool.create(spec, {
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `Create, list, update, or delete tasks on Box files. Tasks can be assigned to specific users with due dates and completion tracking. Supports review and approval task types.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'update', 'delete'])
        .describe('The task operation to perform'),
      fileId: z.string().optional().describe('File ID (required for create and list)'),
      taskId: z.string().optional().describe('Task ID (required for update and delete)'),
      taskMessage: z
        .string()
        .optional()
        .describe('Task description or instructions (for create and update)'),
      dueAt: z
        .string()
        .optional()
        .describe('ISO 8601 due date for the task (for create and update)'),
      taskAction: z
        .enum(['review', 'complete'])
        .optional()
        .describe('Task action type (for create)'),
      assigneeUserId: z
        .string()
        .optional()
        .describe('User ID to assign the task to (for create)'),
      assigneeEmail: z
        .string()
        .optional()
        .describe('Email of user to assign the task to (for create)')
    })
  )
  .output(
    z.object({
      taskId: z.string().optional().describe('ID of the task'),
      taskMessage: z.string().optional().describe('Task description'),
      dueAt: z.string().optional().describe('ISO 8601 due date'),
      taskAction: z.string().optional().describe('Task action type'),
      deleted: z.boolean().optional().describe('True if the task was deleted'),
      assignmentId: z
        .string()
        .optional()
        .describe('ID of the task assignment if one was created'),
      tasks: z
        .array(
          z.object({
            taskId: z.string(),
            taskMessage: z.string().optional(),
            dueAt: z.string().optional(),
            taskAction: z.string().optional(),
            isCompleted: z.boolean().optional()
          })
        )
        .optional()
        .describe('List of tasks on the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      fileId,
      taskId,
      taskMessage,
      dueAt,
      taskAction,
      assigneeUserId,
      assigneeEmail
    } = ctx.input;

    if (action === 'list') {
      if (!fileId) throw boxServiceError('fileId is required for list action');
      let tasks = await client.getFileTasks(fileId);
      let mapped = tasks.map((t: any) => ({
        taskId: t.id,
        taskMessage: t.message,
        dueAt: t.due_at,
        taskAction: t.action,
        isCompleted: t.is_completed
      }));
      return {
        output: { tasks: mapped },
        message: `Found ${mapped.length} task(s) on file ${fileId}.`
      };
    }

    if (action === 'create') {
      if (!fileId) throw boxServiceError('fileId is required for create action');
      let task = await client.createTask(fileId, {
        message: taskMessage,
        dueAt,
        action: taskAction
      });

      let assignmentId: string | undefined;
      if (assigneeUserId || assigneeEmail) {
        let assignTo: { id?: string; login?: string } = {};
        if (assigneeUserId) assignTo.id = assigneeUserId;
        if (assigneeEmail) assignTo.login = assigneeEmail;
        let assignment = await client.createTaskAssignment(task.id, assignTo);
        assignmentId = assignment.id;
      }

      return {
        output: {
          taskId: task.id,
          taskMessage: task.message,
          dueAt: task.due_at,
          taskAction: task.action,
          assignmentId
        },
        message: `Created task on file ${fileId}${assignmentId ? ' with assignment' : ''}.`
      };
    }

    if (action === 'update') {
      if (!taskId) throw boxServiceError('taskId is required for update action');
      let updates: Record<string, any> = {};
      if (taskMessage !== undefined) updates.message = taskMessage;
      if (dueAt !== undefined) updates.due_at = dueAt;
      let task = await client.updateTask(taskId, updates);
      return {
        output: {
          taskId: task.id,
          taskMessage: task.message,
          dueAt: task.due_at,
          taskAction: task.action
        },
        message: `Updated task ${taskId}.`
      };
    }

    // delete
    if (!taskId) throw boxServiceError('taskId is required for delete action');
    await client.deleteTask(taskId);
    return {
      output: { taskId, deleted: true },
      message: `Deleted task ${taskId}.`
    };
  });
