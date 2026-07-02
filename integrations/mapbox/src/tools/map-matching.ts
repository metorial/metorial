import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let mapMatchingTool = SlateTool.create(spec, {
  name: 'Map Matching',
  key: 'map_matching',
  description: `Snap GPS traces to the road and path network. Takes a series of coordinates (potentially noisy GPS data) and returns the most likely route along actual roads. Useful for cleaning up recorded GPS tracks, fleet tracking data, or activity traces.`,
  instructions: [
    'Provide coordinates as semicolon-separated "longitude,latitude" pairs from a recorded trace.',
    'Use "tidy" to remove redundant coordinates before matching.',
    'Optionally provide "timestamps" (Unix seconds, semicolon-separated) for better accuracy.',
    'Optionally provide "radiuses" (meters, semicolon-separated) for GPS accuracy per point.'
  ],
  constraints: ['Supports 2-100 coordinate pairs per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      coordinates: z
        .string()
        .describe('Semicolon-separated "longitude,latitude" pairs from a GPS trace'),
      profile: z
        .enum(['driving', 'driving-traffic', 'walking', 'cycling'])
        .default('driving')
        .describe('Travel profile'),
      steps: z.boolean().optional().describe('Include turn-by-turn steps'),
      tidy: z.boolean().optional().describe('Remove redundant coordinates before matching'),
      timestamps: z
        .string()
        .optional()
        .describe('Semicolon-separated Unix timestamps (seconds) for each coordinate'),
      radiuses: z
        .string()
        .optional()
        .describe('Semicolon-separated GPS accuracy in meters for each coordinate'),
      annotations: z
        .string()
        .optional()
        .describe('Comma-separated: duration, distance, speed, congestion'),
      language: z.string().optional().describe('Language for instructions (IETF tag)')
    })
  )
  .output(
    z.object({
      code: z.string().optional().describe('Response status code'),
      matchings: z
        .array(
          z.object({
            confidence: z.number().optional().describe('Match confidence (0-1)'),
            durationSeconds: z
              .number()
              .optional()
              .describe('Matched route duration in seconds'),
            distanceMeters: z.number().optional().describe('Matched route distance in meters'),
            geometry: z.any().optional().describe('Matched route geometry as GeoJSON'),
            legs: z.array(z.any()).optional().describe('Route legs with optional steps')
          })
        )
        .optional()
        .describe('Matched routes'),
      tracepoints: z
        .array(
          z
            .object({
              name: z.string().optional().describe('Street name at the matched point'),
              location: z
                .array(z.number())
                .optional()
                .describe('[longitude, latitude] of matched point'),
              matchingsIndex: z
                .number()
                .optional()
                .describe('Index of the matching this tracepoint belongs to'),
              waypointIndex: z
                .number()
                .optional()
                .describe('Index of the waypoint within the matching'),
              alternativesCount: z
                .number()
                .optional()
                .describe('Number of alternative matchings')
            })
            .nullable()
        )
        .optional()
        .describe('Matched tracepoints (null if unmatched)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let result = await client.matchTrace(ctx.input.profile, ctx.input.coordinates, {
      steps: ctx.input.steps,
      tidy: ctx.input.tidy,
      timestamps: ctx.input.timestamps,
      radiuses: ctx.input.radiuses,
      annotations: ctx.input.annotations,
      language: ctx.input.language
    });

    let matchings = (result.matchings || []).map((m: any) => ({
      confidence: m.confidence,
      durationSeconds: m.duration,
      distanceMeters: m.distance,
      geometry: m.geometry,
      legs: m.legs
    }));

    let tracepoints = (result.tracepoints || []).map((t: any) =>
      t
        ? {
            name: t.name,
            location: t.location,
            matchingsIndex: t.matchings_index,
            waypointIndex: t.waypoint_index,
            alternativesCount: t.alternatives_count
          }
        : null
    );

    let matchCount = matchings.length;
    let avgConfidence =
      matchCount > 0
        ? (
            (matchings.reduce((sum: number, m: any) => sum + (m.confidence || 0), 0) /
              matchCount) *
            100
          ).toFixed(0)
        : '0';

    return {
      output: { code: result.code, matchings, tracepoints },
      message: `Matched trace to **${matchCount}** route segment${matchCount !== 1 ? 's' : ''} with ${avgConfidence}% average confidence.`
    };
  });
