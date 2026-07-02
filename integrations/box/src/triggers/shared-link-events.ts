import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sharedLinkEventTypes = [
  'SHARED_LINK.CREATED',
  'SHARED_LINK.UPDATED',
  'SHARED_LINK.DELETED'
] as const;

export let sharedLinkEvents = SlateTrigger.create(spec, {
  name: 'Shared Link Events',
  key: 'shared_link_events',
  description:
    'Triggers when shared links are created, updated, or deleted on Box files or folders.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Box webhook event type (e.g. SHARED_LINK.CREATED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The item object with shared link from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the item with the shared link'),
      itemType: z.string().optional().describe('Type of the item (file or folder)'),
      itemName: z.string().optional().describe('Name of the item'),
      sharedLinkUrl: z.string().optional().describe('URL of the shared link'),
      sharedLinkAccess: z.string().optional().describe('Access level of the shared link'),
      triggeredByUserId: z
        .string()
        .optional()
        .describe('ID of the user who triggered the event'),
      triggeredByUserName: z
        .string()
        .optional()
        .describe('Name of the user who triggered the event'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook('folder', '0', ctx.input.webhookBaseUrl, [
        ...sharedLinkEventTypes
      ]);
      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            eventType: data.trigger,
            webhookId: data.webhook?.id || '',
            triggeredAt: data.created_at || new Date().toISOString(),
            source: data.source,
            triggeredBy: data.created_by
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let source = ctx.input.source || {};
      let triggeredBy = ctx.input.triggeredBy || {};
      let eventType = ctx.input.eventType.toLowerCase().replace('.', '.');

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${source.id || ''}-${ctx.input.triggeredAt}`,
        output: {
          itemId: source.id || '',
          itemType: source.type,
          itemName: source.name,
          sharedLinkUrl: source.shared_link?.url,
          sharedLinkAccess: source.shared_link?.access,
          triggeredByUserId: triggeredBy.id,
          triggeredByUserName: triggeredBy.name,
          triggeredAt: ctx.input.triggeredAt
        }
      };
    }
  });
