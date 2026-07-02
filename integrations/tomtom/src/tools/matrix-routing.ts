import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let matrixRouting = SlateTool.create(spec, {
  name: 'Matrix Routing',
  key: 'matrix_routing',
  description: `Calculate a matrix of route summaries (travel times and distances) for multiple origin-destination pairs. Useful for finding the nearest facility, comparing multiple destinations, or building distance tables.`,
  constraints: ['Maximum matrix size is 100x100 (10,000 routes) for synchronous requests'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origins: z
        .array(
          z.object({
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude')
          })
        )
        .min(1)
        .describe('Origin locations'),
      destinations: z
        .array(
          z.object({
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude')
          })
        )
        .min(1)
        .describe('Destination locations'),
      routeType: z
        .enum(['fastest', 'shortest'])
        .optional()
        .describe('Route optimization type'),
      travelMode: z
        .enum(['car', 'truck', 'taxi', 'bus', 'van', 'motorcycle', 'bicycle', 'pedestrian'])
        .optional()
        .describe('Travel mode (default: car)'),
      traffic: z.enum(['live', 'historical']).optional().describe('Traffic model to use'),
      departAt: z.string().optional().describe('Departure time in ISO 8601 format')
    })
  )
  .output(
    z.object({
      cells: z
        .array(
          z.object({
            originIndex: z.number().describe('Index of the origin in the origins array'),
            destinationIndex: z
              .number()
              .describe('Index of the destination in the destinations array'),
            lengthInMeters: z.number().describe('Route distance in meters'),
            travelTimeInSeconds: z.number().describe('Estimated travel time in seconds'),
            trafficDelayInSeconds: z.number().optional().describe('Traffic delay in seconds')
          })
        )
        .describe('Matrix route summaries'),
      totalCount: z.number().describe('Total number of route calculations'),
      successCount: z.number().describe('Number of successful calculations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.matrixRouting({
      origins: ctx.input.origins,
      destinations: ctx.input.destinations,
      routeType: ctx.input.routeType,
      travelMode: ctx.input.travelMode,
      traffic: ctx.input.traffic,
      departAt: ctx.input.departAt
    });

    let cells = (data.data || []).map((cell: any) => ({
      originIndex: cell.originIndex,
      destinationIndex: cell.destinationIndex,
      lengthInMeters: cell.routeSummary?.lengthInMeters || 0,
      travelTimeInSeconds: cell.routeSummary?.travelTimeInSeconds || 0,
      trafficDelayInSeconds: cell.routeSummary?.trafficDelayInSeconds
    }));

    return {
      output: {
        cells,
        totalCount: data.statistics?.totalCount || cells.length,
        successCount: data.statistics?.successes || cells.length
      },
      message: `Calculated **${cells.length}** route(s) in a ${ctx.input.origins.length}x${ctx.input.destinations.length} matrix.`
    };
  })
  .build();
