import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

export let getWeatherMapTile = SlateTool.create(spec, {
  name: 'Get Weather Map Tile',
  key: 'get_weather_map_tile',
  description: `Get a downloadable OpenWeatherMap weather map tile. Supports the five Weather Maps 1.0 layers: temperature, precipitation, clouds, pressure, and wind. Tiles follow the standard slippy map tile format (z/x/y) for integration with mapping libraries like Leaflet or OpenLayers.`,
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
      tileUrl: z
        .string()
        .describe(
          'Weather tile endpoint without credentials; use the downloadable image to view the tile'
        ),
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

    await ctx.addAttachment({
      type: 'url',
      url: tileUrl,
      query: { appid: ctx.auth.token },
      mimeType: 'image/png',
      filename: `${ctx.input.layer}-${ctx.input.zoom}-${ctx.input.tileX}-${ctx.input.tileY}.png`
    });

    let output = {
      tileUrl,
      layer: ctx.input.layer,
      zoom: ctx.input.zoom,
      tileX: ctx.input.tileX,
      tileY: ctx.input.tileY
    };

    return {
      output,
      message: `Retrieved a downloadable **${ctx.input.layer}** tile at zoom ${ctx.input.zoom} (${ctx.input.tileX}, ${ctx.input.tileY}).`
    };
  })
  .build();
