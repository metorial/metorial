import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let assetEvents = SlateTrigger.create(spec, {
  name: 'Asset Events',
  key: 'asset_events',
  description: 'Triggers when assets are uploaded, replaced, deleted, or restored.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'replaced', 'deleted', 'restored'])
        .describe('Type of asset event'),
      assetId: z.number().optional().describe('ID of the affected asset'),
      spaceId: z.number().optional().describe('Space ID'),
      webhookId: z.string().describe('Unique ID for deduplication')
    })
  )
  .output(
    z.object({
      assetId: z.number().optional().describe('ID of the affected asset'),
      filename: z.string().optional().describe('Full URL of the asset'),
      name: z.string().optional().describe('Display name of the asset'),
      contentType: z.string().optional().describe('MIME type'),
      contentLength: z.number().optional().describe('File size in bytes'),
      alt: z.string().optional().describe('Alt text'),
      title: z.string().optional().describe('Title'),
      isPrivate: z.boolean().optional().describe('Whether asset is private')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let webhook = await client.createWebhook({
        name: 'Slates - Asset Events',
        endpoint: ctx.input.webhookBaseUrl,
        actions: ['asset.created', 'asset.replaced', 'asset.deleted', 'asset.restored'],
        activated: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let details = ctx.input.registrationDetails as { webhookId?: string };
      if (details.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        action?: string;
        asset_id?: number;
        space_id?: number;
      };

      let actionParts = (body.action || '').split('.');
      let eventType = actionParts[1] as string | undefined;

      if (!eventType || !['created', 'replaced', 'deleted', 'restored'].includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as 'created' | 'replaced' | 'deleted' | 'restored',
            assetId: body.asset_id,
            spaceId: body.space_id,
            webhookId: `asset-${body.asset_id}-${eventType}-${Date.now()}`
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, any> = {
        assetId: ctx.input.assetId
      };

      if (ctx.input.eventType !== 'deleted' && ctx.input.assetId) {
        try {
          let client = new StoryblokClient({
            token: ctx.auth.token,
            region: ctx.auth.region,
            spaceId: ctx.config.spaceId
          });
          let asset = await client.getAsset(ctx.input.assetId.toString());
          output.filename = asset.filename;
          output.name = asset.name;
          output.contentType = asset.content_type;
          output.contentLength = asset.content_length;
          output.alt = asset.alt;
          output.title = asset.title;
          output.isPrivate = asset.is_private;
        } catch {
          // Asset might not be accessible
        }
      }

      return {
        type: `asset.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: output as any
      };
    }
  })
  .build();
