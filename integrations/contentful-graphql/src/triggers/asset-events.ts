import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createWebhookClient } from '../lib/helpers';
import { spec } from '../spec';

export let assetEvents = SlateTrigger.create(spec, {
  name: 'Asset Events',
  key: 'asset_events',
  description:
    'Triggers when an asset is created, saved, published, unpublished, archived, unarchived, or deleted in your Contentful space.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe(
          'The asset action that triggered the event (e.g. create, save, publish, unpublish, archive, unarchive, delete).'
        ),
      assetId: z.string().describe('ID of the affected asset.'),
      spaceId: z.string().optional().describe('Space ID where the event occurred.'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID where the event occurred.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Asset fields (title, description, file) at the time of the event.'),
      webhookCallId: z.string().describe('Unique identifier for this webhook invocation.')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the affected asset.'),
      spaceId: z.string().optional().describe('Space ID where the event occurred.'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID where the event occurred.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Asset fields (title, description, file) at the time of the event.'),
      version: z.number().optional().describe('Version of the asset after the event.'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp.'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createWebhookClient(ctx.config, ctx.auth);

      let webhook = await client.createWebhook({
        name: 'Slates - Asset Events',
        url: ctx.input.webhookBaseUrl,
        topics: ['Asset.*'],
        active: true,
        filters: [
          {
            equals: [{ doc: 'sys.environment.sys.id' }, ctx.config.environmentId]
          }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.sys?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createWebhookClient(ctx.config, ctx.auth);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();
      let topic = ctx.request.headers.get('X-Contentful-Topic') || '';
      let parts = topic.split('.');
      let eventAction = parts[2] || 'unknown';

      let sys = body?.sys || {};
      let webhookCallId =
        ctx.request.headers.get('X-Contentful-Webhook-Call-Id') || `${sys.id}-${Date.now()}`;

      return {
        inputs: [
          {
            eventAction,
            assetId: sys.id || '',
            spaceId: sys.space?.sys?.id,
            environmentId: sys.environment?.sys?.id,
            fields: body?.fields,
            webhookCallId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `asset.${ctx.input.eventAction}`,
        id: ctx.input.webhookCallId,
        output: {
          assetId: ctx.input.assetId,
          spaceId: ctx.input.spaceId,
          environmentId: ctx.input.environmentId,
          fields: ctx.input.fields,
          version: undefined,
          createdAt: undefined,
          updatedAt: undefined
        }
      };
    }
  })
  .build();
