import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateDate } from '../lib/client';
import { mapTask } from '../lib/models';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create a new task or update an existing one in Close CRM.
Create a lead task with leadId and text, or an outgoing_call reminder with leadId and contactId. No call is placed.
When updating: provide the taskId along with any fields to change.`,
  instructions: [
    'To create a lead task, omit taskId and provide leadId and text. An outgoing_call reminder uses leadId and contactId and may include optional text.',
    'To update an existing task, provide the taskId along with the fields to change.',
    'To mark a task as complete, set isComplete to true.',
    'The type field (lead or outgoing_call) can only be set when creating a task.',
    'dueDate accepts ISO 8601 date or datetime strings and controls when the task becomes actionable in the inbox.'
  ]
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to update. Omit to create a new task.'),
      leadId: z
        .string()
        .optional()
        .describe('Lead ID to associate the task with (required when creating)'),
      contactId: z
        .string()
        .optional()
        .describe('Contact for an outgoing_call reminder; required when creating that type.'),
      text: z
        .string()
        .optional()
        .describe(
          'Task description text. Required for a new lead task; only lead tasks support text updates.'
        ),
      assignedTo: z.string().optional().describe('User ID to assign the task to'),
      isComplete: z.boolean().optional().describe('Whether the task is complete'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date in ISO 8601 format (date or datetime)'),
      type: z
        .enum(['lead', 'outgoing_call'])
        .optional()
        .describe('Task type (only settable when creating)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      leadId: z.string().optional().describe('Associated lead ID'),
      text: z.string().optional().describe('Task description text'),
      assignedTo: z.string().optional().describe('User ID the task is assigned to'),
      isComplete: z.boolean().describe('Whether the task is complete'),
      dueDate: z.string().nullable().describe('Due date in ISO 8601 format'),
      type: z.string().describe('Task type'),
      dateCreated: z.string().describe('Creation timestamp'),
      dateUpdated: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const { taskId, ...fields } = ctx.input;
    if (taskId === undefined && fields.leadId === undefined)
      throw createApiServiceError('Provide leadId when creating a task.');
    if (
      taskId === undefined &&
      (fields.type ?? 'lead') === 'lead' &&
      fields.text === undefined
    )
      throw createApiServiceError('Provide text when creating a lead task.');
    if (fields.text !== undefined && !fields.text.trim())
      throw createApiServiceError('text must not be empty.');
    if (taskId !== undefined && fields.type !== undefined)
      throw createApiServiceError('Task type can only be set when creating a task.');
    if (
      taskId === undefined &&
      fields.type === 'outgoing_call' &&
      fields.contactId === undefined
    )
      throw createApiServiceError(
        'contactId is required for an outgoing_call task. This creates a reminder, not a placed call.'
      );
    validateDate(fields.dueDate, 'dueDate');
    const body = pickDefined({
      lead_id: fields.leadId,
      contact_id: fields.contactId,
      text: fields.text,
      assigned_to: fields.assignedTo,
      is_complete: fields.isComplete,
      date: fields.dueDate,
      _type: taskId === undefined ? (fields.type ?? 'lead') : undefined
    });
    const client = new Client(ctx.auth);
    const task =
      taskId !== undefined
        ? await client.updateTask(taskId, body)
        : await client.createTask(body);
    return {
      output: mapTask(task),
      message: `${taskId !== undefined ? 'Updated' : 'Created'} task **${task.id}**.`
    };
  })
  .build();
