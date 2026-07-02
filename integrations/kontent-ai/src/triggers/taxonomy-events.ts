import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import type { WebhookNotification } from '../lib/types';
import { spec } from '../spec';

export let taxonomyEvents = SlateTrigger.create(spec, {
  name: 'Taxonomy Events',
  key: 'taxonomy_events',
  description:
    'Triggers when taxonomy groups or their terms are created, changed, moved, or deleted in the Kontent.ai environment.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe(
          'The action (created, metadata_changed, deleted, term_created, term_changed, term_deleted, terms_moved)'
        ),
      environmentId: z.string().describe('Environment ID'),
      taxonomyGroupId: z.string().describe('ID of the affected taxonomy group'),
      taxonomyGroupName: z.string().describe('Name of the taxonomy group'),
      taxonomyGroupCodename: z.string().describe('Codename of the taxonomy group'),
      lastModified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .output(
    z.object({
      taxonomyGroupId: z.string().describe('ID of the affected taxonomy group'),
      taxonomyGroupName: z.string().describe('Name of the taxonomy group'),
      taxonomyGroupCodename: z.string().describe('Codename of the taxonomy group'),
      environmentId: z.string().describe('Environment ID'),
      action: z.string().describe('The action that occurred'),
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
        name: 'Slates - Taxonomy Events',
        url: ctx.input.webhookBaseUrl,
        triggers: {
          management_api_content_changes: [
            {
              type: 'taxonomy',
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
        .filter(n => n.message?.object_type === 'taxonomy')
        .map(n => ({
          action: n.message.action,
          environmentId: n.message.environment_id,
          taxonomyGroupId: n.data.system.id,
          taxonomyGroupName: n.data.system.name,
          taxonomyGroupCodename: n.data.system.codename,
          lastModified: n.data.system.last_modified
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `taxonomy.${ctx.input.action}`,
        id: `${ctx.input.taxonomyGroupId}-${ctx.input.action}-${ctx.input.lastModified || Date.now()}`,
        output: {
          taxonomyGroupId: ctx.input.taxonomyGroupId,
          taxonomyGroupName: ctx.input.taxonomyGroupName,
          taxonomyGroupCodename: ctx.input.taxonomyGroupCodename,
          environmentId: ctx.input.environmentId,
          action: ctx.input.action,
          lastModified: ctx.input.lastModified
        }
      };
    }
  })
  .build();
