import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportLayer = SlateTool.create(spec, {
  name: 'Export Layer',
  key: 'export_layer',
  description: `Get a download link to export a layer's data from a Felt map. Vector layers are exported as GeoPackage and raster layers as GeoTIFF.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map containing the layer'),
      layerId: z.string().describe('ID of the layer to export')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('URL to download the exported layer data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLayerExportLink(ctx.input.mapId, ctx.input.layerId);

    return {
      output: {
        downloadUrl: result.url ?? result.download_url ?? result
      },
      message: `Export link generated for layer \`${ctx.input.layerId}\`.`
    };
  })
  .build();
