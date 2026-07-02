import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

let routeInfoSchema = z.object({
  distance: z
    .object({
      value: z.number().describe('Distance value in meters'),
      text: z.string().describe('Human-readable distance')
    })
    .optional()
    .describe('Route distance'),
  duration: z
    .object({
      value: z.number().describe('Duration value in minutes'),
      text: z.string().describe('Human-readable duration')
    })
    .optional()
    .describe('Route duration')
});

export let calculateDistanceTool = SlateTool.create(spec, {
  name: 'Calculate Distance',
  key: 'calculate_distance',
  description: `Calculate the travel distance and duration between an origin and destination. Supports multiple travel modes (car, truck, foot, bike) simultaneously and returns results for each mode.`,
  constraints: ['Rate limited to 100 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      originLatitude: z.number().describe('Origin latitude'),
      originLongitude: z.number().describe('Origin longitude'),
      destinationLatitude: z.number().describe('Destination latitude'),
      destinationLongitude: z.number().describe('Destination longitude'),
      modes: z
        .array(z.enum(['car', 'truck', 'foot', 'bike']))
        .describe('Travel modes to calculate'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Unit system (default imperial)'),
      avoid: z
        .string()
        .optional()
        .describe(
          'Comma-separated features to avoid: tolls, highways, ferries, borderCrossings'
        ),
      departureTime: z
        .string()
        .optional()
        .describe('ISO 8601 departure time for time-aware routing')
    })
  )
  .output(
    z.object({
      routes: z
        .record(z.string(), routeInfoSchema)
        .describe('Route results keyed by travel mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.getDistance({
      origin: `${ctx.input.originLatitude},${ctx.input.originLongitude}`,
      destination: `${ctx.input.destinationLatitude},${ctx.input.destinationLongitude}`,
      modes: ctx.input.modes.join(','),
      units: ctx.input.units,
      avoid: ctx.input.avoid,
      departureTime: ctx.input.departureTime
    });

    let routes: Record<string, any> = {};
    if (result.routes) {
      for (let [mode, route] of Object.entries(result.routes) as [string, any][]) {
        routes[mode] = {
          distance: route.distance,
          duration: route.duration
        };
      }
    }

    let modeSummaries = Object.entries(routes)
      .map(
        ([mode, r]) => `${mode}: ${r.duration?.text || 'N/A'}, ${r.distance?.text || 'N/A'}`
      )
      .join('; ');

    return {
      output: { routes },
      message: `Route calculated: ${modeSummaries}.`
    };
  })
  .build();

export let getDirectionsTool = SlateTool.create(spec, {
  name: 'Get Directions',
  key: 'get_directions',
  description: `Get turn-by-turn directions between multiple locations. Supports different travel modes and can return alternative routes.`,
  constraints: ['Rate limited to 10 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locations: z
        .array(
          z.object({
            latitude: z.number().describe('Latitude'),
            longitude: z.number().describe('Longitude')
          })
        )
        .min(2)
        .describe('Ordered list of locations (origin, optional waypoints, destination)'),
      mode: z
        .enum(['car', 'truck', 'foot', 'bike'])
        .optional()
        .describe('Travel mode (default car)'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Unit system (default imperial)'),
      avoid: z
        .string()
        .optional()
        .describe(
          'Comma-separated features to avoid: tolls, highways, ferries, borderCrossings'
        ),
      departureTime: z.string().optional().describe('ISO 8601 departure time'),
      alternatives: z.boolean().optional().describe('Whether to return alternative routes'),
      lang: z.string().optional().describe('Language preference for instructions')
    })
  )
  .output(
    z.object({
      routes: z
        .array(z.any())
        .describe('Directions routes with legs, steps, distance, and duration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let locations = ctx.input.locations.map(l => `${l.latitude},${l.longitude}`).join('|');

    let result = await client.getDirections({
      locations,
      mode: ctx.input.mode,
      units: ctx.input.units,
      avoid: ctx.input.avoid,
      departureTime: ctx.input.departureTime,
      alternatives: ctx.input.alternatives,
      lang: ctx.input.lang
    });

    let routes = result.routes || (result.route ? [result.route] : []);

    return {
      output: { routes },
      message: `Returned **${routes.length}** route(s).`
    };
  })
  .build();

export let calculateMatrixTool = SlateTool.create(spec, {
  name: 'Calculate Distance Matrix',
  key: 'calculate_distance_matrix',
  description: `Calculate distances and durations between multiple origins and destinations. Useful for comparing travel times across many location pairs simultaneously.`,
  constraints: ['Rate limited to 20 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origins: z
        .array(
          z.object({
            latitude: z.number().describe('Origin latitude'),
            longitude: z.number().describe('Origin longitude')
          })
        )
        .min(1)
        .describe('List of origin locations'),
      destinations: z
        .array(
          z.object({
            latitude: z.number().describe('Destination latitude'),
            longitude: z.number().describe('Destination longitude')
          })
        )
        .min(1)
        .describe('List of destination locations'),
      mode: z.enum(['car', 'truck', 'foot', 'bike']).describe('Travel mode'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Unit system (default imperial)'),
      avoid: z.string().optional().describe('Comma-separated features to avoid'),
      departureTime: z.string().optional().describe('ISO 8601 departure time')
    })
  )
  .output(
    z.object({
      matrix: z
        .array(z.array(z.any()))
        .describe('Matrix of route results [origins][destinations]')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let origins = ctx.input.origins.map(o => `${o.latitude},${o.longitude}`).join('|');
    let destinations = ctx.input.destinations
      .map(d => `${d.latitude},${d.longitude}`)
      .join('|');

    let result = await client.getMatrix({
      origins,
      destinations,
      mode: ctx.input.mode,
      units: ctx.input.units,
      avoid: ctx.input.avoid,
      departureTime: ctx.input.departureTime
    });

    return {
      output: { matrix: result.matrix || [] },
      message: `Distance matrix calculated for **${ctx.input.origins.length}** origin(s) × **${ctx.input.destinations.length}** destination(s).`
    };
  })
  .build();
