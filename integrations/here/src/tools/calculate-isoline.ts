import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let isolineSchema = z.object({
  range: z
    .object({
      type: z.string().optional().describe('Range type: time, distance, or consumption'),
      value: z.number().optional().describe('Range value')
    })
    .optional(),
  polygons: z
    .array(
      z.object({
        outer: z.string().optional().describe('Flexible polyline encoded polygon boundary')
      })
    )
    .optional()
    .describe('Isoline polygons')
});

export let calculateIsoline = SlateTool.create(spec, {
  name: 'Calculate Isoline',
  key: 'calculate_isoline',
  description: `Calculate reachable areas (isolines/isochrones) from a point based on time or distance constraints. Returns polygon boundaries showing how far you can travel within given limits.
Useful for delivery zone planning, accessibility analysis, and coverage mapping.`,
  instructions: [
    'Provide "origin" for forward isolines (reachable area from a point) or "destination" for reverse isolines (area that can reach the destination).',
    'rangeValues are in seconds for time-based, meters for distance-based isolines.',
    'You can request multiple ranges at once (e.g. [300, 600, 900] for 5, 10, 15 minute isolines).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origin: z.string().optional().describe('Start point for forward isoline as "lat,lng"'),
      destination: z
        .string()
        .optional()
        .describe('End point for reverse isoline as "lat,lng"'),
      transportMode: z
        .enum(['car', 'truck', 'pedestrian', 'bicycle'])
        .describe('Transport mode'),
      rangeType: z
        .enum(['time', 'distance', 'consumption'])
        .describe('Range type: "time" (seconds), "distance" (meters), or "consumption"'),
      rangeValues: z
        .array(z.number())
        .describe('Range values (e.g. [300, 600, 900] for time in seconds)'),
      departureTime: z.string().optional().describe('Departure time in ISO 8601 or "any"'),
      routingMode: z
        .enum(['fast', 'short'])
        .optional()
        .describe('Routing optimization: "fast" (default) or "short"'),
      optimizeFor: z
        .enum(['quality', 'performance', 'balanced'])
        .optional()
        .describe('Optimize for quality or performance'),
      avoidFeatures: z
        .array(z.enum(['tollRoad', 'motorway', 'ferry', 'tunnel', 'dirtRoad']))
        .optional()
        .describe('Road features to avoid'),
      shapeMaxPoints: z.number().optional().describe('Limit polygon points for simpler shapes')
    })
  )
  .output(
    z.object({
      isolines: z.array(isolineSchema).describe('Computed isolines with polygon boundaries'),
      departure: z
        .object({
          time: z.string().optional(),
          place: z
            .object({
              location: z.object({ lat: z.number(), lng: z.number() }).optional()
            })
            .optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response = await client.calculateIsoline({
      origin: ctx.input.origin,
      destination: ctx.input.destination,
      transportMode: ctx.input.transportMode,
      rangeType: ctx.input.rangeType,
      rangeValues: ctx.input.rangeValues,
      departureTime: ctx.input.departureTime,
      routingMode: ctx.input.routingMode,
      optimizeFor: ctx.input.optimizeFor,
      avoidFeatures: ctx.input.avoidFeatures,
      shapeMaxPoints: ctx.input.shapeMaxPoints
    });

    let isolines = (response.isolines || []).map((iso: any) => ({
      range: iso.range,
      polygons: iso.polygons?.map((p: any) => ({ outer: p.outer }))
    }));

    let rangeDesc = ctx.input.rangeValues
      .map(v =>
        ctx.input.rangeType === 'time'
          ? `${Math.round(v / 60)} min`
          : `${(v / 1000).toFixed(1)} km`
      )
      .join(', ');

    return {
      output: {
        isolines,
        departure: response.departure
      },
      message: `Computed **${isolines.length}** isoline(s) for **${ctx.input.transportMode}** (${ctx.input.rangeType}: ${rangeDesc}).`
    };
  })
  .build();
