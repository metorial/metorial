import { createApiServiceError, SlateTool } from 'slates';
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

    if (!result.export_link) {
      throw createApiServiceError(
        'Felt did not return a layer export link. Try the export again.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: result.export_link,
      refreshReference: { mapId: ctx.input.mapId, layerId: ctx.input.layerId },
      // Felt does not document a link lifetime. Regenerate at the next download.
      refreshAt: new Date().toISOString()
    });

    return {
      output: {
        downloadUrl: result.export_link
      },
      message: `Export link generated for layer \`${ctx.input.layerId}\`.`
    };
  })
  .build();
