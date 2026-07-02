import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let viewEvents = SlateTrigger.create(spec, {
  name: 'View Events',
  key: 'view_events',
  description: 'Triggers when a view is deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Tableau webhook event type'),
      resourceId: z.string().describe('LUID of the affected view'),
      resourceName: z.string().describe('Name of the affected view'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      viewId: z.string().describe('LUID of the affected view'),
      viewName: z.string().describe('Name of the view'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let webhook = await client.createWebhook(
        'slates-view-ViewDeleted',
        'ViewDeleted',
        ctx.input.webhookBaseUrl
      );

      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      let webhookId = ctx.input.registrationDetails?.webhookId;

      if (webhookId) {
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
            eventType: body.eventType || body['webhook-source-event-name'] || 'ViewDeleted',
            resourceId: body.resource_luid || body.resourceId || '',
            resourceName: body.resource_name || body.resourceName || '',
            siteId: body.site_luid || body.siteId || '',
            timestamp: body.created_at || body.timestamp || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'view.deleted',
        id: `${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          viewId: ctx.input.resourceId,
          viewName: ctx.input.resourceName,
          siteId: ctx.input.siteId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
