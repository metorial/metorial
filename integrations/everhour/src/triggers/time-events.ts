import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

export let timeEvents = SlateTrigger.create(spec, {
  name: 'Time Events',
  key: 'time_events',
  description: 'Triggers when a time record is added, edited, or removed on a task.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      timeData: z.any().describe('Time record data from the webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.string().optional().describe('Task ID the time was recorded on'),
      taskName: z.string().optional().describe('Task name'),
      userId: z.number().optional().describe('User who logged the time'),
      timeSeconds: z.number().optional().describe('Time in seconds'),
      date: z.string().optional().describe('Date of the time record')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        events: ['api:time:updated']
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
      let timeData = data.payload || {};

      return {
        inputs: [
          {
            eventId: `time-${timeData.task?.id || 'unknown'}-${Date.now()}`,
            timeData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let timeData = ctx.input.timeData || {};
      return {
        type: 'time.updated',
        id: ctx.input.eventId,
        output: {
          taskId: timeData.task?.id || timeData.taskId,
          taskName: timeData.task?.name,
          userId: timeData.user,
          timeSeconds: timeData.time?.total || timeData.time,
          date: timeData.date
        }
      };
    }
  });
