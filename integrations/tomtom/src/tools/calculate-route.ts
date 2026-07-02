import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let calculateRoute = SlateTool.create(spec, {
  name: 'Calculate Route',
  key: 'calculate_route',
  description: `Plan a route between two or more locations, taking into account real-time and historical traffic. Supports multiple route types (fastest, shortest, eco), travel modes, waypoints, and vehicle-specific constraints. Returns route summary with distance, travel time, and traffic delays.`,
  instructions: [
    'Provide at least 2 locations (origin and destination); add intermediate waypoints as needed',
    'Set "computeBestOrder" to true to optimize the order of intermediate waypoints',
    'Use "avoid" to exclude toll roads, ferries, motorways, etc.',
    'Use "departAt" for departure-time-aware routing with traffic predictions'
  ],
  constraints: [
    'Maximum 150 waypoints (including origin and destination)',
    'Up to 5 alternative routes can be requested'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locations: z
        .array(
          z.object({
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude')
          })
        )
        .min(2)
        .describe('Route waypoints (minimum 2: origin and destination)'),
      routeType: z
        .enum(['fastest', 'shortest', 'short', 'eco', 'thrilling'])
        .optional()
        .describe('Route optimization type (default: fastest)'),
      travelMode: z
        .enum(['car', 'truck', 'taxi', 'bus', 'van', 'motorcycle', 'bicycle', 'pedestrian'])
        .optional()
        .describe('Travel mode (default: car)'),
      traffic: z.boolean().optional().describe('Consider real-time traffic (default: true)'),
      departAt: z.string().optional().describe('Departure time in ISO 8601 format or "now"'),
      arriveAt: z.string().optional().describe('Desired arrival time in ISO 8601 format'),
      maxAlternatives: z.number().optional().describe('Number of alternative routes (0-5)'),
      avoid: z
        .array(
          z.enum([
            'tollRoads',
            'motorways',
            'ferries',
            'unpavedRoads',
            'carpools',
            'borderCrossings',
            'tunnels'
          ])
        )
        .optional()
        .describe('Road types to avoid'),
      computeBestOrder: z
        .boolean()
        .optional()
        .describe('Optimize the order of intermediate waypoints'),
      vehicleMaxSpeed: z.number().optional().describe('Maximum vehicle speed in km/h'),
      vehicleWeight: z
        .number()
        .optional()
        .describe('Vehicle weight in kg (for truck routing)'),
      vehicleEngineType: z
        .enum(['combustion', 'electric'])
        .optional()
        .describe('Engine type for consumption models')
    })
  )
  .output(
    z.object({
      routes: z
        .array(
          z.object({
            lengthInMeters: z.number().describe('Total route length in meters'),
            travelTimeInSeconds: z.number().describe('Estimated travel time in seconds'),
            trafficDelayInSeconds: z.number().describe('Traffic-related delay in seconds'),
            departureTime: z.string().optional().describe('Estimated departure time'),
            arrivalTime: z.string().optional().describe('Estimated arrival time'),
            legs: z
              .array(
                z.object({
                  lengthInMeters: z.number().describe('Leg length in meters'),
                  travelTimeInSeconds: z.number().describe('Leg travel time in seconds'),
                  trafficDelayInSeconds: z.number().describe('Leg traffic delay in seconds')
                })
              )
              .describe('Route legs between waypoints')
          })
        )
        .describe('Calculated routes'),
      optimizedWaypoints: z
        .array(
          z.object({
            providedIndex: z.number().describe('Original waypoint index'),
            optimizedIndex: z.number().describe('Optimized waypoint index')
          })
        )
        .optional()
        .describe('Optimized waypoint order (when computeBestOrder is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.calculateRoute({
      locations: ctx.input.locations,
      routeType: ctx.input.routeType,
      travelMode: ctx.input.travelMode,
      traffic: ctx.input.traffic,
      departAt: ctx.input.departAt,
      arriveAt: ctx.input.arriveAt,
      maxAlternatives: ctx.input.maxAlternatives,
      avoid: ctx.input.avoid,
      computeBestOrder: ctx.input.computeBestOrder,
      vehicleMaxSpeed: ctx.input.vehicleMaxSpeed,
      vehicleWeight: ctx.input.vehicleWeight,
      vehicleEngineType: ctx.input.vehicleEngineType
    });

    let routes = (data.routes || []).map((route: any) => ({
      lengthInMeters: route.summary?.lengthInMeters || 0,
      travelTimeInSeconds: route.summary?.travelTimeInSeconds || 0,
      trafficDelayInSeconds: route.summary?.trafficDelayInSeconds || 0,
      departureTime: route.summary?.departureTime,
      arrivalTime: route.summary?.arrivalTime,
      legs: (route.legs || []).map((leg: any) => ({
        lengthInMeters: leg.summary?.lengthInMeters || 0,
        travelTimeInSeconds: leg.summary?.travelTimeInSeconds || 0,
        trafficDelayInSeconds: leg.summary?.trafficDelayInSeconds || 0
      }))
    }));

    let optimizedWaypoints = data.optimizedWaypoints?.map((w: any) => ({
      providedIndex: w.providedIndex,
      optimizedIndex: w.optimizedIndex
    }));

    let primary = routes[0];
    let distKm = primary ? (primary.lengthInMeters / 1000).toFixed(1) : '0';
    let timeMin = primary ? Math.round(primary.travelTimeInSeconds / 60) : 0;

    return {
      output: { routes, optimizedWaypoints },
      message: `Calculated **${routes.length}** route(s). Primary: **${distKm} km**, **${timeMin} min** travel time.`
    };
  })
  .build();
