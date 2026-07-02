import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let forecastRecordSchema = z
  .object({
    CO: z.number().optional().describe('Carbon monoxide concentration (ppm)'),
    NO2: z.number().optional().describe('Nitrogen dioxide concentration (ppb)'),
    OZONE: z.number().optional().describe('Ozone concentration (ppb)'),
    PM10: z.number().optional().describe('Particulate matter < 10µm (µg/m³)'),
    PM25: z.number().optional().describe('Particulate matter < 2.5µm (µg/m³)'),
    SO2: z.number().optional().describe('Sulfur dioxide concentration (ppb)'),
    AQI: z.number().optional().describe('Forecasted Air Quality Index'),
    lat: z.number().optional(),
    lng: z.number().optional(),
    createdAt: z.string().optional()
  })
  .passthrough();

export let getAirQualityForecast = SlateTool.create(spec, {
  name: 'Get Air Quality Forecast',
  key: 'get_air_quality_forecast',
  description: `Retrieve air quality forecast data for the next 48 hours at a given location. Updated every 12 hours. Includes predicted AQI and pollutant levels.`,
  constraints: ['Forecast covers up to 48 hours ahead.', 'Updated every 12 hours.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).describe('Longitude (-180 to 180)')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        forecasts: z.array(forecastRecordSchema).describe('Forecasted air quality records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result = await client.getAirQualityForecast(ctx.input.lat, ctx.input.lng);
    let forecasts = result.data || result.forecasts || [];

    return {
      output: {
        message: result.message,
        forecasts
      },
      message: `Retrieved **${forecasts.length}** air quality forecast record(s) for (${ctx.input.lat}, ${ctx.input.lng}).`
    };
  })
  .build();
