import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

let normalizePoints = (points: [number?, number?, ...unknown[]][]): [number, number][] => {
  return points
    .map(point => [point[0], point[1]] as const)
    .filter(
      (point): point is readonly [number, number] =>
        typeof point[0] === 'number' && typeof point[1] === 'number'
    )
    .map(([lon, lat]) => [lon, lat]);
};

let instructionSchema = z.object({
  text: z.string().describe('Human-readable instruction text'),
  streetName: z.string().describe('Name of the street'),
  distance: z.number().describe('Distance for this segment in meters'),
  time: z.number().describe('Time for this segment in milliseconds'),
  sign: z.number().describe('Turn sign indicator'),
  interval: z.array(z.number()).describe('Point index interval for this instruction')
});

let pathSchema = z.object({
  distance: z.number().describe('Total distance in meters'),
  time: z.number().describe('Total travel time in milliseconds'),
  ascend: z.number().optional().describe('Total elevation gain in meters'),
  descend: z.number().optional().describe('Total elevation loss in meters'),
  bbox: z
    .array(z.number())
    .optional()
    .describe('Bounding box [minLon, minLat, maxLon, maxLat]'),
  points: z.unknown().describe('Route geometry as coordinate array'),
  instructions: z.array(instructionSchema).optional().describe('Turn-by-turn instructions'),
  details: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Path details keyed by detail type')
});

export let calculateRoute = SlateTool.create(spec, {
  name: 'Calculate Route',
  key: 'calculate_route',
  description: `Calculate the best route between two or more points. Returns distance, travel time, route geometry, and turn-by-turn instructions.
Supports different vehicle profiles (car, bike, foot, truck, etc.), alternative routes, round trips, via-point optimization, and custom routing models.
Points use **[longitude, latitude]** order (GeoJSON convention).`,
  instructions: [
    'Points must be in [longitude, latitude] order.',
    'Set algorithm to "alternative_route" to get multiple route options.',
    'Set algorithm to "round_trip" for circular routes starting and ending at the same point.',
    'Set optimize to true to reorder via-points for minimum travel time.'
  ],
  constraints: [
    'Custom models and alternative/round trip algorithms require disabling Contraction Hierarchies (done automatically).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      points: z
        .array(z.tuple([z.number(), z.number()]))
        .min(1)
        .describe(
          'Waypoints as [longitude, latitude] pairs. Minimum 2 for standard routing, 1 for round trips.'
        ),
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
        .describe('Vehicle profile for routing'),
      locale: z
        .string()
        .optional()
        .describe('Language for turn instructions (e.g., "en", "de", "fr")'),
      elevation: z.boolean().optional().describe('Include elevation data in the response'),
      instructions: z.boolean().optional().describe('Include turn-by-turn instructions'),
      optimize: z
        .boolean()
        .optional()
        .describe('Reorder via-points to minimize total travel time'),
      details: z
        .array(z.string())
        .optional()
        .describe(
          'Path details to include (e.g., "street_name", "time", "distance", "max_speed", "road_class", "surface")'
        ),
      algorithm: z
        .enum(['alternative_route', 'round_trip'])
        .optional()
        .describe(
          'Use "alternative_route" for multiple route options, "round_trip" for circular routes'
        ),
      alternativeRouteMaxPaths: z
        .number()
        .optional()
        .describe('Maximum number of alternative routes (default 2)'),
      alternativeRouteMaxWeightFactor: z
        .number()
        .optional()
        .describe('How much longer alternatives can be vs optimal (default 1.4)'),
      roundTripDistance: z
        .number()
        .optional()
        .describe('Approximate round trip distance in meters (default 10000)'),
      roundTripSeed: z.number().optional().describe('Random seed for round trip variation'),
      headings: z
        .array(z.number())
        .optional()
        .describe('Preferred heading in degrees (0-360, north-based clockwise) per point'),
      pointHints: z
        .array(z.string())
        .optional()
        .describe('Road name hints for point snapping, one per point'),
      snapPreventions: z
        .array(z.enum(['motorway', 'trunk', 'ferry', 'tunnel', 'bridge', 'ford']))
        .optional()
        .describe('Prevent snapping to specific road types'),
      curbsides: z
        .array(z.enum(['any', 'right', 'left']))
        .optional()
        .describe('Preferred side of road per point'),
      customModel: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom model to modify routing behavior (speed, priority rules, distance_influence, areas)'
        )
    })
  )
  .output(
    z.object({
      paths: z
        .array(pathSchema)
        .describe('Route paths (multiple if alternative routes requested)'),
      processingTimeMs: z
        .number()
        .optional()
        .describe('Server processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });

    let result = await client.calculateRoute({
      points: normalizePoints(ctx.input.points),
      profile: ctx.input.profile,
      locale: ctx.input.locale,
      elevation: ctx.input.elevation,
      instructions: ctx.input.instructions,
      optimize: ctx.input.optimize,
      details: ctx.input.details,
      algorithm: ctx.input.algorithm,
      alternativeRouteMaxPaths: ctx.input.alternativeRouteMaxPaths,
      alternativeRouteMaxWeightFactor: ctx.input.alternativeRouteMaxWeightFactor,
      roundTripDistance: ctx.input.roundTripDistance,
      roundTripSeed: ctx.input.roundTripSeed,
      headings: ctx.input.headings,
      pointHints: ctx.input.pointHints,
      snapPreventions: ctx.input.snapPreventions,
      curbsides: ctx.input.curbsides,
      customModel: ctx.input.customModel
    });

    let paths = (result.paths || []).map((p: Record<string, unknown>) => ({
      distance: p.distance,
      time: p.time,
      ascend: p.ascend,
      descend: p.descend,
      bbox: p.bbox,
      points: p.points,
      instructions: p.instructions
        ? (p.instructions as Record<string, unknown>[]).map(inst => ({
            text: inst.text,
            streetName: inst.street_name,
            distance: inst.distance,
            time: inst.time,
            sign: inst.sign,
            interval: inst.interval
          }))
        : undefined,
      details: p.details
    }));

    let primaryPath = paths[0];
    let distanceKm = primaryPath ? (Number(primaryPath.distance) / 1000).toFixed(1) : '0';
    let timeMin = primaryPath ? (Number(primaryPath.time) / 60000).toFixed(1) : '0';

    return {
      output: {
        paths,
        processingTimeMs: result.info?.took
      },
      message: `Calculated ${paths.length} route(s). Best route: **${distanceKm} km**, **${timeMin} min** travel time.`
    };
  })
  .build();
