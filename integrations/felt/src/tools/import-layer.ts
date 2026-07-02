import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importLayer = SlateTool.create(spec, {
  name: 'Import Layer from URL',
  key: 'import_layer',
  description: `Import a layer into a Felt map from a URL. Supports GeoJSON, CSV, shapefiles, and live data feed URLs. The data will be fetched and processed by Felt automatically.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to add the layer to'),
      importUrl: z
        .string()
        .describe('URL of the data source (GeoJSON, CSV, shapefile, or live feed URL)'),
      name: z.string().optional().describe('Name for the imported layer')
    })
  )
  .output(
    z.object({
      layerId: z.string().describe('ID of the created layer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.uploadLayerFromUrl(ctx.input.mapId, {
      importUrl: ctx.input.importUrl,
      name: ctx.input.name
    });

    return {
      output: {
        layerId: result.layer_id
      },
      message: `Imported layer${ctx.input.name ? ` **${ctx.input.name}**` : ''} from URL into map \`${ctx.input.mapId}\`.`
    };
  })
  .build();
