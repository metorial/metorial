import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create a new task or update an existing one in Close CRM.
When creating: provide at least a leadId and text for the task.
When updating: provide the taskId along with any fields to change.`,
  instructions: [
    'To create a new task, omit taskId and provide at least a leadId.',
    'To update an existing task, provide the taskId along with the fields to change.',
    'To mark a task as complete, set isComplete to true.',
    'The type field (lead or outgoing_call) can only be set when creating a task.',
    'dueDate accepts ISO 8601 date or datetime strings.'
  ]
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to update. Omit to create a new task.'),
      leadId: z
        .string()
        .optional()
        .describe('Lead ID to associate the task with (required when creating)'),
      text: z.string().optional().describe('Task description text'),
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
      leadId: z.string().describe('Associated lead ID'),
      text: z.string().describe('Task description text'),
      assignedTo: z.string().describe('User ID the task is assigned to'),
      isComplete: z.boolean().describe('Whether the task is complete'),
      dueDate: z.string().nullable().describe('Due date in ISO 8601 format'),
      type: z.string().describe('Task type'),
      dateCreated: z.string().describe('Creation timestamp'),
      dateUpdated: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let { taskId, ...fields } = ctx.input;
    let task: any;

    let apiData: Record<string, any> = {};
    if (fields.leadId) apiData.lead_id = fields.leadId;
    if (fields.text !== undefined) apiData.text = fields.text;
    if (fields.assignedTo) apiData.assigned_to = fields.assignedTo;
    if (fields.isComplete !== undefined) apiData.is_complete = fields.isComplete;
    if (fields.dueDate !== undefined) apiData.due_date = fields.dueDate;
    if (fields.type) apiData._type = fields.type;

    if (taskId) {
      // Remove type from updates — it can only be set on creation
      apiData._type = undefined;
      task = await client.updateTask(taskId, apiData);
    } else {
      if (!fields.leadId) {
        throw new Error('leadId is required when creating a new task.');
      }
      task = await client.createTask(apiData);
    }

    return {
      output: {
        taskId: task.id,
        leadId: task.lead_id,
        text: task.text ?? '',
        assignedTo: task.assigned_to ?? '',
        isComplete: task.is_complete ?? false,
        dueDate: task.due_date ?? null,
        type: task._type ?? 'lead',
        dateCreated: task.date_created,
        dateUpdated: task.date_updated
      },
      message: taskId
        ? `Updated task **${task.id}**${fields.isComplete ? ' (marked complete)' : ''}.`
        : `Created task **${task.id}** for lead **${task.lead_id}**.`
    };
  })
  .build();
