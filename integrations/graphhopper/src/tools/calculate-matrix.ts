import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

let normalizePoints = (
  points?: [number?, number?, ...unknown[]][]
): [number, number][] | undefined => {
  if (!points) return undefined;
  return points
    .map(point => [point[0], point[1]] as const)
    .filter(
      (point): point is readonly [number, number] =>
        typeof point[0] === 'number' && typeof point[1] === 'number'
    )
    .map(([lon, lat]) => [lon, lat]);
};

export let calculateMatrix = SlateTool.create(spec, {
  name: 'Calculate Matrix',
  key: 'calculate_matrix',
  description: `Compute distance and travel time matrices between multiple locations. Supports symmetric (NxN) and asymmetric matrices with separate origin/destination sets.
Returns distances in meters, times in seconds, and routing weights. Useful for comparing travel times between many locations or as input for route optimization.`,
  instructions: [
    'Points use [longitude, latitude] order (GeoJSON convention).',
    'For symmetric matrices, provide "points". For asymmetric, provide "fromPoints" and "toPoints" separately.',
    'Use outArrays to choose which matrices to return: "distances", "times", "weights".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
        .describe('Vehicle profile for distance/time calculations'),
      points: z
        .array(z.tuple([z.number(), z.number()]))
        .optional()
        .describe('Locations as [longitude, latitude] for symmetric NxN matrix'),
      fromPoints: z
        .array(z.tuple([z.number(), z.number()]))
        .optional()
        .describe('Origin locations as [longitude, latitude] for asymmetric matrix'),
      toPoints: z
        .array(z.tuple([z.number(), z.number()]))
        .optional()
        .describe('Destination locations as [longitude, latitude] for asymmetric matrix'),
      outArrays: z
        .array(z.enum(['distances', 'times', 'weights']))
        .optional()
        .describe('Which result matrices to return (default: ["weights"])'),
      failFast: z
        .boolean()
        .optional()
        .describe(
          'If false, returns null for unreachable pairs instead of failing (default: false)'
        )
    })
  )
  .output(
    z.object({
      distances: z
        .array(z.array(z.number().nullable()))
        .optional()
        .describe('Distance matrix in meters (null for unreachable pairs)'),
      times: z
        .array(z.array(z.number().nullable()))
        .optional()
        .describe('Time matrix in seconds (null for unreachable pairs)'),
      weights: z
        .array(z.array(z.number().nullable()))
        .optional()
        .describe('Weight matrix (null for unreachable pairs)'),
      processingTimeMs: z
        .number()
        .optional()
        .describe('Server processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });

    let result = await client.calculateMatrix({
      profile: ctx.input.profile,
      points: normalizePoints(ctx.input.points),
      fromPoints: normalizePoints(ctx.input.fromPoints),
      toPoints: normalizePoints(ctx.input.toPoints),
      outArrays: ctx.input.outArrays,
      failFast: ctx.input.failFast
    });

    let rowCount =
      result.distances?.length || result.times?.length || result.weights?.length || 0;
    let colCount =
      rowCount > 0
        ? result.distances?.[0]?.length ||
          result.times?.[0]?.length ||
          result.weights?.[0]?.length ||
          0
        : 0;

    return {
      output: {
        distances: result.distances,
        times: result.times,
        weights: result.weights,
        processingTimeMs: result.info?.took
      },
      message: `Computed **${rowCount}x${colCount}** matrix.${result.distances ? ' Includes distances.' : ''}${result.times ? ' Includes times.' : ''}${result.weights ? ' Includes weights.' : ''}`
    };
  })
  .build();
