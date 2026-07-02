import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let routeLegSchema = z.object({
  startAddress: z.string().optional().describe('Starting address of the leg'),
  endAddress: z.string().optional().describe('Ending address of the leg'),
  distanceText: z.string().optional().describe('Human-readable distance'),
  distanceMeters: z.number().optional().describe('Distance in meters'),
  durationText: z.string().optional().describe('Human-readable duration'),
  durationSeconds: z.number().optional().describe('Duration in seconds'),
  steps: z
    .array(
      z.object({
        instruction: z.string().optional().describe('Turn-by-turn instruction (HTML)'),
        distanceText: z.string().optional().describe('Step distance'),
        durationText: z.string().optional().describe('Step duration'),
        travelMode: z.string().optional().describe('Travel mode for this step')
      })
    )
    .optional()
    .describe('Turn-by-turn navigation steps')
});

let routeSchema = z.object({
  summary: z.string().optional().describe('Route summary (e.g. main road names)'),
  distanceText: z.string().optional().describe('Total distance'),
  distanceMeters: z.number().optional().describe('Total distance in meters'),
  durationText: z.string().optional().describe('Total duration'),
  durationSeconds: z.number().optional().describe('Total duration in seconds'),
  encodedPolyline: z.string().optional().describe('Encoded polyline for the route'),
  legs: z.array(routeLegSchema).describe('Route legs (one per waypoint pair)')
});

export let getDirectionsTool = SlateTool.create(spec, {
  name: 'Get Directions',
  key: 'get_directions',
  description: `Get directions between an origin and destination with optional waypoints. Supports driving, walking, cycling, and transit modes. Returns turn-by-turn instructions, distance, duration, and encoded polyline.`,
  instructions: [
    'Origin and destination can be addresses, place IDs (prefixed with "place_id:"), or "lat,lng" coordinates.',
    'Waypoints can be specified as addresses or coordinates. Prefix with "optimize:true|" to optimize waypoint order.'
  ],
  constraints: ['Maximum 25 waypoints per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origin: z.string().describe('Starting point (address, "lat,lng", or "place_id:xxx")'),
      destination: z.string().describe('Ending point (address, "lat,lng", or "place_id:xxx")'),
      mode: z
        .enum(['driving', 'walking', 'bicycling', 'transit'])
        .optional()
        .describe('Travel mode (default: driving)'),
      waypoints: z.array(z.string()).optional().describe('Intermediate stops'),
      alternatives: z.boolean().optional().describe('Request alternative routes'),
      avoid: z
        .array(z.enum(['tolls', 'highways', 'ferries', 'indoor']))
        .optional()
        .describe('Features to avoid'),
      units: z.enum(['metric', 'imperial']).optional().describe('Unit system for distances'),
      departureTime: z
        .string()
        .optional()
        .describe('Departure time as Unix timestamp in seconds, or "now"'),
      arrivalTime: z
        .string()
        .optional()
        .describe('Desired arrival time as Unix timestamp (transit only)'),
      language: z.string().optional().describe('Language for results'),
      region: z.string().optional().describe('Region bias as ccTLD')
    })
  )
  .output(
    z.object({
      routes: z.array(routeSchema).describe('Available routes'),
      totalRoutes: z.number().describe('Number of routes returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let response = await client.getDirections({
      origin: ctx.input.origin,
      destination: ctx.input.destination,
      mode: ctx.input.mode,
      waypoints: ctx.input.waypoints,
      alternatives: ctx.input.alternatives,
      avoid: ctx.input.avoid,
      units: ctx.input.units,
      departureTime: ctx.input.departureTime,
      arrivalTime: ctx.input.arrivalTime,
      language: ctx.input.language,
      region: ctx.input.region
    });

    if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
      throw new Error(`Directions request failed: ${response.status}`);
    }

    let rawRoutes = (response.routes as Record<string, unknown>[]) || [];

    let routes = rawRoutes.map(route => {
      let rawLegs = (route.legs as Record<string, unknown>[]) || [];

      let legs = rawLegs.map(leg => {
        let distance = leg.distance as Record<string, unknown> | undefined;
        let duration = leg.duration as Record<string, unknown> | undefined;
        let rawSteps = (leg.steps as Record<string, unknown>[]) || [];

        let steps = rawSteps.map(step => {
          let stepDist = step.distance as Record<string, unknown> | undefined;
          let stepDur = step.duration as Record<string, unknown> | undefined;
          return {
            instruction: step.html_instructions as string | undefined,
            distanceText: stepDist?.text as string | undefined,
            durationText: stepDur?.text as string | undefined,
            travelMode: step.travel_mode as string | undefined
          };
        });

        return {
          startAddress: leg.start_address as string | undefined,
          endAddress: leg.end_address as string | undefined,
          distanceText: distance?.text as string | undefined,
          distanceMeters: distance?.value as number | undefined,
          durationText: duration?.text as string | undefined,
          durationSeconds: duration?.value as number | undefined,
          steps
        };
      });

      let totalDistance = legs.reduce((sum, l) => sum + (l.distanceMeters || 0), 0);
      let totalDuration = legs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
      let totalDistanceText = legs
        .map(l => l.distanceText)
        .filter(Boolean)
        .join(' + ');
      let totalDurationText = legs
        .map(l => l.durationText)
        .filter(Boolean)
        .join(' + ');

      let overviewPolyline = route.overview_polyline as Record<string, string> | undefined;

      return {
        summary: route.summary as string | undefined,
        distanceText: legs.length === 1 ? legs[0]!.distanceText : totalDistanceText,
        distanceMeters: totalDistance,
        durationText: legs.length === 1 ? legs[0]!.durationText : totalDurationText,
        durationSeconds: totalDuration,
        encodedPolyline: overviewPolyline?.points,
        legs
      };
    });

    let best = routes[0];
    let message =
      routes.length > 0
        ? `Found **${routes.length}** route(s). Best: **${best?.durationText}**, **${best?.distanceText}** via ${best?.summary || 'calculated route'}.`
        : 'No routes found.';

    return {
      output: { routes, totalRoutes: routes.length },
      message
    };
  })
  .build();
