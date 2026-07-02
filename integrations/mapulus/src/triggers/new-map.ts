import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

let layerSchema = z
  .object({
    layerId: z.string().describe('Unique identifier of the layer'),
    name: z.string().describe('Name of the layer'),
    style: z.string().optional().describe('Display style'),
    color: z.string().optional().describe('Marker color')
  })
  .passthrough();

export let newMap = SlateTrigger.create(spec, {
  name: 'New Map',
  key: 'new_map',
  description: 'Triggers when a new map is created in Mapulus.'
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the new map'),
      name: z.string().describe('Name of the map'),
      description: z.string().optional().describe('Description of the map'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      layers: z.array(layerSchema).optional().describe('Layers in the map')
    })
  )
  .output(
    z.object({
      mapId: z.string().describe('Unique identifier of the new map'),
      name: z.string().describe('Name of the map'),
      description: z.string().optional().describe('Description of the map'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      layers: z.array(layerSchema).optional().describe('Layers belonging to this map')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MapulusClient(ctx.auth.token);
      let lastSeenIds: string[] = ctx.state?.lastSeenIds ?? [];

      let maps = await client.listMaps(true);

      // Filter to only new maps
      let newMaps = maps.filter(m => !lastSeenIds.includes(m.id));

      // Sort newest first
      newMaps.sort((a, b) => {
        let aTime = a.created_at ?? '';
        let bTime = b.created_at ?? '';
        return bTime.localeCompare(aTime);
      });

      // Track all current IDs for deduplication
      let currentIds = maps.map(m => m.id);

      return {
        inputs: newMaps.map(m => ({
          mapId: m.id,
          name: m.name,
          description: m.description,
          createdAt: m.created_at,
          layers: m.layers?.map((l: any) => ({
            layerId: l.id,
            name: l.name,
            style: l.style,
            color: l.color
          }))
        })),
        updatedState: {
          lastSeenIds: currentIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'map.created',
        id: ctx.input.mapId,
        output: {
          mapId: ctx.input.mapId,
          name: ctx.input.name,
          description: ctx.input.description,
          createdAt: ctx.input.createdAt,
          layers: ctx.input.layers
        }
      };
    }
  })
  .build();
