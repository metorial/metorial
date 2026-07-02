import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create or update a task in Freshsales. Tasks can be associated with contacts, leads, deals, or accounts using **targetableType** and **targetableId**.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z
        .number()
        .optional()
        .describe('ID of the task to update. Omit to create a new task.'),
      title: z.string().optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date in ISO format (e.g. "2026-03-15T10:00:00Z")'),
      ownerId: z.number().optional().describe('Assigned user ID'),
      targetableId: z
        .number()
        .optional()
        .describe('ID of the associated record (contact, lead, deal, or account)'),
      targetableType: z
        .enum(['Contact', 'Lead', 'Deal', 'SalesAccount'])
        .optional()
        .describe('Type of the associated record'),
      status: z.number().optional().describe('Task status (0 = open, 1 = completed)'),
      taskTypeId: z.number().optional().describe('Task type ID'),
      outcomeId: z.number().optional().describe('Task outcome ID')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the task'),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      status: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let taskData: Record<string, any> = {};
    if (ctx.input.title !== undefined) taskData.title = ctx.input.title;
    if (ctx.input.description !== undefined) taskData.description = ctx.input.description;
    if (ctx.input.dueDate !== undefined) taskData.due_date = ctx.input.dueDate;
    if (ctx.input.ownerId !== undefined) taskData.owner_id = ctx.input.ownerId;
    if (ctx.input.targetableId !== undefined) taskData.targetable_id = ctx.input.targetableId;
    if (ctx.input.targetableType !== undefined)
      taskData.targetable_type = ctx.input.targetableType;
    if (ctx.input.status !== undefined) taskData.status = ctx.input.status;
    if (ctx.input.taskTypeId !== undefined) taskData.task_type_id = ctx.input.taskTypeId;
    if (ctx.input.outcomeId !== undefined) taskData.outcome_id = ctx.input.outcomeId;

    let task: Record<string, any>;
    let action: string;

    if (ctx.input.taskId) {
      task = await client.updateTask(ctx.input.taskId, taskData);
      action = 'updated';
    } else {
      task = await client.createTask(taskData);
      action = 'created';
    }

    return {
      output: {
        taskId: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date,
        ownerId: task.owner_id,
        status: task.status,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      },
      message: `Task **${task.title || task.id}** ${action} successfully.`
    };
  })
  .build();
