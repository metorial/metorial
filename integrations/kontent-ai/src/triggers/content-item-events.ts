import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import type { WebhookNotification } from '../lib/types';
import { spec } from '../spec';

export let contentItemEvents = SlateTrigger.create(spec, {
  name: 'Content Item Events',
  key: 'content_item_events',
  description:
    'Triggers when content items are created, changed, deleted, published, unpublished, or when their workflow step changes.'
})
  .input(
    z.object({
      action: z.string().describe('The action that triggered the event'),
      objectType: z.string().describe('The object type (content_item_variant)'),
      deliverySlot: z
        .string()
        .optional()
        .describe('Whether the event is for preview or published data'),
      environmentId: z.string().describe('Environment ID where the change occurred'),
      contentItemId: z.string().describe('ID of the affected content item'),
      contentItemName: z.string().describe('Name of the content item'),
      contentItemCodename: z.string().describe('Codename of the content item'),
      contentTypeName: z.string().optional().describe('Content type name'),
      languageCodename: z.string().optional().describe('Language of the variant'),
      lastModified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .output(
    z.object({
      contentItemId: z.string().describe('ID of the affected content item'),
      contentItemName: z.string().describe('Name of the content item'),
      contentItemCodename: z.string().describe('Codename of the content item'),
      contentTypeName: z.string().optional().describe('Content type name'),
      languageCodename: z.string().optional().describe('Language of the variant'),
      environmentId: z.string().describe('Environment ID'),
      action: z.string().describe('The action (created, changed, deleted, published, etc.)'),
      deliverySlot: z.string().optional().describe('Preview or published'),
      lastModified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ManagementClient({
        token: ctx.auth.token,
        environmentId: ctx.config.environmentId
      });

      let webhook = await client.createWebhook({
        name: 'Slates - Content Item Events',
        url: ctx.input.webhookBaseUrl,
        triggers: {
          delivery_api_content_changes: [
            {
              type: 'content_item_variant',
              operations: ['publish', 'unpublish']
            }
          ],
          management_api_content_changes: [
            {
              type: 'content_item_variant',
              operations: ['create', 'change', 'delete', 'restore']
            }
          ]
        }
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          webhookSecret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ManagementClient({
        token: ctx.auth.token,
        environmentId: ctx.config.environmentId
      });

      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { notifications?: WebhookNotification[] };
      let notifications = body.notifications || [];

      let inputs = notifications
        .filter(
          n =>
            n.message?.object_type === 'content_item_variant' ||
            n.message?.object_type === 'content_item'
        )
        .map(n => ({
          action: n.message.action,
          objectType: n.message.object_type,
          deliverySlot: n.message.delivery_slot,
          environmentId: n.message.environment_id,
          contentItemId: n.data.system.id,
          contentItemName: n.data.system.name,
          contentItemCodename: n.data.system.codename,
          contentTypeName: n.data.system.type,
          languageCodename: n.data.system.language,
          lastModified: n.data.system.last_modified
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `content_item.${ctx.input.action}`,
        id: `${ctx.input.contentItemId}-${ctx.input.action}-${ctx.input.languageCodename || 'default'}-${ctx.input.lastModified || Date.now()}`,
        output: {
          contentItemId: ctx.input.contentItemId,
          contentItemName: ctx.input.contentItemName,
          contentItemCodename: ctx.input.contentItemCodename,
          contentTypeName: ctx.input.contentTypeName,
          languageCodename: ctx.input.languageCodename,
          environmentId: ctx.input.environmentId,
          action: ctx.input.action,
          deliverySlot: ctx.input.deliverySlot,
          lastModified: ctx.input.lastModified
        }
      };
    }
  })
  .build();
