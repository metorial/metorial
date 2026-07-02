import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Updates a task. Change the label, schedule, due date, or mark it as completed by setting a completedAt timestamp.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('UUID of the task to update'),
      label: z.string().optional().describe('New task label'),
      schedule: z
        .enum(['manual', 'arrival', 'departure'])
        .optional()
        .describe('New schedule type'),
      dueAt: z.string().optional().describe('New due date (ISO timestamp)'),
      completedAt: z
        .string()
        .nullable()
        .optional()
        .describe('Completion timestamp (set to mark complete, null to un-complete)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('UUID of the updated task'),
      label: z.string().describe('Task label'),
      schedule: z.string().describe('Task schedule'),
      completedAt: z.string().nullable().describe('Completion timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.label !== undefined) data.label = ctx.input.label;
    if (ctx.input.schedule !== undefined) data.schedule = ctx.input.schedule;
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;
    if (ctx.input.completedAt !== undefined) data.completed_at = ctx.input.completedAt;

    let result = await client.updateTask(ctx.input.taskId, data);

    return {
      output: {
        taskId: result.id,
        label: result.label,
        schedule: result.schedule,
        completedAt: result.completed_at ?? null,
        updatedAt: result.updated_at
      },
      message: `Task **"${result.label}"** updated.${result.completed_at ? ' Marked as completed.' : ''}`
    };
  })
  .build();
