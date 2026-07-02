import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceValueSchema = z
  .record(z.string(), z.number().nullable())
  .describe('Values keyed by data source name');

export let getSolarDataTool = SlateTool.create(spec, {
  name: 'Get Solar Data',
  key: 'get_solar_data',
  description: `Retrieve solar radiation and UV index data for a specific location. Useful for solar energy forecasting, UV exposure assessment, and agricultural planning.

Returns hourly data with values from multiple meteorological sources.`,
  instructions: [
    'Provide latitude and longitude for the target location.',
    'Specify solar parameters such as "uvIndex", "downwardShortWaveRadiationFlux", or "snowDepth".',
    'Use source "sg" for Stormglass AI automatic best-source selection.'
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
          'Solar parameters to retrieve (e.g., "uvIndex", "downwardShortWaveRadiationFlux", "surfaceNetShortwaveRadiationDownwardsFlux")'
        ),
      start: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 or UNIX timestamp format.'),
      end: z.string().optional().describe('End time in ISO 8601 or UNIX timestamp format.'),
      sources: z
        .array(z.string())
        .optional()
        .describe('Data sources to query (e.g., "sg", "noaa"). Defaults to all sources.')
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
        .describe('Hourly solar data points'),
      meta: z
        .record(z.string(), z.any())
        .describe('Request metadata including coordinates, quota, and request count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSolar({
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
      message: `Retrieved **${hourCount}** hourly solar data points for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}) with parameters: ${ctx.input.parameters.join(', ')}.`
    };
  })
  .build();
