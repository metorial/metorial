import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let eventNameMap: Record<string, string> = {
  LabelCreated: 'label.created',
  LabelUpdated: 'label.updated',
  LabelDeleted: 'label.deleted'
};

let webhookEventNames = ['LabelCreated', 'LabelUpdated', 'LabelDeleted'];

export let labelEvents = SlateTrigger.create(spec, {
  name: 'Label Events',
  key: 'label_events',
  description:
    'Triggers when data quality labels or certifications are created, updated, or deleted. Tableau Cloud only.'
})
  .input(
    z.object({
      eventType: z.string().describe('Tableau webhook event type'),
      resourceId: z.string().describe('LUID of the affected label'),
      resourceName: z.string().describe('Name of the affected label'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      labelId: z.string().describe('LUID of the affected label'),
      labelName: z.string().describe('Name of the label'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      let webhookIds: Record<string, string> = {};

      for (let eventName of webhookEventNames) {
        let webhook = await client.createWebhook(
          `slates-label-${eventName}`,
          eventName,
          ctx.input.webhookBaseUrl
        );
        webhookIds[eventName] = webhook.id;
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      let webhookIds = ctx.input.registrationDetails?.webhookIds || {};

      for (let webhookId of Object.values(webhookIds) as string[]) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.eventType || body['webhook-source-event-name'] || 'unknown',
            resourceId: body.resource_luid || body.resourceId || '',
            resourceName: body.resource_name || body.resourceName || '',
            siteId: body.site_luid || body.siteId || '',
            timestamp: body.created_at || body.timestamp || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let mappedType = eventNameMap[ctx.input.eventType] || `label.${ctx.input.eventType}`;

      return {
        type: mappedType,
        id: `${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          labelId: ctx.input.resourceId,
          labelName: ctx.input.resourceName,
          siteId: ctx.input.siteId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
