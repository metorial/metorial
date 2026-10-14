import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, retrieve, or delete a task in Follow Up Boss. Tasks are used for follow-up reminders and to-dos assigned to team members.`,
  instructions: [
    'To create a task, provide personId and assignedTo. Use list_users to find the assigned user ID.',
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
      note: z
        .string()
        .optional()
        .describe('Unsupported by the task API; use manage_note to record contact notes'),
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
      ctx.input.taskId !== undefined &&
      Object.entries(ctx.input).every(
        ([key, value]) => key === 'taskId' || key === 'delete' || value === undefined
      )
    ) {
      let task = await client.getTask(ctx.input.taskId);
      return {
        output: {
          taskId: task.id,
          personId: task.personId,
          assignedTo: task.assignedUserId,
          name: task.name,
          dueDate: task.dueDate,
          completed:
            task.isCompleted === undefined || task.isCompleted === null
              ? undefined
              : task.isCompleted === true || task.isCompleted === 1
        },
        message: `Retrieved task **${task.name || task.id}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.personId !== undefined) data.personId = ctx.input.personId;
    if (ctx.input.assignedTo !== undefined) data.assignedUserId = ctx.input.assignedTo;
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.dueDate !== undefined) data.dueDate = ctx.input.dueDate;
    if (ctx.input.completed !== undefined) data.isCompleted = ctx.input.completed;
    if (ctx.input.note !== undefined) {
      throw createApiServiceError(
        'Task notes are not supported by Follow Up Boss. Use manage_note to add a note to the contact.'
      );
    }
    if (ctx.input.delete && ctx.input.taskId === undefined) {
      throw createApiServiceError('Provide taskId to delete a task.');
    }
    if (
      ctx.input.taskId === undefined &&
      (ctx.input.personId === undefined || ctx.input.assignedTo === undefined)
    ) {
      throw createApiServiceError('Provide personId and assignedTo to create a task.');
    }

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
        assignedTo: task.assignedUserId,
        name: task.name,
        dueDate: task.dueDate,
        completed:
          task.isCompleted === undefined || task.isCompleted === null
            ? undefined
            : task.isCompleted === true || task.isCompleted === 1
      },
      message: `${action} task **${task.name || task.id}**.`
    };
  })
  .build();
