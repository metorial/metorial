import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceValueSchema = z
  .record(z.string(), z.number().nullable())
  .describe('Values keyed by data source name');

export let getBioDataTool = SlateTool.create(spec, {
  name: 'Get Bio Data',
  key: 'get_bio_data',
  description: `Retrieve biological and environmental data for a specific location. Includes ocean bio-parameters (chlorophyll, oxygen, pH, salinity, nutrients) and land soil data (moisture, temperature at various depths).

Useful for marine ecology research, water quality monitoring, agricultural soil analysis, and environmental studies.`,
  instructions: [
    'Provide latitude and longitude for the target location.',
    'Specify bio parameters to retrieve. Ocean parameters include "chlorophyll", "iron", "nitrate", "phytoplankton", "oxygen", "ph", "phosphate", "silicate", "salinity".',
    'Land parameters include "soilMoisture", "soilTemperature" at different depth ranges.'
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
          'Bio parameters to retrieve (e.g., "chlorophyll", "iron", "nitrate", "phytoplankton", "oxygen", "ph", "phosphate", "silicate", "salinity", "soilMoisture0To10cm", "soilTemperature0To10cm")'
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
        .describe('Hourly bio data points'),
      meta: z
        .record(z.string(), z.any())
        .describe('Request metadata including coordinates, quota, and request count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBio({
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
      message: `Retrieved **${hourCount}** hourly bio data points for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}) with parameters: ${ctx.input.parameters.join(', ')}.`
    };
  })
  .build();
