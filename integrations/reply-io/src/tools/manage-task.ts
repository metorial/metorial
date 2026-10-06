import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, delete, or list tasks. Tasks include calls, meetings, to-dos, SMS, and manual emails. Tasks are tied to contacts and can be assigned to team members.`,
  instructions: [
    'Current tasks receive numeric IDs from Reply.io. Pass the returned ID as a string for get/update/delete; do not supply a client-assigned taskId for create.',
    'Create requires taskType, startAt and dueTo (or dueDate). Tasks are created pending; creating one does not execute it. Legacy email_auto and non-pending write statuses have no supported current equivalent.'
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
      top: z.number().optional().describe('Maximum items in a list page (1–1000).'),
      skip: z.number().optional().describe('List items to skip.'),
      taskId: z
        .string()
        .optional()
        .describe(
          'Task ID as a string (required for get/update/delete); current IDs are numeric, assigned by Reply.io.'
        ),
      ownerId: z.string().optional().describe('Owner/assignee user ID'),
      taskType: z
        .enum([
          'email_manual',
          'email_auto',
          'call',
          'linkedin',
          'custom',
          'toDo',
          'meeting',
          'linkedIn',
          'manualEmail',
          'sms',
          'whatsApp'
        ])
        .optional()
        .describe('Type of task'),
      status: z.enum(['pending', 'completed', 'skipped']).optional().describe('Task status'),
      description: z.string().optional().describe('Task description'),
      contactId: z.string().optional().describe('Associated contact ID'),
      accountId: z.string().optional().describe('Associated account ID'),
      sequenceId: z.string().optional().describe('Associated sequence ID'),
      startAt: z
        .string()
        .optional()
        .describe('Current task start time in ISO-8601 format; required for create.'),
      dueTo: z
        .string()
        .optional()
        .describe('Current task due time in ISO-8601 format; alternative to dueDate.'),
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
      hasMore: z.boolean().optional(),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const input = ctx.input;
    if (input.action === 'list') {
      const result = await client.listTasks(input);
      return {
        output: { tasks: result.items, hasMore: result.hasMore },
        message: `Retrieved ${result.items.length} tasks.`
      };
    }
    if (input.action === 'get')
      return {
        output: { task: await client.getTask(required(input.taskId, 'taskId')) },
        message: 'Retrieved task.'
      };
    if (input.action === 'delete') {
      await client.deleteTask(required(input.taskId, 'taskId'));
      return { output: { deleted: true }, message: 'Deleted task.' };
    }
    if (input.action === 'create' && input.taskId !== undefined)
      throw createApiServiceError(
        'Current task IDs are assigned by Reply.io. Omit taskId for create; ULID assignment is unsupported.'
      );
    if (input.accountId !== undefined || input.sequenceId !== undefined)
      throw createApiServiceError(
        'Current task create/update cannot assign accountId or sequenceId. These legacy fields are retained but unsupported.'
      );
    if (input.status !== undefined && input.status !== 'pending')
      throw createApiServiceError(
        'Current task create/update does not write status. Create pending tasks; complete or cancel them in Reply.io.'
      );
    if (input.taskType === 'email_auto')
      throw createApiServiceError(
        'email_auto has no current task API equivalent. Use manualEmail for a manual task.'
      );
    const types: Record<string, string> = {
      email_manual: 'manualEmail',
      linkedin: 'linkedIn',
      custom: 'toDo'
    };
    const data: Record<string, unknown> = {};
    if (input.taskType !== undefined) data.taskType = types[input.taskType] ?? input.taskType;
    if (input.contactId !== undefined) data.contactId = numeric(input.contactId, 'contactId');
    const taskData = input.taskData ?? {};
    const supported = new Set(['startAt', 'dueTo', 'template', 'linkedInTaskType']);
    if (Object.keys(taskData).some(key => !supported.has(key)))
      throw createApiServiceError(
        'taskData accepts the current startAt, dueTo, template and linkedInTaskType fields only.'
      );
    Object.assign(data, taskData);
    if (input.startAt !== undefined) data.startAt = input.startAt;
    if (input.dueTo !== undefined && input.dueDate !== undefined)
      throw createApiServiceError('Choose dueTo or dueDate.');
    if (input.dueTo !== undefined || input.dueDate !== undefined)
      data.dueTo = input.dueTo ?? input.dueDate;
    for (const field of ['startAt', 'dueTo'])
      if (
        data[field] !== undefined &&
        (typeof data[field] !== 'string' || !Number.isFinite(Date.parse(data[field])))
      )
        throw createApiServiceError(`${field} must be an ISO-8601 date/time.`);
    if (input.description !== undefined)
      data.template = {
        ...(typeof data.template === 'object' && data.template ? data.template : {}),
        body: input.description
      };
    const ownerId =
      input.ownerId === undefined ? undefined : numeric(input.ownerId, 'ownerId');
    if (input.action === 'create') {
      if (!data.taskType || !data.startAt || !data.dueTo)
        throw createApiServiceError(
          'Create requires taskType, startAt and dueTo (or dueDate).'
        );
      data.template ??= { body: '' };
    }
    const task =
      input.action === 'create'
        ? await client.createTask(data)
        : await client.updateTask(required(input.taskId, 'taskId'), data);
    if (ownerId !== undefined && task.assignedUserId !== ownerId) {
      try {
        const assigned = await client.assignTask(String(task.id), ownerId);
        return { output: { task: assigned }, message: `Saved task ${task.id}.` };
      } catch {
        throw createApiServiceError(
          `Task ${task.id} was saved, but assignment to user ${ownerId} was not confirmed. Inspect it before retrying.`,
          { parent: {} }
        );
      }
    }
    return { output: { task }, message: `Saved task ${task.id}.` };
  })
  .build();
const required = (value: string | undefined, field: string) => {
  if (!value) throw createApiServiceError(`${field} is required.`);
  return value;
};
const numeric = (value: string, field: string) => {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw createApiServiceError(
      `${field} must contain a positive numeric ID; ULIDs are unsupported by the current API.`
    );
  return Number(value);
};
