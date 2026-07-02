import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pollenForecastSchema = z
  .object({
    Count: z
      .object({
        grass_pollen: z.number().optional(),
        tree_pollen: z.number().optional(),
        weed_pollen: z.number().optional()
      })
      .passthrough()
      .optional(),
    Risk: z
      .object({
        grass_pollen: z.string().optional(),
        tree_pollen: z.string().optional(),
        weed_pollen: z.string().optional()
      })
      .passthrough()
      .optional(),
    time: z.number().optional().describe('Forecast timestamp'),
    lat: z.number().optional(),
    lng: z.number().optional()
  })
  .passthrough();

export let getPollenForecast = SlateTool.create(spec, {
  name: 'Get Pollen Forecast',
  key: 'get_pollen_forecast',
  description: `Retrieve pollen count forecast for tree, grass, and weed pollen. Returns a 48-hour forecast with hourly intervals. Supports lookup by coordinates or place name.`,
  constraints: ['Forecast covers up to 48 hours ahead.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      place: z.string().optional().describe('Place name to query'),
      speciesRisk: z.boolean().optional().describe('Include species-level risk breakdown')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        forecasts: z.array(pollenForecastSchema).describe('Pollen forecast records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;

    if (ctx.input.place) {
      result = await client.getPollenForecastByPlace(ctx.input.place, ctx.input.speciesRisk);
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getPollenForecastByLatLng(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.speciesRisk
      );
    } else {
      throw new Error('Provide lat/lng coordinates or a place name.');
    }

    let forecasts = result.data || [];

    return {
      output: {
        message: result.message,
        forecasts
      },
      message: `Retrieved **${forecasts.length}** pollen forecast entries.`
    };
  })
  .build();
