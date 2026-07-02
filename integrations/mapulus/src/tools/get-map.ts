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

export let getMap = SlateTool.create(spec, {
  name: 'Get Map',
  key: 'get_map',
  description: `Retrieve a specific map by its ID, including its layers. Use this to get detailed information about a map and its layer structure.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to retrieve'),
      expandLayers: z
        .boolean()
        .optional()
        .describe('When true, includes layers in the response')
    })
  )
  .output(
    z
      .object({
        mapId: z.string().describe('Unique identifier of the map'),
        name: z.string().describe('Name of the map'),
        description: z.string().optional().describe('Description of the map'),
        createdAt: z.string().optional().describe('When the map was created'),
        updatedAt: z.string().optional().describe('When the map was last updated'),
        layers: z.array(layerSchema).optional().describe('Layers belonging to this map')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let m = await client.getMap(ctx.input.mapId, ctx.input.expandLayers);

    let output = {
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
    };

    return {
      output,
      message: `Retrieved map **${output.name}**${output.layers ? ` with ${output.layers.length} layer(s)` : ''}.`
    };
  })
  .build();
