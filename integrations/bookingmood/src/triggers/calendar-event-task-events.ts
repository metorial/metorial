import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let calendarEventTaskEvents = SlateTrigger.create(spec, {
  name: 'Calendar Event Task Events',
  key: 'calendar_event_task_events',
  description:
    'Triggers when a task linked to a calendar event is created, updated, or completed.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z
        .string()
        .describe('Event type: calendar_event_tasks.created, updated, or completed'),
      taskNew: z.any().describe('New task data'),
      taskOld: z.any().nullable().describe('Previous task data')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('UUID of the task'),
      calendarEventId: z.string().describe('UUID of the related calendar event'),
      taskTemplateId: z.string().nullable().describe('UUID of the task template'),
      label: z.string().describe('Task label'),
      schedule: z.string().describe('Task schedule: manual, arrival, or departure'),
      dueAt: z.string().nullable().describe('Task deadline'),
      completedAt: z.string().nullable().describe('Completion timestamp'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: [
          'calendar_event_tasks.created',
          'calendar_event_tasks.updated',
          'calendar_event_tasks.completed'
        ],
        description: 'Slates: Calendar Event Task Events'
      });
      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            taskNew: data.payload?.new ?? null,
            taskOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.taskNew;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          taskId: task.id,
          calendarEventId: task.calendar_event_id,
          taskTemplateId: task.task_template_id ?? null,
          label: task.label,
          schedule: task.schedule,
          dueAt: task.due_at ?? null,
          completedAt: task.completed_at ?? null,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        }
      };
    }
  })
  .build();
