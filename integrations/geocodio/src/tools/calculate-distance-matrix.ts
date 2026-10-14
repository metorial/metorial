import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  query: z.string(),
  id: z.string().nullable().optional(),
  location: z.array(z.number()).length(2),
  geocode: z.record(z.string(), z.unknown()).optional()
});

export let calculateDistanceMatrix = SlateTool.create(spec, {
  name: 'Calculate Distance Matrix',
  key: 'calculate_distance_matrix',
  description:
    'Calculate distances and driving travel times between multiple origins and destinations for route planning or nearest-location analysis. Locations may be addresses or "latitude,longitude" strings, optionally followed by a custom ID.',
  constraints: [
    'Origins multiplied by destinations must not exceed 10,000 calculations.',
    'Requires Distance API access enabled on the API key.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      origins: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(10000)
        .describe('Origin addresses or "latitude,longitude[,id]" strings'),
      destinations: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(10000)
        .describe('Destination addresses or "latitude,longitude[,id]" strings'),
      distanceMode: z
        .enum(['driving', 'straight-line'])
        .optional()
        .describe('Calculation mode; defaults to driving'),
      distanceUnits: z
        .enum(['miles', 'km'])
        .optional()
        .describe('Distance units; defaults to miles')
    })
  )
  .output(
    z.object({
      mode: z.string(),
      results: z.array(
        z.object({
          origin: locationSchema,
          destinations: z.array(
            locationSchema.extend({
              distance_miles: z.number().nullable().optional(),
              distance_km: z.number().nullable().optional(),
              duration_seconds: z.number().nullable().optional()
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.origins.length * ctx.input.destinations.length > 10000) {
      throw createApiServiceError(
        'A distance matrix can contain at most 10,000 calculations. Reduce the number of origins or destinations.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let response = await client.calculateDistanceMatrix({
      origins: ctx.input.origins,
      destinations: ctx.input.destinations,
      mode: ctx.input.distanceMode,
      units: ctx.input.distanceUnits
    });
    return {
      output: { mode: response.mode, results: response.results },
      message: `Calculated a distance matrix for **${ctx.input.origins.length}** origin(s) and **${ctx.input.destinations.length}** destination(s).`
    };
  })
  .build();
