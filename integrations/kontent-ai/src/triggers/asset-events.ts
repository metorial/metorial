import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import type { WebhookNotification } from '../lib/types';
import { spec } from '../spec';

export let assetEvents = SlateTrigger.create(spec, {
  name: 'Asset Events',
  key: 'asset_events',
  description:
    'Triggers when assets are created, changed, or deleted in the Kontent.ai environment.'
})
  .input(
    z.object({
      action: z.string().describe('The action (created, changed, deleted, metadata_changed)'),
      environmentId: z.string().describe('Environment ID'),
      assetId: z.string().describe('ID of the affected asset'),
      assetName: z.string().describe('Name of the asset'),
      assetCodename: z.string().describe('Codename of the asset'),
      lastModified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the affected asset'),
      assetName: z.string().describe('Name of the asset'),
      assetCodename: z.string().describe('Codename of the asset'),
      environmentId: z.string().describe('Environment ID'),
      action: z.string().describe('The action (created, changed, deleted, metadata_changed)'),
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
        name: 'Slates - Asset Events',
        url: ctx.input.webhookBaseUrl,
        triggers: {
          management_api_content_changes: [
            {
              type: 'asset',
              operations: ['create', 'change', 'delete']
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
        .filter(n => n.message?.object_type === 'asset')
        .map(n => ({
          action: n.message.action,
          environmentId: n.message.environment_id,
          assetId: n.data.system.id,
          assetName: n.data.system.name,
          assetCodename: n.data.system.codename,
          lastModified: n.data.system.last_modified
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `asset.${ctx.input.action}`,
        id: `${ctx.input.assetId}-${ctx.input.action}-${ctx.input.lastModified || Date.now()}`,
        output: {
          assetId: ctx.input.assetId,
          assetName: ctx.input.assetName,
          assetCodename: ctx.input.assetCodename,
          environmentId: ctx.input.environmentId,
          action: ctx.input.action,
          lastModified: ctx.input.lastModified
        }
      };
    }
  })
  .build();
