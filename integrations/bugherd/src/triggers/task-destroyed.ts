import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let taskDestroyed = SlateTrigger.create(spec, {
  name: 'Task Destroyed',
  key: 'task_destroyed',
  description: 'Fires when a task is deleted from a BugHerd project.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      taskId: z.number().describe('Global task ID'),
      projectId: z.number().describe('Project ID')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Global task ID of the destroyed task'),
      projectId: z.number().describe('Project ID the task belonged to')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, 'task_destroy');

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let task = data.task ?? data;

      return {
        inputs: [
          {
            eventId: `task_destroyed_${task.id}_${Date.now()}`,
            taskId: task.id,
            projectId: task.project_id ?? 0
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.destroyed',
        id: ctx.input.eventId,
        output: {
          taskId: ctx.input.taskId,
          projectId: ctx.input.projectId
        }
      };
    }
  })
  .build();
