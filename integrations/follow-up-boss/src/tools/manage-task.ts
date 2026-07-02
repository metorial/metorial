import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, retrieve, or delete a task in Follow Up Boss. Tasks are used for follow-up reminders and to-dos assigned to team members.`,
  instructions: [
    'To create a task, provide personId, assignedTo, and dueDate at minimum.',
    'To update, provide the taskId and the fields to change.',
    'To retrieve, provide only the taskId.',
    'To delete, set "delete" to true with a taskId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z
        .number()
        .optional()
        .describe('ID of an existing task to update, retrieve, or delete'),
      personId: z.number().optional().describe('Contact ID the task is associated with'),
      assignedTo: z.number().optional().describe('User ID the task is assigned to'),
      name: z.string().optional().describe('Task name/title'),
      dueDate: z.string().optional().describe('Due date (ISO 8601)'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      note: z.string().optional().describe('Additional note on the task'),
      delete: z.boolean().optional().describe('Set to true to delete the task')
    })
  )
  .output(
    z.object({
      taskId: z.number().optional(),
      personId: z.number().optional(),
      assignedTo: z.number().optional(),
      name: z.string().optional(),
      dueDate: z.string().optional(),
      completed: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.delete && ctx.input.taskId) {
      await client.deleteTask(ctx.input.taskId);
      return {
        output: { taskId: ctx.input.taskId, deleted: true },
        message: `Deleted task **${ctx.input.taskId}**.`
      };
    }

    if (
      ctx.input.taskId &&
      !ctx.input.name &&
      !ctx.input.dueDate &&
      !ctx.input.completed &&
      !ctx.input.assignedTo &&
      !ctx.input.note &&
      !ctx.input.personId
    ) {
      let task = await client.getTask(ctx.input.taskId);
      return {
        output: {
          taskId: task.id,
          personId: task.personId,
          assignedTo: task.assignedTo,
          name: task.name,
          dueDate: task.dueDate,
          completed: task.completed
        },
        message: `Retrieved task **${task.name || task.id}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.personId !== undefined) data.personId = ctx.input.personId;
    if (ctx.input.assignedTo !== undefined) data.assignedTo = ctx.input.assignedTo;
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.dueDate !== undefined) data.dueDate = ctx.input.dueDate;
    if (ctx.input.completed !== undefined) data.completed = ctx.input.completed;
    if (ctx.input.note !== undefined) data.note = ctx.input.note;

    let task: any;
    let action: string;

    if (ctx.input.taskId) {
      task = await client.updateTask(ctx.input.taskId, data);
      action = 'Updated';
    } else {
      task = await client.createTask(data);
      action = 'Created';
    }

    return {
      output: {
        taskId: task.id,
        personId: task.personId,
        assignedTo: task.assignedTo,
        name: task.name,
        dueDate: task.dueDate,
        completed: task.completed
      },
      message: `${action} task **${task.name || task.id}**.`
    };
  })
  .build();
