import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let sectionSchema = z.object({
  sectionId: z.string().optional().describe('Section identifier'),
  type: z.string().optional().describe('Section type (e.g. vehicle, pedestrian, transit)'),
  departure: z
    .object({
      time: z.string().optional(),
      place: z
        .object({
          type: z.string().optional(),
          location: z.object({ lat: z.number(), lng: z.number() }).optional(),
          originalLocation: z.object({ lat: z.number(), lng: z.number() }).optional()
        })
        .optional()
    })
    .optional(),
  arrival: z
    .object({
      time: z.string().optional(),
      place: z
        .object({
          type: z.string().optional(),
          location: z.object({ lat: z.number(), lng: z.number() }).optional(),
          originalLocation: z.object({ lat: z.number(), lng: z.number() }).optional()
        })
        .optional()
    })
    .optional(),
  summary: z
    .object({
      duration: z.number().optional().describe('Travel time in seconds'),
      length: z.number().optional().describe('Distance in meters'),
      baseDuration: z.number().optional().describe('Base duration without traffic in seconds')
    })
    .optional(),
  polyline: z.string().optional().describe('Flexible polyline encoded route geometry'),
  transport: z
    .object({
      mode: z.string().optional()
    })
    .optional()
});

let routeSchema = z.object({
  routeId: z.string().optional().describe('Route identifier'),
  sections: z.array(sectionSchema).optional().describe('Route sections')
});

export let calculateRoute = SlateTool.create(spec, {
  name: 'Calculate Route',
  key: 'calculate_route',
  description: `Calculate a route between an origin and destination for various transport modes (car, truck, pedestrian, bicycle, scooter, taxi, bus). Returns route summary with duration, distance, polyline geometry, and turn-by-turn instructions.
Supports truck-specific parameters (weight, height, hazardous goods), toll avoidance, and traffic-aware routing.`,
  instructions: [
    'Coordinates must be in "lat,lng" format (e.g. "52.5308,13.3847").',
    'Use "returnFields" to control response detail: "summary", "polyline", "actions", "instructions", "tolls", "elevation".',
    'For truck routing, set transportMode to "truck" and provide truck parameters.',
    'Set departureTime to "any" for traffic-independent results, or an ISO 8601 datetime for traffic-aware routing.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origin: z.string().describe('Starting point as "lat,lng" (e.g. "52.5308,13.3847")'),
      destination: z.string().describe('End point as "lat,lng" (e.g. "52.5323,13.3789")'),
      transportMode: z
        .enum(['car', 'truck', 'pedestrian', 'bicycle', 'scooter', 'taxi', 'bus'])
        .describe('Transport mode'),
      via: z
        .array(z.string())
        .optional()
        .describe('Intermediate waypoints as "lat,lng" strings'),
      returnFields: z
        .array(z.string())
        .optional()
        .describe(
          'Response fields to include: "summary", "polyline", "actions", "instructions", "tolls", "elevation", "turnByTurnActions", "routeHandle"'
        ),
      departureTime: z
        .string()
        .optional()
        .describe('Departure time in ISO 8601 format, or "any" for no traffic consideration'),
      arrivalTime: z.string().optional().describe('Desired arrival time in ISO 8601 format'),
      avoidFeatures: z
        .array(z.enum(['tollRoad', 'motorway', 'ferry', 'tunnel', 'dirtRoad']))
        .optional()
        .describe('Road features to avoid'),
      excludeCountries: z
        .array(z.string())
        .optional()
        .describe('Countries to exclude (ISO 3166-1 alpha-3 codes like "DEU")'),
      alternatives: z
        .number()
        .optional()
        .describe('Number of alternative routes to return (0-6)'),
      units: z.enum(['metric', 'imperial']).optional().describe('Measurement units'),
      lang: z.string().optional().describe('Language for instructions (BCP 47, e.g. "en-US")'),
      truckGrossWeight: z.number().optional().describe('Truck gross weight in kg'),
      truckHeight: z.number().optional().describe('Truck height in cm'),
      truckWidth: z.number().optional().describe('Truck width in cm'),
      truckLength: z.number().optional().describe('Truck length in cm'),
      truckAxleCount: z.number().optional().describe('Number of truck axles'),
      truckType: z.enum(['straight', 'tractor']).optional().describe('Truck type'),
      truckTrailerCount: z.number().optional().describe('Number of trailers'),
      truckShippedHazardousGoods: z
        .array(z.string())
        .optional()
        .describe('Hazardous goods types (e.g. "explosive", "gas", "flammable")')
    })
  )
  .output(
    z.object({
      routes: z.array(routeSchema).describe('Calculated routes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response = await client.calculateRoute({
      origin: ctx.input.origin,
      destination: ctx.input.destination,
      transportMode: ctx.input.transportMode,
      via: ctx.input.via,
      returnFields: ctx.input.returnFields || ['summary', 'polyline'],
      departureTime: ctx.input.departureTime,
      arrivalTime: ctx.input.arrivalTime,
      avoidFeatures: ctx.input.avoidFeatures,
      excludeCountries: ctx.input.excludeCountries,
      alternatives: ctx.input.alternatives,
      units: ctx.input.units,
      lang: ctx.input.lang,
      truckGrossWeight: ctx.input.truckGrossWeight,
      truckHeight: ctx.input.truckHeight,
      truckWidth: ctx.input.truckWidth,
      truckLength: ctx.input.truckLength,
      truckAxleCount: ctx.input.truckAxleCount,
      truckType: ctx.input.truckType,
      truckTrailerCount: ctx.input.truckTrailerCount,
      truckShippedHazardousGoods: ctx.input.truckShippedHazardousGoods
    });

    let routes = (response.routes || []).map((route: any, index: number) => ({
      routeId: route.id || `route-${index}`,
      sections: route.sections?.map((section: any) => ({
        sectionId: section.id,
        type: section.type,
        departure: section.departure,
        arrival: section.arrival,
        summary: section.summary,
        polyline: section.polyline,
        transport: section.transport
      }))
    }));

    let firstRoute = routes[0];
    let totalDuration =
      firstRoute?.sections?.reduce(
        (sum: number, s: any) => sum + (s.summary?.duration || 0),
        0
      ) || 0;
    let totalLength =
      firstRoute?.sections?.reduce(
        (sum: number, s: any) => sum + (s.summary?.length || 0),
        0
      ) || 0;
    let durationMin = Math.round(totalDuration / 60);
    let distanceKm = (totalLength / 1000).toFixed(1);

    return {
      output: { routes },
      message:
        routes.length > 0
          ? `Calculated **${routes.length}** route(s) by **${ctx.input.transportMode}**. Best route: **${distanceKm} km**, **${durationMin} min**.`
          : 'No route found for the given parameters.'
    };
  })
  .build();
