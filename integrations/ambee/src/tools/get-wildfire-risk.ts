import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _wildfireRiskSchema = z.any().describe('Wildfire risk forecast data');

export let getWildfireRisk = SlateTool.create(spec, {
  name: 'Get Wildfire Risk Forecast',
  key: 'get_wildfire_risk',
  description: `Retrieve a 4-week predictive wildfire risk forecast at weekly intervals. Includes Fire Risk Index and related metrics. Supports lookup by coordinates or place name.`,
  constraints: ['Coverage limited to North America (US & Canada).', 'Updated daily.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      place: z.string().optional().describe('Place name to query')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        riskForecast: z.any().describe('Wildfire risk forecast data')
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
      result = await client.getWildfireRiskByPlace(ctx.input.place);
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getWildfireRiskByLatLng(ctx.input.lat, ctx.input.lng);
    } else {
      throw new Error('Provide lat/lng coordinates or a place name.');
    }

    return {
      output: {
        message: result.message,
        riskForecast: result.data || result
      },
      message: `Retrieved wildfire risk forecast for the specified location.`
    };
  })
  .build();
