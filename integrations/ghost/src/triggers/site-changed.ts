import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

export let siteChanged = SlateTrigger.create(spec, {
  name: 'Site Changed',
  key: 'site_changed',
  description:
    'Triggered whenever any content changes in site data or settings. Useful for triggering static site rebuilds or cache invalidation.'
})
  .input(
    z.object({
      timestamp: z.string().describe('Timestamp of the change event')
    })
  )
  .output(
    z.object({
      timestamp: z.string().describe('Timestamp when the site change was detected')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let result = await client.createWebhook({
        event: 'site.changed',
        targetUrl: ctx.input.webhookBaseUrl,
        name: 'Slates: site.changed'
      });

      return { registrationDetails: { webhookId: result.webhooks[0].id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let details = ctx.input.registrationDetails as { webhookId: string };
      try {
        await client.deleteWebhook(details.webhookId);
      } catch {
        // Webhook may already be deleted
      }
    },

    handleRequest: async _ctx => {
      let timestamp = new Date().toISOString();
      return {
        inputs: [
          {
            timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'site.changed',
        id: `site.changed-${ctx.input.timestamp}`,
        output: {
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
