import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let alertEvents = SlateTrigger.create(spec, {
  name: 'Alert Events',
  key: 'alert_events',
  description: 'Triggers when new alerts are created in Rootly.'
})
  .input(
    z.object({
      eventType: z.string().describe('The alert event type'),
      eventId: z.string().describe('Unique event identifier'),
      alert: z.record(z.string(), z.any()).describe('Alert data from webhook payload')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('Alert ID'),
      source: z.string().optional().describe('Alert source'),
      summary: z.string().optional().describe('Alert summary'),
      description: z.string().optional().describe('Alert description'),
      status: z.string().optional().describe('Alert status'),
      externalId: z.string().optional().describe('External ID from source system'),
      externalUrl: z.string().optional().describe('URL in source system'),
      createdAt: z.string().optional().describe('When the alert was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhookEndpoint({
        name: `Slates Alert Events`,
        url: ctx.input.webhookBaseUrl,
        eventTypes: ['alert.created'],
        enabled: true
      });

      let endpoint = Array.isArray(result.data) ? result.data[0] : result.data;

      return {
        registrationDetails: {
          webhookEndpointId: endpoint!.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.type || body?.event_type || 'alert.created';
      let alertData = body?.data?.attributes || body?.data || body;
      let alertId = body?.data?.id || alertData?.id || '';

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: `${eventType}-${alertId}-${Date.now()}`,
            alert: alertData as Record<string, any>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let alert = ctx.input.alert as Record<string, any>;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          alertId: String(alert.id ?? ''),
          source: alert.source as string | undefined,
          summary: alert.summary as string | undefined,
          description: alert.description as string | undefined,
          status: alert.status as string | undefined,
          externalId: alert.external_id as string | undefined,
          externalUrl: alert.external_url as string | undefined,
          createdAt: alert.created_at as string | undefined
        }
      };
    }
  })
  .build();
