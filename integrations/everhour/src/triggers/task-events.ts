import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers when a task is created, updated, or removed in Everhour.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'removed']).describe('Type of task event'),
      eventId: z.string().describe('Unique event identifier'),
      task: z.any().describe('Task data from the webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      name: z.string().optional().describe('Task name'),
      projects: z.array(z.string()).optional().describe('Project IDs'),
      section: z.number().optional().describe('Section ID'),
      labels: z.array(z.string()).optional().describe('Task labels'),
      status: z.string().optional().describe('Task status'),
      description: z.string().optional().describe('Task description'),
      dueAt: z.string().optional().describe('Due date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        events: ['api:task:created', 'api:task:updated', 'api:task:removed']
      });
      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let hookSecret = ctx.request.headers.get('X-Hook-Secret');
      if (hookSecret) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'X-Hook-Secret': hookSecret }
          })
        };
      }

      let data = (await ctx.request.json()) as any;
      let eventMap: Record<string, string> = {
        'api:task:created': 'created',
        'api:task:updated': 'updated',
        'api:task:removed': 'removed'
      };

      let eventType = eventMap[data.event] || 'updated';
      let task = data.payload?.task || data.payload || {};

      return {
        inputs: [
          {
            eventType: eventType as any,
            eventId: `task-${task.id || 'unknown'}-${data.event}-${Date.now()}`,
            task
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.task || {};
      return {
        type: `task.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          taskId: task.id || '',
          name: task.name,
          projects: task.projects,
          section: task.section,
          labels: task.labels,
          status: task.status,
          description: task.description,
          dueAt: task.dueAt
        }
      };
    }
  });
