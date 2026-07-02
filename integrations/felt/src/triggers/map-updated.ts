import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mapUpdated = SlateTrigger.create(spec, {
  name: 'Map Updated',
  key: 'map_updated',
  description:
    'Triggers when a Felt map is updated. Covers any change including adding elements, drawing annotations, changing colors, or updating sharing permissions. Requires webhook configuration in Felt workspace settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from Felt (e.g. map:update)'),
      mapId: z.string().describe('ID of the updated map'),
      updatedAt: z.string().describe('Timestamp of the update')
    })
  )
  .output(
    z.object({
      mapId: z.string().describe('ID of the updated map'),
      title: z.string().nullable().describe('Title of the map'),
      url: z.string().nullable().describe('URL to view the map'),
      publicAccess: z.string().nullable().describe('Current access level'),
      updatedAt: z.string().describe('Timestamp of the update')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let attributes = body?.body?.attributes ?? body?.attributes ?? body;

      let eventType = attributes.type ?? 'map:update';
      let mapId = attributes.map_id ?? '';
      let updatedAt = attributes.updated_at ?? new Date().toISOString();

      return {
        inputs: [
          {
            eventType,
            mapId,
            updatedAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let map: any = null;
      try {
        map = await client.getMap(ctx.input.mapId);
      } catch {
        // Map details may not be accessible
      }

      return {
        type: 'map.updated',
        id: `${ctx.input.mapId}-${ctx.input.updatedAt}`,
        output: {
          mapId: ctx.input.mapId,
          title: map?.title ?? null,
          url: map?.url ?? null,
          publicAccess: map?.public_access ?? null,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
