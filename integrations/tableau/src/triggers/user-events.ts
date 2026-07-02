import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let eventNameMap: Record<string, string> = {
  AdminPromoted: 'user.admin_promoted',
  AdminDemoted: 'user.admin_demoted',
  UserDeleted: 'user.deleted'
};

let webhookEventNames = ['AdminPromoted', 'AdminDemoted', 'UserDeleted'];

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when a user is promoted to or demoted from Site Administrator, or when a user is deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Tableau webhook event type'),
      resourceId: z.string().describe('LUID of the affected user'),
      resourceName: z.string().describe('Name of the affected user'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('LUID of the affected user'),
      userName: z.string().describe('Name of the user'),
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
          `slates-user-${eventName}`,
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
      let mappedType = eventNameMap[ctx.input.eventType] || `user.${ctx.input.eventType}`;

      return {
        type: mappedType,
        id: `${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          userId: ctx.input.resourceId,
          userName: ctx.input.resourceName,
          siteId: ctx.input.siteId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
