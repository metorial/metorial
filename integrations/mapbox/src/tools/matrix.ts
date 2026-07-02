import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let matrixTool = SlateTool.create(spec, {
  name: 'Travel Time Matrix',
  key: 'matrix',
  description: `Calculate travel times and distances between multiple origins and destinations. Returns a matrix of durations and distances useful for logistics, fleet optimization, and finding nearest locations.`,
  instructions: [
    'Provide coordinates as semicolon-separated "longitude,latitude" pairs.',
    'Use "sources" and "destinations" to specify which coordinates are origins and which are destinations (zero-indexed, semicolon-separated, e.g., "0;1" and "2;3").',
    'If sources and destinations are not specified, all coordinates are used as both.'
  ],
  constraints: [
    'Maximum 25 coordinates (10 for driving-traffic).',
    'Maximum 625 elements (sources × destinations) per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      coordinates: z.string().describe('Semicolon-separated "longitude,latitude" pairs'),
      profile: z
        .enum(['driving', 'driving-traffic', 'walking', 'cycling'])
        .default('driving')
        .describe('Travel profile'),
      sources: z
        .string()
        .optional()
        .describe('Semicolon-separated indices for source coordinates (e.g., "0;1")'),
      destinations: z
        .string()
        .optional()
        .describe('Semicolon-separated indices for destination coordinates (e.g., "2;3")'),
      annotations: z
        .string()
        .optional()
        .describe('Comma-separated: "duration", "distance", or "duration,distance"'),
      fallbackSpeed: z
        .number()
        .optional()
        .describe('Speed (km/h) for direct path fallback when no route exists')
    })
  )
  .output(
    z.object({
      code: z.string().optional().describe('Response status code'),
      durations: z
        .array(z.array(z.number().nullable()))
        .optional()
        .describe('Matrix of travel durations in seconds [sources × destinations]'),
      distances: z
        .array(z.array(z.number().nullable()))
        .optional()
        .describe('Matrix of travel distances in meters [sources × destinations]'),
      sources: z
        .array(
          z.object({
            name: z.string().optional(),
            location: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Snapped source locations'),
      destinations: z
        .array(
          z.object({
            name: z.string().optional(),
            location: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Snapped destination locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let result = await client.getMatrix(ctx.input.profile, ctx.input.coordinates, {
      sources: ctx.input.sources,
      destinations: ctx.input.destinations,
      annotations: ctx.input.annotations,
      fallbackSpeed: ctx.input.fallbackSpeed
    });

    let srcCount = result.sources?.length || 0;
    let dstCount = result.destinations?.length || 0;

    return {
      output: {
        code: result.code,
        durations: result.durations,
        distances: result.distances,
        sources: result.sources?.map((s: any) => ({ name: s.name, location: s.location })),
        destinations: result.destinations?.map((d: any) => ({
          name: d.name,
          location: d.location
        }))
      },
      message: `Computed **${srcCount}×${dstCount}** travel matrix using ${ctx.input.profile} profile.`
    };
  });
