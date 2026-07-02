import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('UUID of the task'),
  calendarEventId: z.string().describe('UUID of the related calendar event'),
  taskTemplateId: z.string().nullable().describe('UUID of the task template'),
  label: z.string().describe('Task label/description'),
  schedule: z.string().describe('Timing: manual, arrival, or departure'),
  dueAt: z.string().nullable().describe('Task deadline'),
  completedAt: z.string().nullable().describe('Completion timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Lists tasks associated with calendar events (e.g., cleaning, maintenance). Filter by calendar event, completion status, or schedule type.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      calendarEventId: z.string().optional().describe('Filter by calendar event UUID'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional PostgREST-style filters'),
      order: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let filters = { ...ctx.input.filters };
    if (ctx.input.calendarEventId)
      filters.calendar_event_id = `eq.${ctx.input.calendarEventId}`;

    let tasks = await client.listTasks({
      select:
        'id,calendar_event_id,task_template_id,label,schedule,due_at,completed_at,created_at,updated_at',
      filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (tasks || []).map((t: any) => ({
      taskId: t.id,
      calendarEventId: t.calendar_event_id,
      taskTemplateId: t.task_template_id ?? null,
      label: t.label,
      schedule: t.schedule,
      dueAt: t.due_at ?? null,
      completedAt: t.completed_at ?? null,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: { tasks: mapped },
      message: `Found **${mapped.length}** task(s).`
    };
  })
  .build();
