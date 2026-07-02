import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let routeSchema = z.object({
  durationSeconds: z.number().describe('Estimated travel time in seconds'),
  distanceMeters: z.number().describe('Total distance in meters'),
  geometry: z.any().optional().describe('Route geometry as GeoJSON LineString'),
  weightName: z
    .string()
    .optional()
    .describe('Weight profile used (e.g., routability, duration)'),
  legs: z
    .array(
      z.object({
        durationSeconds: z.number().describe('Leg duration in seconds'),
        distanceMeters: z.number().describe('Leg distance in meters'),
        summary: z.string().optional().describe('Leg summary (road names)'),
        steps: z
          .array(
            z.object({
              durationSeconds: z.number().optional().describe('Step duration in seconds'),
              distanceMeters: z.number().optional().describe('Step distance in meters'),
              instruction: z.string().optional().describe('Turn-by-turn instruction'),
              name: z.string().optional().describe('Road/path name'),
              maneuver: z
                .object({
                  type: z.string().optional(),
                  modifier: z.string().optional(),
                  location: z.array(z.number()).optional()
                })
                .optional()
            })
          )
          .optional()
          .describe('Turn-by-turn steps')
      })
    )
    .optional()
    .describe('Route legs between waypoints')
});

export let directionsTool = SlateTool.create(spec, {
  name: 'Directions',
  key: 'directions',
  description: `Calculate optimal routes between locations with turn-by-turn instructions. Supports driving, walking, and cycling profiles with optional real-time traffic data. Returns route geometry, duration, distance, and detailed navigation steps.`,
  instructions: [
    'Provide coordinates as semicolon-separated "longitude,latitude" pairs (e.g., "-73.989,40.733;-74.006,40.714").',
    'Set "steps" to true to get turn-by-turn navigation instructions.',
    'Use "driving-traffic" profile for routes that account for current traffic conditions.'
  ],
  constraints: [
    'Supports 2-25 waypoint coordinates per request.',
    'The driving-traffic profile may have higher latency.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      coordinates: z
        .string()
        .describe(
          'Semicolon-separated "longitude,latitude" pairs (e.g., "-73.989,40.733;-74.006,40.714")'
        ),
      profile: z
        .enum(['driving', 'driving-traffic', 'walking', 'cycling'])
        .default('driving')
        .describe('Routing profile'),
      alternatives: z.boolean().optional().describe('Return alternative routes (up to 2)'),
      steps: z.boolean().optional().describe('Include turn-by-turn steps'),
      language: z
        .string()
        .optional()
        .describe('Language for instructions (IETF tag, e.g., "en", "fr")'),
      overview: z
        .enum(['full', 'simplified', 'false'])
        .optional()
        .describe('Detail level of route geometry'),
      annotations: z
        .string()
        .optional()
        .describe(
          'Comma-separated annotations: duration, distance, speed, congestion, congestion_numeric'
        ),
      exclude: z
        .string()
        .optional()
        .describe(
          'Comma-separated road types to exclude: toll, motorway, ferry, unpaved, cash_only_tolls'
        )
    })
  )
  .output(
    z.object({
      routes: z.array(routeSchema).describe('Calculated routes'),
      waypoints: z
        .array(
          z.object({
            name: z.string().optional().describe('Waypoint street name'),
            location: z
              .array(z.number())
              .optional()
              .describe('[longitude, latitude] snapped to road')
          })
        )
        .optional()
        .describe('Snapped waypoint locations'),
      code: z.string().optional().describe('Response status code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let result = await client.getDirections(ctx.input.profile, ctx.input.coordinates, {
      alternatives: ctx.input.alternatives,
      steps: ctx.input.steps,
      language: ctx.input.language,
      overview: ctx.input.overview,
      annotations: ctx.input.annotations,
      exclude: ctx.input.exclude
    });

    let routes = (result.routes || []).map((r: any) => ({
      durationSeconds: r.duration,
      distanceMeters: r.distance,
      geometry: r.geometry,
      weightName: r.weight_name,
      legs: r.legs?.map((l: any) => ({
        durationSeconds: l.duration,
        distanceMeters: l.distance,
        summary: l.summary,
        steps: l.steps?.map((s: any) => ({
          durationSeconds: s.duration,
          distanceMeters: s.distance,
          instruction: s.maneuver?.instruction,
          name: s.name,
          maneuver: s.maneuver
            ? {
                type: s.maneuver.type,
                modifier: s.maneuver.modifier,
                location: s.maneuver.location
              }
            : undefined
        }))
      }))
    }));

    let waypoints = result.waypoints?.map((w: any) => ({
      name: w.name,
      location: w.location
    }));

    let primaryRoute = routes[0];
    let durationMin = primaryRoute ? Math.round(primaryRoute.durationSeconds / 60) : 0;
    let distanceKm = primaryRoute ? (primaryRoute.distanceMeters / 1000).toFixed(1) : '0';

    return {
      output: { routes, waypoints, code: result.code },
      message: `Found **${routes.length}** route${routes.length !== 1 ? 's' : ''}. Best route: **${durationMin} min**, **${distanceKm} km** via ${ctx.input.profile}.`
    };
  });
