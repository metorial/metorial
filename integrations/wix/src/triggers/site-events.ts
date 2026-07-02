import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let siteEvents = SlateTrigger.create(spec, {
  name: 'Site & App Events',
  key: 'site_events',
  description:
    'Triggers on site-level events (site published, transferred) and app lifecycle events (installed, removed, plan changes).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of site/app event'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      siteId: z.string().optional().describe('Wix Site ID'),
      instanceId: z.string().optional().describe('App Instance ID'),
      appId: z.string().optional().describe('App ID'),
      eventAction: z
        .string()
        .optional()
        .describe('The action that occurred (e.g., published, installed, removed)'),
      rawPayload: z.any().optional().describe('Complete raw event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let eventType = data.eventType || data.type || 'unknown';
      let eventId = data.eventId || `${data.instanceId}-${Date.now()}`;
      let payload = data.data || data;

      return {
        inputs: [
          {
            eventType,
            eventId,
            payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;

      let type = ctx.input.eventType.toLowerCase().replace(/\//g, '.').replace(/\s+/g, '_');
      if (!type.includes('.')) {
        type = `site.${type}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          siteId: payload.siteId || payload.metaSiteId,
          instanceId: payload.instanceId,
          appId: payload.appId,
          eventAction: ctx.input.eventType,
          rawPayload: payload
        }
      };
    }
  })
  .build();
