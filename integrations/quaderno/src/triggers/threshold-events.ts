import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ALL_THRESHOLD_EVENTS = ['threshold.warning', 'threshold.exceeded', 'threshold.eu.100k'];

export let thresholdEvents = SlateTrigger.create(spec, {
  name: 'Tax Threshold Events',
  key: 'threshold_events',
  description:
    'Triggered when tax thresholds are approaching, exceeded, or when EU digital services sales reach certain limits.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier'),
      thresholdData: z.any().describe('Full threshold payload from webhook')
    })
  )
  .output(
    z.object({
      country: z.string().optional().describe('Country code'),
      region: z.string().optional().describe('Region/state'),
      thresholdAmount: z.string().optional().describe('Threshold amount'),
      currentAmount: z.string().optional().describe('Current sales amount towards threshold'),
      currency: z.string().optional().describe('Currency code'),
      jurisdictionName: z.string().optional().describe('Jurisdiction name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events_types: ALL_THRESHOLD_EVENTS
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.event_type || body.type || '';
      let data = body.data || body;
      let eventId = `${eventType}-${data.country || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            thresholdData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.thresholdData;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          country: data.country,
          region: data.region,
          thresholdAmount: data.threshold_amount?.toString(),
          currentAmount: data.current_amount?.toString(),
          currency: data.currency,
          jurisdictionName: data.jurisdiction_name || data.name
        }
      };
    }
  })
  .build();
