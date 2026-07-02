import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

export let timerEvents = SlateTrigger.create(spec, {
  name: 'Timer Events',
  key: 'timer_events',
  description: 'Triggers when a timer is started or stopped.'
})
  .input(
    z.object({
      eventType: z.enum(['started', 'stopped']).describe('Type of timer event'),
      eventId: z.string().describe('Unique event identifier'),
      timerData: z.any().describe('Timer data from the webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('User who started/stopped the timer'),
      userName: z.string().optional().describe('User name'),
      taskId: z.string().optional().describe('Task ID'),
      taskName: z.string().optional().describe('Task name'),
      startedAt: z.string().optional().describe('When the timer was started'),
      durationSeconds: z.number().optional().describe('Timer duration in seconds')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        events: ['api:timer:started', 'api:timer:stopped']
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
        'api:timer:started': 'started',
        'api:timer:stopped': 'stopped'
      };
      let eventType = eventMap[data.event] || 'started';
      let timerData = data.payload || {};

      return {
        inputs: [
          {
            eventType: eventType as any,
            eventId: `timer-${timerData.user?.id || 'unknown'}-${data.event}-${Date.now()}`,
            timerData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let timer = ctx.input.timerData || {};
      return {
        type: `timer.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          userId: timer.user?.id || timer.user,
          userName: timer.user?.name,
          taskId: timer.task?.id,
          taskName: timer.task?.name,
          startedAt: timer.startedAt,
          durationSeconds: timer.duration
        }
      };
    }
  });
