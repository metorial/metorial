import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

let TASK_EVENT_TYPES = ['task.created', 'task.updated', 'task.deleted'] as const;

export let taskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers when tasks are created, updated, or deleted in the workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of task event'),
      eventId: z.string().describe('Unique event identifier'),
      taskId: z.string().describe('The task ID'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The task ID'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        TASK_EVENT_TYPES.map(eventType => ({ eventType }))
      );

      return {
        registrationDetails: {
          webhookId: webhook.id?.webhook_id ?? webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let events = body.events ?? [];

      let inputs = events
        .filter((e: any) => TASK_EVENT_TYPES.includes(e.event_type))
        .map((e: any) => ({
          eventType: e.event_type,
          eventId: e.id?.event_id ?? `${e.event_type}-${e.id?.task_id}-${Date.now()}`,
          taskId: e.id?.task_id ?? '',
          actorType: e.actor?.type,
          actorId: e.actor?.id
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          taskId: ctx.input.taskId,
          actorType: ctx.input.actorType,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
