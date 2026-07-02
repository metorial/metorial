import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

let layerSchema = z
  .object({
    layerId: z.string().describe('Unique identifier of the layer'),
    name: z.string().describe('Name of the layer'),
    style: z.string().optional().describe('Display style: Point, Cluster, or Heat Map'),
    color: z.string().optional().describe('Color used for markers on this layer')
  })
  .passthrough();

let mapSchema = z
  .object({
    mapId: z.string().describe('Unique identifier of the map'),
    name: z.string().describe('Name of the map'),
    description: z.string().optional().describe('Description of the map'),
    createdAt: z.string().optional().describe('When the map was created'),
    updatedAt: z.string().optional().describe('When the map was last updated'),
    layers: z.array(layerSchema).optional().describe('Layers belonging to this map')
  })
  .passthrough();

export let listMaps = SlateTool.create(spec, {
  name: 'List Maps',
  key: 'list_maps',
  description: `Retrieve all maps in your Mapulus account, optionally including their layers. Use this to discover available maps and their layer structure before working with locations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      expandLayers: z
        .boolean()
        .optional()
        .describe('When true, includes layers for each map in the response')
    })
  )
  .output(
    z.object({
      maps: z.array(mapSchema).describe('List of maps in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let rawMaps = await client.listMaps(ctx.input.expandLayers);

    let maps = rawMaps.map((m: any) => ({
      mapId: m.id,
      name: m.name,
      description: m.description,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      layers: m.layers?.map((l: any) => ({
        layerId: l.id,
        name: l.name,
        style: l.style,
        color: l.color
      }))
    }));

    return {
      output: { maps },
      message: `Found **${maps.length}** map(s) in the account.`
    };
  })
  .build();
