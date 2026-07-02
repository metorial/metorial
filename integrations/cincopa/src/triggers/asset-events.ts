import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let assetEvents = SlateTrigger.create(spec, {
  name: 'Asset Events',
  key: 'asset_events',
  description:
    'Triggered when assets are uploaded, updated, or deleted in your Cincopa account.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of asset event (e.g., asset.uploaded, asset.updated, asset.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      assetId: z.string().optional().describe('Asset ID (rid) affected by the event'),
      galleryId: z.string().optional().describe('Gallery ID (fid) associated with the event'),
      payload: z.record(z.string(), z.any()).describe('Full event payload from Cincopa')
    })
  )
  .output(
    z.object({
      assetId: z.string().optional().describe('Asset ID (rid) affected'),
      galleryId: z.string().optional().describe('Gallery ID (fid) associated'),
      eventName: z.string().describe('Name of the event that occurred'),
      timestamp: z.string().optional().describe('When the event occurred'),
      assetTitle: z.string().optional().describe('Title of the affected asset'),
      assetType: z
        .string()
        .optional()
        .describe('Type of the affected asset (video, image, audio, other)'),
      rawPayload: z.record(z.string(), z.any()).describe('Complete event data from Cincopa')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CincopaClient({ token: ctx.auth.token });
      let _result = await client.setWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        events: 'asset.*'
      });
      return {
        registrationDetails: {
          hookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CincopaClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.hookUrl);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType = body?.event || body?.type || body?.namespace || 'asset.unknown';
      let eventId =
        body?.id || body?.event_id || `${eventType}-${body?.rid || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            assetId: body?.rid || body?.asset_id,
            galleryId: body?.fid || body?.gallery_id,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { payload } = ctx.input;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          assetId: (ctx.input.assetId || payload?.rid) as string | undefined,
          galleryId: (ctx.input.galleryId || payload?.fid) as string | undefined,
          eventName: ctx.input.eventType,
          timestamp: (payload?.timestamp || payload?.created_at || payload?.date) as
            | string
            | undefined,
          assetTitle: (payload?.title || payload?.name) as string | undefined,
          assetType: (payload?.type || payload?.asset_type) as string | undefined,
          rawPayload: payload
        }
      };
    }
  })
  .build();
