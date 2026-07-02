import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let moonPhaseSchema = z
  .object({
    text: z.string().optional().describe('Phase name (e.g., "New Moon", "Full Moon")'),
    time: z.string().optional().describe('UTC timestamp of the phase'),
    value: z
      .number()
      .optional()
      .describe(
        'Phase value (0=New Moon, 0.25=First Quarter, 0.5=Full Moon, 0.75=Third Quarter)'
      )
  })
  .optional();

export let getAstronomyDataTool = SlateTool.create(spec, {
  name: 'Get Astronomy Data',
  key: 'get_astronomy_data',
  description: `Retrieve astronomy data for a specific location including sunrise, sunset, moonrise, moonset, moon phase, and twilight times.

Includes civil, nautical, and astronomical dawn/dusk times useful for outdoor activities and navigation.`,
  instructions: [
    'Provide latitude and longitude for the target location.',
    'Optionally specify a date range with start and end times.',
    'Moon phase values: 0.0 = New Moon, 0.25 = First Quarter, 0.5 = Full Moon, 0.75 = Third Quarter.'
  ],
  constraints: ['Maximum 10 days of data per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the location (-90 to 90)'),
      longitude: z.number().describe('Longitude of the location (-180 to 180)'),
      start: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 or UNIX timestamp format.'),
      end: z.string().optional().describe('End time in ISO 8601 or UNIX timestamp format.')
    })
  )
  .output(
    z.object({
      days: z
        .array(
          z.object({
            time: z.string().describe('Date for this data point'),
            sunrise: z.string().nullable().optional().describe('Sunrise time in UTC'),
            sunset: z.string().nullable().optional().describe('Sunset time in UTC'),
            moonrise: z.string().nullable().optional().describe('Moonrise time in UTC'),
            moonset: z.string().nullable().optional().describe('Moonset time in UTC'),
            moonFraction: z
              .number()
              .optional()
              .describe('Moon illumination fraction (0 to 1)'),
            moonPhase: moonPhaseSchema.describe('Current moon phase information'),
            closestMoonPhase: moonPhaseSchema.describe('Closest moon phase information'),
            astronomicalDawn: z
              .string()
              .nullable()
              .optional()
              .describe('Astronomical dawn time in UTC'),
            astronomicalDusk: z
              .string()
              .nullable()
              .optional()
              .describe('Astronomical dusk time in UTC'),
            civilDawn: z.string().nullable().optional().describe('Civil dawn time in UTC'),
            civilDusk: z.string().nullable().optional().describe('Civil dusk time in UTC'),
            nauticalDawn: z
              .string()
              .nullable()
              .optional()
              .describe('Nautical dawn time in UTC'),
            nauticalDusk: z
              .string()
              .nullable()
              .optional()
              .describe('Nautical dusk time in UTC')
          })
        )
        .describe('Daily astronomy data'),
      meta: z.record(z.string(), z.any()).describe('Request metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAstronomy({
      lat: ctx.input.latitude,
      lng: ctx.input.longitude,
      start: ctx.input.start,
      end: ctx.input.end
    });

    let days = result.data ?? [];

    return {
      output: {
        days,
        meta: result.meta ?? {}
      },
      message: `Retrieved **${days.length}** days of astronomy data for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();
