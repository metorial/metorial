import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extensionEvents = SlateTrigger.create(spec, {
  name: 'Extension Uninstall',
  key: 'extension_events',
  description:
    'Triggers when a user uninstalls an extension (OAuth client) from their Squarespace site. Useful for cleanup when a user disconnects the integration.'
})
  .input(
    z.object({
      topic: z.string().describe('The webhook event topic (extension.uninstall)'),
      webhookId: z.string().describe('Unique webhook notification ID'),
      websiteId: z.string().optional().describe('The website ID'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      websiteId: z
        .string()
        .optional()
        .describe('The website from which the extension was uninstalled'),
      uninstalledAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of the uninstall event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let subscription = await client.createWebhookSubscription({
        endpointUrl: ctx.input.webhookBaseUrl,
        topics: ['extension.uninstall']
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          secret: subscription.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteWebhookSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let topic = body.topic || 'extension.uninstall';
      let webhookId = body.id || body.webhookId || crypto.randomUUID();
      let websiteId = body.websiteId || '';

      return {
        inputs: [
          {
            topic,
            webhookId,
            websiteId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'extension.uninstalled',
        id: ctx.input.webhookId,
        output: {
          websiteId: ctx.input.websiteId,
          uninstalledAt: ctx.input.rawPayload?.createdOn || new Date().toISOString()
        }
      };
    }
  })
  .build();
