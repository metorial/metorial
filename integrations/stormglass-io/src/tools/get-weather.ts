import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceValueSchema = z
  .record(z.string(), z.number().nullable())
  .describe('Values keyed by data source name');

export let getWeatherTool = SlateTool.create(spec, {
  name: 'Get Weather Data',
  key: 'get_weather',
  description: `Retrieve weather forecast or historical data for a specific location. Returns hourly weather data including air temperature, pressure, humidity, wind, precipitation, cloud cover, visibility, and more.

Supports forecast up to 10 days ahead and historical data. Multiple data sources can be queried individually or use **"sg"** for Stormglass AI automatic best-source selection.`,
  instructions: [
    'Provide latitude and longitude for the target location.',
    'Specify at least one weather parameter to retrieve.',
    'Use source "sg" for automatic best-source selection, or specify individual sources like "noaa", "metno", "dwd", etc.',
    'Times should be provided as ISO 8601 strings (e.g., "2024-01-15T00:00:00Z").'
  ],
  constraints: [
    'Forecast data is available up to 10 days ahead.',
    'Each API request costs quota points based on the number of parameters and time range requested.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the location (-90 to 90)'),
      longitude: z.number().describe('Longitude of the location (-180 to 180)'),
      parameters: z
        .array(z.string())
        .describe(
          'Weather parameters to retrieve (e.g., "airTemperature", "windSpeed", "windDirection", "windGust", "pressure", "humidity", "precipitation", "cloudCover", "visibility", "dewPoint", "gust", "snowDepth", "uvIndex")'
        ),
      start: z
        .string()
        .optional()
        .describe(
          'Start time in ISO 8601 or UNIX timestamp format. Defaults to today at 00:00 UTC.'
        ),
      end: z
        .string()
        .optional()
        .describe(
          'End time in ISO 8601 or UNIX timestamp format. Defaults to all available data.'
        ),
      sources: z
        .array(z.string())
        .optional()
        .describe(
          'Data sources to query (e.g., "sg", "noaa", "metno", "dwd", "smhi", "yr", "fmi"). Defaults to all sources.'
        )
    })
  )
  .output(
    z.object({
      hours: z
        .array(
          z
            .object({
              time: z.string().describe('UTC timestamp for this data point')
            })
            .catchall(sourceValueSchema)
        )
        .describe('Hourly weather data points'),
      meta: z
        .record(z.string(), z.any())
        .describe('Request metadata including coordinates, quota, and request count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getWeather({
      lat: ctx.input.latitude,
      lng: ctx.input.longitude,
      params: ctx.input.parameters,
      start: ctx.input.start,
      end: ctx.input.end,
      source: ctx.input.sources
    });

    let hourCount = result.hours?.length ?? 0;

    return {
      output: {
        hours: result.hours ?? [],
        meta: result.meta ?? {}
      },
      message: `Retrieved **${hourCount}** hourly weather data points for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}) with parameters: ${ctx.input.parameters.join(', ')}.`
    };
  })
  .build();
