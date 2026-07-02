import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let assetEvents = SlateTrigger.create(spec, {
  name: 'Asset Events',
  key: 'asset_events',
  description:
    'Triggers when an asset is created, saved, published, unpublished, archived, unarchived, or deleted via Contentful webhooks.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe(
          'The asset action that triggered the event (e.g. create, save, publish, unpublish, archive, unarchive, delete).'
        ),
      assetId: z.string().describe('ID of the affected asset.'),
      spaceId: z.string().optional().describe('Space ID.'),
      environmentId: z.string().optional().describe('Environment ID.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Asset fields at the time of the event.'),
      webhookCallId: z.string().describe('Unique identifier for this webhook call.')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the affected asset.'),
      spaceId: z.string().optional().describe('Space ID.'),
      environmentId: z.string().optional().describe('Environment ID.'),
      title: z.record(z.string(), z.string()).optional().describe('Asset title by locale.'),
      fileName: z.string().optional().describe('File name.'),
      contentType: z.string().optional().describe('MIME content type.'),
      url: z.string().optional().describe('File URL.'),
      version: z.number().optional().describe('Version of the asset.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let webhook = await client.createWebhook({
        name: `Slates - Asset Events`,
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
      let client = createClient(ctx.config, ctx.auth);
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
      let fields: any = ctx.input.fields || {};
      let fileField: any = fields.file;
      let firstLocale = fileField ? Object.keys(fileField)[0] : undefined;
      let file = firstLocale ? fileField[firstLocale] : undefined;

      return {
        type: `asset.${ctx.input.eventAction}`,
        id: ctx.input.webhookCallId,
        output: {
          assetId: ctx.input.assetId,
          spaceId: ctx.input.spaceId,
          environmentId: ctx.input.environmentId,
          title: fields.title as Record<string, string> | undefined,
          fileName: file?.fileName,
          contentType: file?.contentType,
          url: file?.url
        }
      };
    }
  })
  .build();
