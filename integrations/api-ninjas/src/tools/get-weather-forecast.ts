import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { locationParams } from '../lib/location';
import { spec } from '../spec';

export let getWeatherForecast = SlateTool.create(spec, {
  name: 'Get Weather Forecast',
  key: 'get_weather_forecast',
  description:
    'Get a five-day weather forecast in three-hour intervals by coordinates, city, or US ZIP code.',
  constraints: ['City and ZIP-code lookups require a premium plan.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude; provide lon as well'),
      lon: z.number().min(-180).max(180).optional().describe('Longitude; provide lat as well'),
      city: z.string().optional().describe('City name; premium only'),
      state: z.string().optional().describe('US state, for city lookups'),
      country: z.string().optional().describe('Country, for city lookups'),
      zip: z.string().optional().describe('US ZIP code; premium only')
    })
  )
  .output(
    z.object({
      forecasts: z.array(
        z.object({
          timestamp: z.number().optional(),
          tempCelsius: z.number().optional(),
          feelsLikeCelsius: z.number().optional(),
          humidity: z.number().optional(),
          windSpeedMs: z.number().optional(),
          description: z.string().optional(),
          raw: z.unknown().optional().describe('Original forecast interval')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getWeatherForecast(
      locationParams(ctx.input, true)
    );
    return {
      output: {
        forecasts: result.map(
          (forecast: {
            timestamp?: number | null;
            temp?: number | null;
            feels_like?: number | null;
            humidity?: number | null;
            wind_speed?: number | null;
            weather_description?: string | null;
          }) => ({
            timestamp: forecast.timestamp ?? undefined,
            tempCelsius: forecast.temp ?? undefined,
            feelsLikeCelsius: forecast.feels_like ?? undefined,
            humidity: forecast.humidity ?? undefined,
            windSpeedMs: forecast.wind_speed ?? undefined,
            description: forecast.weather_description ?? undefined,
            raw: forecast
          })
        )
      },
      message: `Retrieved ${result.length} forecast intervals.`
    };
  })
  .build();
