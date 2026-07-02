import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let optimizeWaypoints = SlateTool.create(spec, {
  name: 'Optimize Waypoints',
  key: 'optimize_waypoints',
  description: `Optimize the visiting order of waypoints for the fastest overall route (traveling salesman problem). Takes a set of locations and returns the optimal sequence, considering traffic and optional time constraints.`,
  constraints: ['Maximum 12 waypoints including origin and destination'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      waypoints: z
        .array(
          z.object({
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude'),
            serviceTimeInSeconds: z
              .number()
              .optional()
              .describe('Time spent at this waypoint in seconds')
          })
        )
        .min(3)
        .describe('Waypoints to optimize (minimum 3)'),
      originIndex: z.number().optional().describe('Index of the fixed starting waypoint'),
      destinationIndex: z.number().optional().describe('Index of the fixed ending waypoint'),
      travelMode: z.enum(['car', 'truck']).optional().describe('Travel mode (default: car)'),
      traffic: z
        .enum(['historical', 'live'])
        .optional()
        .describe('Traffic model (default: historical)'),
      departAt: z.string().optional().describe('Departure time in ISO 8601 format')
    })
  )
  .output(
    z.object({
      optimizedOrder: z
        .array(z.number())
        .describe('Optimal visiting order as waypoint indices'),
      totalLengthInMeters: z.number().optional().describe('Total route distance in meters'),
      totalTravelTimeInSeconds: z.number().optional().describe('Total travel time in seconds'),
      legs: z
        .array(
          z.object({
            fromIndex: z.number().describe('Origin waypoint index'),
            toIndex: z.number().describe('Destination waypoint index'),
            lengthInMeters: z.number().describe('Leg distance in meters'),
            travelTimeInSeconds: z.number().describe('Leg travel time in seconds')
          })
        )
        .optional()
        .describe('Individual leg summaries in optimized order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.waypointOptimization({
      waypoints: ctx.input.waypoints,
      originIndex: ctx.input.originIndex,
      destinationIndex: ctx.input.destinationIndex,
      travelMode: ctx.input.travelMode,
      traffic: ctx.input.traffic,
      departAt: ctx.input.departAt
    });

    let optimizedOrder = data.optimizedOrder || [];
    let summary = data.summary?.routeSummary;
    let legs = (data.summary?.legSummaries || []).map((leg: any) => ({
      fromIndex: leg.originIndex,
      toIndex: leg.destinationIndex,
      lengthInMeters: leg.lengthInMeters || 0,
      travelTimeInSeconds: leg.travelTimeInSeconds || 0
    }));

    return {
      output: {
        optimizedOrder,
        totalLengthInMeters: summary?.lengthInMeters,
        totalTravelTimeInSeconds: summary?.travelTimeInSeconds,
        legs
      },
      message: `Optimized **${ctx.input.waypoints.length}** waypoints. Order: [${optimizedOrder.join(' → ')}].`
    };
  })
  .build();
