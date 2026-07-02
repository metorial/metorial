import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let taskEventTypes = ['tasksCreated', 'tasksUpdated', 'tasksDeleted'] as const;

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggered when tasks are created, updated, or deleted in Follow Up Boss.'
})
  .input(
    z.object({
      eventType: z.enum(taskEventTypes).describe('Type of task event'),
      eventId: z.string().describe('Unique event ID'),
      taskId: z.number().describe('Task ID affected'),
      resourceUri: z.string().optional().describe('URI to fetch the full resource'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Task ID'),
      eventType: z.string().describe('Type of event'),
      resourceUri: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let eventType of taskEventTypes) {
        let result = await client.createWebhook({
          event: eventType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhooks.push({ webhookId: result.id, event: eventType });
      }

      return { registrationDetails: { webhooks: registeredWebhooks } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhooks = ctx.input.registrationDetails?.webhooks || [];
      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            eventId: String(data.eventId),
            taskId: data.resourceIds?.[0] || 0,
            resourceUri: data.uri,
            timestamp: data.timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let action = ctx.input.eventType.replace('tasks', '').toLowerCase();

      return {
        type: `task.${action}`,
        id: ctx.input.eventId,
        output: {
          taskId: ctx.input.taskId,
          eventType: ctx.input.eventType,
          resourceUri: ctx.input.resourceUri,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
