import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import type { WebhookNotification } from '../lib/types';
import { spec } from '../spec';

export let contentTypeEvents = SlateTrigger.create(spec, {
  name: 'Content Type Events',
  key: 'content_type_events',
  description:
    'Triggers when content types are created, changed, or deleted in the Kontent.ai environment.'
})
  .input(
    z.object({
      action: z.string().describe('The action (created, changed, deleted)'),
      environmentId: z.string().describe('Environment ID'),
      contentTypeId: z.string().describe('ID of the affected content type'),
      contentTypeName: z.string().describe('Name of the content type'),
      contentTypeCodename: z.string().describe('Codename of the content type'),
      lastModified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .output(
    z.object({
      contentTypeId: z.string().describe('ID of the affected content type'),
      contentTypeName: z.string().describe('Name of the content type'),
      contentTypeCodename: z.string().describe('Codename of the content type'),
      environmentId: z.string().describe('Environment ID'),
      action: z.string().describe('The action (created, changed, deleted)'),
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
        name: 'Slates - Content Type Events',
        url: ctx.input.webhookBaseUrl,
        triggers: {
          management_api_content_changes: [
            {
              type: 'content_type',
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
        .filter(n => n.message?.object_type === 'content_type')
        .map(n => ({
          action: n.message.action,
          environmentId: n.message.environment_id,
          contentTypeId: n.data.system.id,
          contentTypeName: n.data.system.name,
          contentTypeCodename: n.data.system.codename,
          lastModified: n.data.system.last_modified
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `content_type.${ctx.input.action}`,
        id: `${ctx.input.contentTypeId}-${ctx.input.action}-${ctx.input.lastModified || Date.now()}`,
        output: {
          contentTypeId: ctx.input.contentTypeId,
          contentTypeName: ctx.input.contentTypeName,
          contentTypeCodename: ctx.input.contentTypeCodename,
          environmentId: ctx.input.environmentId,
          action: ctx.input.action,
          lastModified: ctx.input.lastModified
        }
      };
    }
  })
  .build();
