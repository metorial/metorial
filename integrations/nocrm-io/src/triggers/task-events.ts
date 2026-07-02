import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Post-Sales Task Events',
  key: 'task_events',
  description: 'Fires when post-sales task status changes occur (done, standby, todo).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of task event'),
      webhookId: z.number().optional().describe('Webhook ID'),
      taskId: z.number().optional().describe('ID of the affected task'),
      task: z.any().describe('Task data from the webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.number().optional().describe('Task ID'),
      leadId: z.number().optional().describe('Associated lead ID'),
      taskName: z.string().optional().describe('Task name'),
      taskStatus: z.string().optional().describe('Current task status (todo, standby, done)'),
      processName: z.string().optional().describe('Post-sales process name'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let webhook = await client.createWebhook(
        'task.status.changed',
        ctx.input.webhookBaseUrl
      );
      await client.activateWebhook(webhook.id);

      return {
        registrationDetails: {
          webhooks: [{ webhookId: webhook.id, event: 'task.status.changed' }]
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let webhooks = ctx.input.registrationDetails?.webhooks || [];
      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event || body.webhook_event || 'task.status.changed';
      let task = body.task || body;

      return {
        inputs: [
          {
            eventType,
            webhookId: body.webhook_id,
            taskId: task.id || body.id,
            task
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.task || {};

      return {
        type: ctx.input.eventType || 'task.status.changed',
        id: `${ctx.input.taskId || 'unknown'}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          leadId: task.lead_id,
          taskName: task.name || task.title,
          taskStatus: task.status,
          processName: task.process_name,
          updatedAt: task.updated_at
        }
      };
    }
  })
  .build();
