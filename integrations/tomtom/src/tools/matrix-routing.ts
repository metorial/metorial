import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let matrixRouting = SlateTool.create(spec, {
  name: 'Matrix Routing',
  key: 'matrix_routing',
  description: `Calculate a matrix of route summaries (travel times and distances) for multiple origin-destination pairs. Useful for finding the nearest facility, comparing multiple destinations, or building distance tables.`,
  constraints: [
    'Standard synchronous requests support up to 100 routes; specific fastest/historical options allow 200, or 2,500 with Enterprise access',
    'Synchronous routing supports fastest and car, truck, or pedestrian travel modes'
  ],
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
        .describe('Successfully calculated matrix route summaries'),
      failedCells: z
        .array(
          z.object({
            originIndex: z.number(),
            destinationIndex: z.number(),
            errorCode: z.string().optional()
          })
        )
        .optional()
        .describe('Failed route pairs and their provider error codes'),
      failureCount: z.number().optional().describe('Number of failed route calculations'),
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

    let rawCells = data.data || [];
    let cells = rawCells
      .filter((cell: any) => cell.routeSummary && !cell.detailedError)
      .map((cell: any) => ({
        originIndex: cell.originIndex,
        destinationIndex: cell.destinationIndex,
        lengthInMeters: cell.routeSummary.lengthInMeters,
        travelTimeInSeconds: cell.routeSummary.travelTimeInSeconds,
        trafficDelayInSeconds: cell.routeSummary?.trafficDelayInSeconds
      }));
    let failedCells = rawCells
      .filter((cell: any) => cell.detailedError)
      .map((cell: any) => ({
        originIndex: cell.originIndex,
        destinationIndex: cell.destinationIndex,
        errorCode: cell.detailedError.code
      }));

    return {
      output: {
        cells,
        failedCells,
        failureCount: data.statistics?.failures ?? failedCells.length,
        totalCount: data.statistics?.totalCount ?? rawCells.length,
        successCount: data.statistics?.successes ?? cells.length
      },
      message: `Calculated **${cells.length}** route(s) in a ${ctx.input.origins.length}x${ctx.input.destinations.length} matrix; **${failedCells.length}** failed.`
    };
  })
  .build();
