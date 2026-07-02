import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

export let estimateEvents = SlateTrigger.create(spec, {
  name: 'Estimate Events',
  key: 'estimate_events',
  description: 'Triggers when a task estimate is updated.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      estimateData: z.any().describe('Estimate data from the webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.string().optional().describe('Task ID'),
      taskName: z.string().optional().describe('Task name'),
      totalSeconds: z.number().optional().describe('Total estimate in seconds'),
      estimateType: z.string().optional().describe('Estimate type (e.g., overall)'),
      users: z
        .record(z.string(), z.number())
        .optional()
        .describe('Per-user estimates in seconds')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        events: ['api:estimate:updated']
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
      let estimateData = data.payload || {};

      return {
        inputs: [
          {
            eventId: `estimate-${estimateData.task?.id || 'unknown'}-${Date.now()}`,
            estimateData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let est = ctx.input.estimateData || {};
      let task = est.task || {};
      let estimate = est.estimate || task.estimate || {};
      return {
        type: 'estimate.updated',
        id: ctx.input.eventId,
        output: {
          taskId: task.id || est.taskId,
          taskName: task.name,
          totalSeconds: estimate.total,
          estimateType: estimate.type,
          users: estimate.users
        }
      };
    }
  });
