import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Creates a new task for a calendar event. Tasks can be scheduled relative to arrival, departure, or manually with a specific due date.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      calendarEventId: z.string().describe('UUID of the calendar event to attach the task to'),
      label: z.string().describe('Task label/description'),
      schedule: z
        .enum(['manual', 'arrival', 'departure'])
        .describe('When the task is due relative to the event'),
      dueAt: z
        .string()
        .optional()
        .describe('Specific due date (ISO timestamp) for manual schedule'),
      taskTemplateId: z.string().optional().describe('UUID of a task template to base this on')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('UUID of the created task'),
      calendarEventId: z.string().describe('UUID of the calendar event'),
      label: z.string().describe('Task label'),
      schedule: z.string().describe('Task schedule'),
      dueAt: z.string().nullable().describe('Task due date'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {
      calendar_event_id: ctx.input.calendarEventId,
      label: ctx.input.label,
      schedule: ctx.input.schedule
    };
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;
    if (ctx.input.taskTemplateId !== undefined)
      data.task_template_id = ctx.input.taskTemplateId;

    let result = await client.createTask(data);

    return {
      output: {
        taskId: result.id,
        calendarEventId: result.calendar_event_id,
        label: result.label,
        schedule: result.schedule,
        dueAt: result.due_at ?? null,
        createdAt: result.created_at
      },
      message: `Task **"${result.label}"** created (schedule: ${result.schedule}).`
    };
  })
  .build();
