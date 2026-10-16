import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getResponseRows } from '../lib/client';
import { spec } from '../spec';

let sourceValueSchema = z
  .record(z.string(), z.number().nullable())
  .describe('Values keyed by data source name');

export let getHistoricalWeatherTool = SlateTool.create(spec, {
  name: 'Get Historical Weather',
  key: 'get_historical_weather',
  description: `Retrieve historical weather and marine data for a coordinate from the reanalyzed ERA5 dataset and other available historical sources. Data is available from 2014 and is normally delayed by at least seven days. Returns hourly parameter values and request metadata.`,
  instructions: [
    'Provide latitude, longitude, and at least one parameter such as airTemperature, waveHeight, currentSpeed, or waterTemperature.',
    'Provide start, end, or both in UTC. When only one is given, the provider returns up to 240 hours around it.',
    'Use sources such as sg, ecmwf, ecmwf:era5, cmems, or cmems:gopaf. Source and parameter availability varies by dataset.',
    'Temperatures are in degrees Celsius, wind/current speeds in meters per second, wave heights in meters, periods in seconds, and directions in degrees.'
  ],
  constraints: [
    'Each response contains at most 240 hourly data points; end is inclusive and must be no more than 239 hours after start.',
    'Recent dates can return no data because historical datasets have a publication delay. Query get_weather for recent forecasts.'
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
          'Historical parameters to retrieve, such as airTemperature, windSpeed, pressure, precipitation, cloudCover, dewPointTemperature, waveHeight, currentSpeed, bathymetry, or waterTemperature.'
        ),
      start: z
        .string()
        .optional()
        .describe(
          'First hour in UTC ISO 8601 or UNIX seconds. Required unless end is supplied; defaults to 239 hours before end. Provider ignores ISO timezone offsets.'
        ),
      end: z
        .string()
        .optional()
        .describe(
          'Final hour in UTC ISO 8601 or UNIX seconds, inclusive. Required unless start is supplied; defaults to 239 hours after start. Provider ignores ISO timezone offsets.'
        ),
      sources: z
        .array(z.string())
        .optional()
        .describe(
          'Historical sources to query, such as sg, ecmwf, ecmwf:era5, cmems, or cmems:gopaf. Defaults to sg.'
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

    let result = await client.getHistorical({
      lat: ctx.input.latitude,
      lng: ctx.input.longitude,
      params: ctx.input.parameters,
      start: ctx.input.start,
      end: ctx.input.end,
      source: ctx.input.sources
    });

    let hours = getResponseRows(result, 'hours');

    return {
      output: {
        hours,
        meta: result.meta,
        raw: result
      },
      message: `Retrieved **${hours.length}** hourly historical data points for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}) with parameters: ${ctx.input.parameters.join(', ')}.`
    };
  })
  .build();
