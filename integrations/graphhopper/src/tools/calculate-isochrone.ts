import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

let polygonSchema = z.object({
  bucket: z
    .number()
    .describe('Bucket index (0-based) - smaller buckets represent closer areas'),
  geometry: z.unknown().describe('GeoJSON Polygon geometry with coordinates')
});

export let calculateIsochrone = SlateTool.create(spec, {
  name: 'Calculate Isochrone',
  key: 'calculate_isochrone',
  description: `Generate isochrone (equal travel time) or isodistance (equal distance) polygons from a starting point.
Shows how far you can travel within a given time or distance using a specific vehicle profile.
Useful for reachability analysis, service area visualization, and site selection.`,
  instructions: [
    'Use timeLimit for time-based isochrones (seconds) or distanceLimit for distance-based (meters).',
    'Set buckets > 1 to get nested concentric polygons showing incremental reach.',
    'Set reverseFlow to true to compute "who can reach this point" instead of "where can I go".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the center point'),
      longitude: z.number().describe('Longitude of the center point'),
      profile: z
        .enum([
          'car',
          'car_delivery',
          'car_avoid_ferry',
          'car_avoid_motorway',
          'car_avoid_toll',
          'small_truck',
          'small_truck_delivery',
          'truck',
          'scooter',
          'scooter_delivery',
          'foot',
          'hike',
          'bike',
          'mtb',
          'racingbike'
        ])
        .default('car')
        .describe('Vehicle profile'),
      timeLimit: z
        .number()
        .optional()
        .describe(
          'Travel time limit in seconds (default 600). Used for isochrone calculation.'
        ),
      distanceLimit: z
        .number()
        .optional()
        .describe(
          'Travel distance limit in meters. Used for isodistance calculation (overrides timeLimit).'
        ),
      buckets: z
        .number()
        .optional()
        .describe(
          'Number of nested isochrone rings (1-20, default 1). Time/distance is divided evenly.'
        ),
      reverseFlow: z
        .boolean()
        .optional()
        .describe(
          'If true, compute areas from which the center point is reachable (default false)'
        )
    })
  )
  .output(
    z.object({
      polygons: z.array(polygonSchema).describe('Isochrone/isodistance GeoJSON polygons'),
      processingTimeMs: z
        .number()
        .optional()
        .describe('Server processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });

    let result = await client.calculateIsochrone({
      point: `${ctx.input.latitude},${ctx.input.longitude}`,
      profile: ctx.input.profile,
      timeLimit: ctx.input.timeLimit,
      distanceLimit: ctx.input.distanceLimit,
      buckets: ctx.input.buckets,
      reverseFlow: ctx.input.reverseFlow
    });

    let polygons = ((result.polygons || []) as Record<string, unknown>[]).map(p => ({
      bucket: (p.properties as Record<string, number>)?.bucket ?? 0,
      geometry: (p as Record<string, unknown>).geometry
    }));

    let limitDescription = ctx.input.distanceLimit
      ? `${(ctx.input.distanceLimit / 1000).toFixed(1)} km distance`
      : `${((ctx.input.timeLimit || 600) / 60).toFixed(0)} min travel time`;

    return {
      output: {
        polygons,
        processingTimeMs: result.info?.took
      },
      message: `Generated **${polygons.length}** isochrone polygon(s) for **${limitDescription}** by ${ctx.input.profile}.`
    };
  })
  .build();
