import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceValueSchema = z
  .record(z.string(), z.number().nullable())
  .describe('Values keyed by data source name');

export let getMarineDataTool = SlateTool.create(spec, {
  name: 'Get Marine Data',
  key: 'get_marine_data',
  description: `Retrieve marine and ocean environment data for a specific location. Returns hourly marine data including wave height, swell height, water temperature, currents, wind wave, sea depth, ice cover, and more.

Ideal for ocean and coastal applications such as surfing, fishing, shipping, and offshore operations.`,
  instructions: [
    'Provide latitude and longitude for the target marine location.',
    'Specify marine-specific parameters such as "waveHeight", "swellHeight", "waterTemperature", "waveDirection", "wavePeriod", "currentSpeed", "currentDirection", etc.',
    'Use source "sg" for automatic best-source selection.'
  ],
  constraints: ['Forecast data is available up to 10 days ahead.'],
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
          'Marine parameters to retrieve (e.g., "waveHeight", "wavePeriod", "waveDirection", "swellHeight", "swellDirection", "swellPeriod", "secondarySwellHeight", "secondarySwellDirection", "secondarySwellPeriod", "windWaveHeight", "windWaveDirection", "windWavePeriod", "waterTemperature", "currentSpeed", "currentDirection", "seaLevel", "iceCover", "seaFloorDepth")'
        ),
      start: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 or UNIX timestamp format.'),
      end: z.string().optional().describe('End time in ISO 8601 or UNIX timestamp format.'),
      sources: z
        .array(z.string())
        .optional()
        .describe(
          'Data sources to query (e.g., "sg", "noaa", "metno", "dwd"). Defaults to all sources.'
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
        .describe('Hourly marine data points'),
      meta: z
        .record(z.string(), z.any())
        .describe('Request metadata including coordinates, quota, and request count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMarineWeather({
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
      message: `Retrieved **${hourCount}** hourly marine data points for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}) with parameters: ${ctx.input.parameters.join(', ')}.`
    };
  })
  .build();
