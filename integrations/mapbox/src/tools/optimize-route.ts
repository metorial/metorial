import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let optimizeRouteTool = SlateTool.create(spec, {
  name: 'Optimize Route',
  key: 'optimize_route',
  description: `Find the most efficient order to visit a set of waypoints (traveling salesman problem). Returns an optimized route with reordered waypoints that minimizes total travel time. Ideal for delivery routes, field service scheduling, and multi-stop trip planning.`,
  instructions: [
    'Provide 2-12 waypoints as semicolon-separated "longitude,latitude" pairs.',
    'Set roundtrip to false if the route should not return to the starting point.',
    'Use source and destination to fix the start and/or end point ("first", "last", or "any").'
  ],
  constraints: [
    'Supports 2-12 coordinate pairs per request.',
    'Rate limit: 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      coordinates: z
        .string()
        .describe('Semicolon-separated "longitude,latitude" pairs for waypoints to optimize'),
      profile: z
        .enum(['driving', 'driving-traffic', 'walking', 'cycling'])
        .default('driving')
        .describe('Travel profile'),
      roundtrip: z.boolean().optional().describe('Return to starting point (default true)'),
      source: z
        .enum(['any', 'first'])
        .optional()
        .describe('Which coordinate to use as route origin'),
      destination: z
        .enum(['any', 'last'])
        .optional()
        .describe('Which coordinate to use as route destination'),
      steps: z.boolean().optional().describe('Include turn-by-turn steps'),
      language: z.string().optional().describe('Language for instructions (IETF tag)'),
      annotations: z.string().optional().describe('Comma-separated: duration, distance, speed')
    })
  )
  .output(
    z.object({
      code: z.string().optional().describe('Response status code'),
      trips: z
        .array(
          z.object({
            durationSeconds: z.number().optional().describe('Total trip duration in seconds'),
            distanceMeters: z.number().optional().describe('Total trip distance in meters'),
            geometry: z.any().optional().describe('Optimized route geometry as GeoJSON'),
            legs: z.array(z.any()).optional().describe('Route legs with optional steps')
          })
        )
        .optional()
        .describe('Optimized trip(s)'),
      waypoints: z
        .array(
          z.object({
            name: z.string().optional().describe('Street name at waypoint'),
            location: z.array(z.number()).optional().describe('[longitude, latitude]'),
            waypointIndex: z.number().optional().describe('Optimized visit order index'),
            tripsIndex: z.number().optional().describe('Trip index this waypoint belongs to')
          })
        )
        .optional()
        .describe('Waypoints in optimized order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let result = await client.getOptimizedTrip(ctx.input.profile, ctx.input.coordinates, {
      roundtrip: ctx.input.roundtrip,
      source: ctx.input.source,
      destination: ctx.input.destination,
      steps: ctx.input.steps,
      language: ctx.input.language,
      annotations: ctx.input.annotations
    });

    let trips = (result.trips || []).map((t: any) => ({
      durationSeconds: t.duration,
      distanceMeters: t.distance,
      geometry: t.geometry,
      legs: t.legs
    }));

    let waypoints = (result.waypoints || []).map((w: any) => ({
      name: w.name,
      location: w.location,
      waypointIndex: w.waypoint_index,
      tripsIndex: w.trips_index
    }));

    let trip = trips[0];
    let durationMin = trip ? Math.round(trip.durationSeconds / 60) : 0;
    let distanceKm = trip ? ((trip.distanceMeters || 0) / 1000).toFixed(1) : '0';

    return {
      output: { code: result.code, trips, waypoints },
      message: `Optimized route visiting **${waypoints.length}** waypoints: **${durationMin} min**, **${distanceKm} km**.`
    };
  });
