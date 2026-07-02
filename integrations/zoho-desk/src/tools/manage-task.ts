import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, or retrieve a task. Tasks can be standalone or associated with tickets. Specify an existing taskId to update or retrieve, or omit it to create a new task.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z
        .string()
        .optional()
        .describe('Existing task ID to update or retrieve. Omit to create a new task.'),
      subject: z.string().optional().describe('Task subject'),
      description: z.string().optional().describe('Task description'),
      status: z
        .string()
        .optional()
        .describe('Task status (e.g., Not Started, In Progress, Completed)'),
      priority: z.string().optional().describe('Task priority (e.g., Low, Medium, High)'),
      dueDate: z.string().optional().describe('Due date in ISO format'),
      departmentId: z.string().optional().describe('Department ID'),
      assigneeId: z.string().optional().describe('Agent ID to assign the task to'),
      ticketId: z.string().optional().describe('Ticket ID to associate the task with'),
      category: z.string().optional().describe('Task category'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the task'),
      subject: z.string().optional().describe('Task subject'),
      status: z.string().optional().describe('Task status'),
      priority: z.string().optional().describe('Task priority'),
      dueDate: z.string().optional().describe('Due date'),
      createdTime: z.string().optional().describe('Creation time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { taskId, customFields, ...fields } = ctx.input;

    let taskData: Record<string, any> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) taskData[key] = value;
    }
    if (customFields) taskData.cf = customFields;

    let result: any;
    let action: string;

    if (taskId && Object.keys(taskData).length > 0) {
      result = await client.updateTask(taskId, taskData);
      action = 'Updated';
    } else if (taskId) {
      result = await client.getTask(taskId);
      action = 'Retrieved';
    } else {
      result = await client.createTask(taskData);
      action = 'Created';
    }

    return {
      output: {
        taskId: result.id,
        subject: result.subject,
        status: result.status,
        priority: result.priority,
        dueDate: result.dueDate,
        createdTime: result.createdTime
      },
      message: `${action} task **${result.subject || result.id}**`
    };
  })
  .build();
