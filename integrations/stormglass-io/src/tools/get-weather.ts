import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getResponseRows } from '../lib/client';
import { spec } from '../spec';

let sourceValueSchema = z
  .record(z.string(), z.number().nullable())
  .describe('Values keyed by data source name');

export let getWeatherTool = SlateTool.create(spec, {
  name: 'Get Weather Data',
  key: 'get_weather',
  description: `Retrieve weather forecast or historical data for a specific location. Returns hourly weather data including air temperature, pressure, humidity, wind, precipitation, cloud cover, visibility, and more.

Forecast horizon depends on the source; standard models offer up to 10 days and some AI models up to 15 days. Forecast records have a 14-day look-back period; use get_historical_weather for older data. Multiple data sources can be queried individually or use **"sg"** for Stormglass AI automatic best-source selection.`,
  instructions: [
    'Provide latitude and longitude for the target location.',
    'Specify at least one weather parameter to retrieve.',
    'Use source "sg" for automatic best-source selection, or specify individual sources like "noaa", "metno", "dwd", etc.',
    'Times are interpreted as UTC; ISO timezone offsets are ignored by the provider.',
    'Temperature is in degrees Celsius; wind/current speed in meters per second; precipitation in mm/hour; pressure in hPa; cloud cover/humidity in percent; visibility in kilometers.'
  ],
  constraints: [
    'Forecast horizon and available parameters vary by source; query get_historical_weather for the historical archive.',
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
          'Weather parameters to retrieve (e.g., "airTemperature", "windSpeed", "windDirection", "pressure", "humidity", "precipitation", "cloudCover", "visibility", "dewPointTemperature", "gust", "snowDepth", "uvIndex")'
        ),
      start: z
        .string()
        .optional()
        .describe(
          'Start time in UTC ISO 8601 or UNIX seconds. Provider ignores ISO timezone offsets. Defaults to today at 00:00 UTC.'
        ),
      end: z
        .string()
        .optional()
        .describe(
          'End time in UTC ISO 8601 or UNIX seconds. Provider ignores ISO timezone offsets. Defaults to all available data.'
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
        .describe('Request metadata including coordinates, quota, and request count'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete original provider response')
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

    let hours = getResponseRows(result, 'hours', 'data');

    return {
      output: {
        hours,
        meta: result.meta,
        raw: result
      },
      message: `Retrieved **${hours.length}** hourly weather data points for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}) with parameters: ${ctx.input.parameters.join(', ')}.`
    };
  })
  .build();
