import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let featureEventTypes = ['feature.created', 'feature.updated', 'feature.deleted'] as const;

export let featureEventsTrigger = SlateTrigger.create(spec, {
  name: 'Feature Events',
  key: 'feature_events',
  description:
    'Triggered when features are created, updated, or deleted in the workspace. Includes changes to feature attributes such as status, name, description, timeframes, and custom field values.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of feature event'),
      eventId: z.string().describe('Unique event identifier'),
      featureId: z.string().describe('ID of the affected feature'),
      featureName: z.string().optional().describe('Name of the feature'),
      raw: z.record(z.string(), z.any()).optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      featureId: z.string().describe('ID of the affected feature'),
      featureName: z.string().optional().describe('Name of the feature'),
      feature: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full feature data if available')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhookIds: string[] = [];

      for (let eventType of featureEventTypes) {
        let webhook = await client.createWebhook({
          notificationUrl: ctx.input.webhookBaseUrl,
          eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      // Handle probe/verification request
      if (body.type === 'probe' || body.eventType === 'probe') {
        return { inputs: [] };
      }

      let eventType = body.eventType || body.type || 'feature.updated';
      let featureData = body.data || body;
      let featureId = featureData?.id || featureData?.feature?.id || '';
      let featureName = featureData?.name || featureData?.feature?.name;

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}-${featureId}-${Date.now()}`,
            featureId,
            featureName,
            raw: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let featureData: Record<string, any> | undefined;

      // If feature wasn't deleted, try to fetch current data
      if (!ctx.input.eventType.includes('deleted') && ctx.input.featureId) {
        try {
          let client = new Client({ token: ctx.auth.token });
          featureData = await client.getFeature(ctx.input.featureId);
        } catch {
          // Feature may have been deleted between event and processing
        }
      }

      let rawData = ctx.input.raw as Record<string, any> | undefined;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          featureId: ctx.input.featureId,
          featureName: ctx.input.featureName || featureData?.name,
          feature: featureData || (rawData?.data as Record<string, any> | undefined)
        }
      };
    }
  })
  .build();
