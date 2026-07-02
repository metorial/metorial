import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Firmao. Modify name, description, status, priority, dates, time estimates, and assigned users. Only provided fields will be changed.`
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      name: z.string().optional().describe('Updated task name'),
      description: z.string().optional().describe('Updated description'),
      status: z.string().optional().describe('Updated status (WAITING, IN_PROGRESS, DONE)'),
      priority: z.string().optional().describe('Updated priority'),
      plannedStartDate: z
        .string()
        .optional()
        .describe('Updated planned start date (ISO 8601)'),
      plannedEndDate: z.string().optional().describe('Updated planned end date (ISO 8601)'),
      estimatedHours: z.number().optional().describe('Updated estimated hours'),
      responsibleUserIds: z
        .array(z.number())
        .optional()
        .describe('Updated responsible user IDs')
    })
  )
  .output(
    z.object({
      taskId: z.number(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.priority) body.priority = ctx.input.priority;
    if (ctx.input.plannedStartDate) body.plannedStartDate = ctx.input.plannedStartDate;
    if (ctx.input.plannedEndDate) body.plannedEndDate = ctx.input.plannedEndDate;
    if (ctx.input.estimatedHours !== undefined) body.estimatedHours = ctx.input.estimatedHours;
    if (ctx.input.responsibleUserIds)
      body.responsibleUsers = ctx.input.responsibleUserIds.map(id => ({ id }));

    await client.update('tasks', ctx.input.taskId, body);

    return {
      output: {
        taskId: ctx.input.taskId,
        updated: true
      },
      message: `Updated task ID **${ctx.input.taskId}**.`
    };
  })
  .build();
