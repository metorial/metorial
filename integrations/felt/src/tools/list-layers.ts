import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let layerSchema = z.object({
  layerId: z.string().describe('ID of the layer'),
  name: z.string().nullable().describe('Name of the layer'),
  caption: z.string().nullable().describe('Caption of the layer'),
  status: z.string().nullable().describe('Processing status of the layer'),
  geometryType: z.string().nullable().describe('Geometry type (Line, Point, Polygon, Raster)'),
  orderingKey: z.string().nullable().describe('Ordering key for layer position'),
  progress: z.number().nullable().describe('Upload/processing progress (0-1)'),
  refreshPeriod: z.string().nullable().describe('Auto-refresh schedule'),
  tileUrl: z.string().nullable().describe('Tile URL for the layer')
});

export let listLayers = SlateTool.create(spec, {
  name: 'List Layers',
  key: 'list_layers',
  description: `List all layers on a Felt map. Returns each layer's ID, name, status, geometry type, and other metadata. Use the map ID to specify which map's layers to retrieve.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to list layers for')
    })
  )
  .output(
    z.object({
      layers: z.array(layerSchema).describe('Layers on the map')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let layers = await client.listLayers(ctx.input.mapId);

    let mapped = (Array.isArray(layers) ? layers : []).map((l: any) => ({
      layerId: l.id,
      name: l.name ?? null,
      caption: l.caption ?? null,
      status: l.status ?? null,
      geometryType: l.geometry_type ?? null,
      orderingKey: l.ordering_key ?? null,
      progress: l.progress ?? null,
      refreshPeriod: l.refresh_period ?? null,
      tileUrl: l.tile_url ?? null
    }));

    return {
      output: { layers: mapped },
      message: `Found **${mapped.length}** layer(s) on map \`${ctx.input.mapId}\`.`
    };
  })
  .build();
