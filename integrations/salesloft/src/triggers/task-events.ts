import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = ['task_created', 'task_updated', 'task_completed', 'task_deleted'] as const;

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers when a task is created, updated, completed, or deleted in SalesLoft.'
})
  .input(
    z.object({
      eventType: z.enum(EVENT_TYPES).describe('Type of task event'),
      eventId: z.string().describe('Unique event identifier'),
      task: z.any().describe('Task data from webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('SalesLoft task ID'),
      subject: z.string().nullable().optional().describe('Task subject'),
      taskType: z.string().nullable().optional().describe('Task type'),
      status: z.string().nullable().optional().describe('Task status'),
      currentState: z.string().nullable().optional().describe('Current task state'),
      dueDate: z.string().nullable().optional().describe('Due date'),
      description: z.string().nullable().optional().describe('Task description'),
      completed: z.boolean().nullable().optional().describe('Whether the task is completed'),
      completedAt: z.string().nullable().optional().describe('Completion timestamp'),
      personId: z.number().nullable().optional().describe('Associated person ID'),
      userId: z.number().nullable().optional().describe('Assigned user ID'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ subscriptionId: number; eventType: string }> = [];

      for (let eventType of EVENT_TYPES) {
        let subscription = await client.createWebhookSubscription(
          ctx.input.webhookBaseUrl,
          eventType
        );
        registrations.push({
          subscriptionId: subscription.id,
          eventType
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ subscriptionId: number }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteWebhookSubscription(reg.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = ctx.request.headers.get('x-salesloft-event') || 'task_updated';

      return {
        inputs: [
          {
            eventType: eventType as (typeof EVENT_TYPES)[number],
            eventId: `${eventType}_${body?.id || Date.now()}`,
            task: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.task;

      return {
        type: `task.${ctx.input.eventType.replace('task_', '')}`,
        id: ctx.input.eventId,
        output: {
          taskId: raw.id,
          subject: raw.subject,
          taskType: raw.task_type,
          status: raw.status,
          currentState: raw.current_state,
          dueDate: raw.due_date,
          description: raw.description,
          completed: raw.completed,
          completedAt: raw.completed_at,
          personId: raw.person?.id ?? null,
          userId: raw.user?.id ?? null,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        }
      };
    }
  })
  .build();
