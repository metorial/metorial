import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let forecastEventTypes = [
  'forecasts:created',
  'forecasts:updated',
  'forecasts:deleted'
] as const;

export let forecastEvents = SlateTrigger.create(spec, {
  name: 'Forecast Events',
  key: 'forecast_events',
  description:
    'Triggers when forecasts (planned tasks) are created, updated, or deleted in Timely.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      forecastId: z.number().describe('Forecast/task ID'),
      projectId: z.number().nullable().describe('Associated project ID'),
      projectName: z.string().nullable().describe('Associated project name'),
      userId: z.number().nullable().describe('Assigned user ID'),
      userName: z.string().nullable().describe('Assigned user name'),
      day: z.string().nullable().describe('Forecast date'),
      from: z.string().nullable().describe('Start date'),
      to: z.string().nullable().describe('End date'),
      note: z.string().nullable().describe('Task notes'),
      estimatedHours: z.number().nullable().describe('Estimated total hours')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: [...forecastEventTypes]
      });

      return {
        registrationDetails: { webhookId: String(webhook.id) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event ?? data.event_type ?? 'forecasts:updated',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let forecast = payload.data ?? payload;

      let eventType = ctx.input.eventType;
      let typeMap: Record<string, string> = {
        'forecasts:created': 'forecast.created',
        'forecasts:updated': 'forecast.updated',
        'forecasts:deleted': 'forecast.deleted'
      };

      return {
        type: typeMap[eventType] ?? 'forecast.updated',
        id: `forecast-${forecast.id ?? 'unknown'}-${eventType}`,
        output: {
          forecastId: forecast.id ?? 0,
          projectId: forecast.project?.id ?? forecast.project_id ?? null,
          projectName: forecast.project?.name ?? null,
          userId: forecast.user?.id ?? forecast.user_id ?? null,
          userName: forecast.user?.name ?? null,
          day: forecast.day ?? null,
          from: forecast.from ?? null,
          to: forecast.to ?? null,
          note: forecast.note ?? null,
          estimatedHours: forecast.estimated_duration?.total_hours ?? null
        }
      };
    }
  })
  .build();
