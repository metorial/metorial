import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

export let getWeatherMapTile = SlateTool.create(spec, {
  name: 'Get Weather Map Tile URL',
  key: 'get_weather_map_tile',
  description: `Generate a URL for an OpenWeatherMap weather map tile. Supports 15+ weather layers including temperature, precipitation, clouds, pressure, and wind. Tiles follow the standard slippy map tile format (z/x/y) for integration with mapping libraries like Leaflet or OpenLayers.`,
  instructions: [
    'The tile coordinates (z/x/y) follow the standard slippy map tile naming convention',
    'Zoom level 0 shows the whole world, higher zoom levels show more detail (up to ~18)'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      layer: z
        .enum(['clouds_new', 'precipitation_new', 'pressure_new', 'wind_new', 'temp_new'])
        .describe('Weather layer to display'),
      zoom: z.number().min(0).max(18).describe('Zoom level (0=world, higher=more detail)'),
      tileX: z.number().min(0).describe('Tile X coordinate'),
      tileY: z.number().min(0).describe('Tile Y coordinate')
    })
  )
  .output(
    z.object({
      tileUrl: z.string().describe('URL of the weather map tile image'),
      layer: z.string().describe('Weather layer name'),
      zoom: z.number().describe('Zoom level'),
      tileX: z.number().describe('Tile X coordinate'),
      tileY: z.number().describe('Tile Y coordinate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token
    });

    let tileUrl = client.getWeatherMapTileUrl(
      ctx.input.layer,
      ctx.input.zoom,
      ctx.input.tileX,
      ctx.input.tileY
    );

    let output = {
      tileUrl,
      layer: ctx.input.layer,
      zoom: ctx.input.zoom,
      tileX: ctx.input.tileX,
      tileY: ctx.input.tileY
    };

    return {
      output,
      message: `Generated **${ctx.input.layer}** tile URL at zoom ${ctx.input.zoom} (${ctx.input.tileX}, ${ctx.input.tileY}).`
    };
  })
  .build();
