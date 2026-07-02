import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let waypointSchema = z.object({
  latitude: z.number().optional().describe('Latitude of the waypoint'),
  longitude: z.number().optional().describe('Longitude of the waypoint'),
  placeId: z.string().optional().describe('Google place ID of the waypoint')
});

let matrixElementSchema = z.object({
  originIndex: z.number().describe('Index of the origin in the origins array'),
  destinationIndex: z.number().describe('Index of the destination in the destinations array'),
  duration: z.string().optional().describe('Travel duration (e.g. "300s")'),
  distanceMeters: z.number().optional().describe('Travel distance in meters'),
  status: z.string().optional().describe('Status of this element'),
  condition: z.string().optional().describe('Route condition')
});

let normalizeElementStatus = (status: unknown) => {
  if (typeof status === 'string') {
    return status;
  }

  if (!status || typeof status !== 'object') {
    return undefined;
  }

  let record = status as Record<string, unknown>;

  if (typeof record.message === 'string' && record.message.length > 0) {
    return record.message;
  }

  if (typeof record.code === 'number' || typeof record.code === 'string') {
    return String(record.code);
  }

  return undefined;
};

export let computeRouteMatrixTool = SlateTool.create(spec, {
  name: 'Compute Route Matrix',
  key: 'compute_route_matrix',
  description: `Compute travel times and distances between multiple origins and destinations. Returns a matrix of durations and distances for every origin-destination pair, useful for logistics, finding the nearest location, or planning multi-point trips.`,
  instructions: ['Each waypoint needs either latitude/longitude or a placeId.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origins: z.array(waypointSchema).describe('List of origin locations'),
      destinations: z.array(waypointSchema).describe('List of destination locations'),
      travelMode: z
        .enum(['DRIVE', 'BICYCLE', 'WALK', 'TWO_WHEELER'])
        .optional()
        .describe('Travel mode (default: DRIVE)'),
      routingPreference: z
        .enum(['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'])
        .optional()
        .describe('Traffic routing preference')
    })
  )
  .output(
    z.object({
      elements: z
        .array(matrixElementSchema)
        .describe(
          'Matrix elements with duration and distance for each origin-destination pair'
        ),
      totalPairs: z.number().describe('Total number of origin-destination pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let toLocation = (wp: { latitude?: number; longitude?: number; placeId?: string }) => {
      if (wp.placeId) return { placeId: wp.placeId };
      return { latitude: wp.latitude!, longitude: wp.longitude! };
    };

    let response = await client.computeRouteMatrix({
      origins: ctx.input.origins.map(toLocation),
      destinations: ctx.input.destinations.map(toLocation),
      travelMode: ctx.input.travelMode,
      routingPreference: ctx.input.routingPreference
    });

    let elements: Record<string, unknown>[] = Array.isArray(response) ? response : [response];

    let mappedElements = elements.map(el => ({
      originIndex: el.originIndex as number,
      destinationIndex: el.destinationIndex as number,
      duration: el.duration as string | undefined,
      distanceMeters: el.distanceMeters as number | undefined,
      status: normalizeElementStatus(el.status),
      condition: el.condition as string | undefined
    }));

    let message = `Computed route matrix: **${ctx.input.origins.length}** origins × **${ctx.input.destinations.length}** destinations = **${mappedElements.length}** pairs.`;

    return {
      output: { elements: mappedElements, totalPairs: mappedElements.length },
      message
    };
  })
  .build();
