import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let leadEvents = SlateTrigger.create(spec, {
  name: 'Lead Events',
  key: 'lead_events',
  description:
    'Triggered when a lead is captured through a Cincopa video lead generation form. Receives viewer information submitted via in-video forms.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of lead event (e.g., lead.created)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.record(z.string(), z.any()).describe('Full event payload from Cincopa')
    })
  )
  .output(
    z.object({
      leadEmail: z.string().optional().describe('Email address submitted by the lead'),
      leadName: z.string().optional().describe('Name submitted by the lead'),
      galleryId: z
        .string()
        .optional()
        .describe('Gallery ID (fid) where the lead was captured'),
      assetId: z.string().optional().describe('Asset ID (rid) the lead was watching'),
      eventName: z.string().describe('Name of the event that occurred'),
      timestamp: z.string().optional().describe('When the lead was captured'),
      rawPayload: z.record(z.string(), z.any()).describe('Complete event data from Cincopa')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CincopaClient({ token: ctx.auth.token });
      await client.setWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        events: 'leads.*'
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

      let eventType = body?.event || body?.type || body?.namespace || 'lead.created';
      let eventId = body?.id || body?.event_id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
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
          leadEmail: (payload?.email || payload?.lead_email) as string | undefined,
          leadName: (payload?.name || payload?.lead_name) as string | undefined,
          galleryId: (payload?.fid || payload?.gallery_id) as string | undefined,
          assetId: (payload?.rid || payload?.asset_id) as string | undefined,
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
