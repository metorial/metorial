import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let galleryEvents = SlateTrigger.create(spec, {
  name: 'Gallery Events',
  key: 'gallery_events',
  description:
    'Triggered when galleries are created, updated, deleted, or fully synced (ready for CDN delivery) in your Cincopa account.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of gallery event (e.g., gallery.created, gallery.updated, gallery.deleted, gallery.synced)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      galleryId: z.string().optional().describe('Gallery ID (fid) affected by the event'),
      payload: z.record(z.string(), z.any()).describe('Full event payload from Cincopa')
    })
  )
  .output(
    z.object({
      galleryId: z.string().optional().describe('Gallery ID (fid) affected'),
      galleryName: z.string().optional().describe('Name of the affected gallery'),
      eventName: z.string().describe('Name of the event that occurred'),
      timestamp: z.string().optional().describe('When the event occurred'),
      rawPayload: z.record(z.string(), z.any()).describe('Complete event data from Cincopa')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CincopaClient({ token: ctx.auth.token });
      await client.setWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        events: 'gallery.*'
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

      let eventType = body?.event || body?.type || body?.namespace || 'gallery.unknown';
      let eventId =
        body?.id || body?.event_id || `${eventType}-${body?.fid || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
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
          galleryId: (ctx.input.galleryId || payload?.fid) as string | undefined,
          galleryName: (payload?.name || payload?.title) as string | undefined,
          eventName: ctx.input.eventType,
          timestamp: (payload?.timestamp || payload?.created_at || payload?.date) as
            | string
            | undefined,
          rawPayload: payload
        }
      };
    }
  })
  .build();
