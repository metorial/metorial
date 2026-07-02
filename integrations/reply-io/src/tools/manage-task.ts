import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, delete, or list tasks. Tasks include calls, meetings, to-dos, SMS, and manual emails. Tasks are tied to contacts and can be assigned to team members.`,
  instructions: [
    'When creating a task, "taskId", "ownerId", "taskType", and "status" are required.',
    'The "taskId" should be a ULID identifier.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID (required for get/update/delete; ULID format for create)'),
      ownerId: z.string().optional().describe('Owner/assignee user ID'),
      taskType: z
        .enum(['email_manual', 'email_auto', 'call', 'linkedin', 'custom'])
        .optional()
        .describe('Type of task'),
      status: z.enum(['pending', 'completed', 'skipped']).optional().describe('Task status'),
      description: z.string().optional().describe('Task description'),
      contactId: z.string().optional().describe('Associated contact ID'),
      accountId: z.string().optional().describe('Associated account ID'),
      sequenceId: z.string().optional().describe('Associated sequence ID'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD format)'),
      taskData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Task-type-specific configuration data')
    })
  )
  .output(
    z.object({
      task: z.record(z.string(), z.any()).optional().describe('Task details'),
      tasks: z.array(z.record(z.string(), z.any())).optional().describe('List of tasks'),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      taskId,
      ownerId,
      taskType,
      status,
      description,
      contactId,
      accountId,
      sequenceId,
      dueDate,
      taskData
    } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (status) params.status = status;
      if (taskType) params.taskType = taskType;
      if (dueDate) params.dueDate = dueDate;

      let result = await client.listTasks(params);
      let tasks = result?.data ?? (Array.isArray(result) ? result : []);
      return {
        output: { tasks },
        message: `Found **${tasks.length}** task(s).`
      };
    }

    if (action === 'get') {
      if (!taskId) throw new Error('taskId is required');
      let task = await client.getTask(taskId);
      return {
        output: { task },
        message: `Retrieved task **${taskId}**.`
      };
    }

    if (action === 'create') {
      if (!taskId) throw new Error('taskId is required for creation (ULID format)');
      if (!ownerId) throw new Error('ownerId is required');
      if (!taskType) throw new Error('taskType is required');
      if (!status) throw new Error('status is required');

      let data: Record<string, any> = {
        id: taskId,
        ownerId,
        taskType,
        status,
        data: taskData ?? {}
      };
      if (description) data.description = description;
      if (contactId) data.contactId = contactId;
      if (accountId) data.accountId = accountId;
      if (sequenceId) data.sequenceId = sequenceId;
      if (dueDate) data.dueDate = dueDate;

      let task = await client.createTask(data);
      return {
        output: { task },
        message: `Created **${taskType}** task (ID: ${taskId}).`
      };
    }

    if (action === 'update') {
      if (!taskId) throw new Error('taskId is required');
      let data: Record<string, any> = {};
      if (ownerId) data.ownerId = ownerId;
      if (taskType) data.taskType = taskType;
      if (status) data.status = status;
      if (description !== undefined) data.description = description;
      if (contactId) data.contactId = contactId;
      if (accountId) data.accountId = accountId;
      if (sequenceId) data.sequenceId = sequenceId;
      if (dueDate) data.dueDate = dueDate;
      if (taskData) data.data = taskData;

      let task = await client.updateTask(taskId, data);
      return {
        output: { task },
        message: `Updated task **${taskId}**.`
      };
    }

    // delete
    if (!taskId) throw new Error('taskId is required');
    await client.deleteTask(taskId);
    return {
      output: { deleted: true },
      message: `Deleted task **${taskId}**.`
    };
  })
  .build();
