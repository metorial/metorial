import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

let travelModeEnum = z.enum([
  'drive',
  'light_truck',
  'medium_truck',
  'truck',
  'heavy_truck',
  'truck_dangerous_goods',
  'long_truck',
  'bus',
  'scooter',
  'motorcycle',
  'bicycle',
  'mountain_bike',
  'road_bike',
  'walk',
  'hike',
  'transit',
  'approximated_transit'
]);

let waypointSchema = z.object({
  lat: z.number().describe('Latitude'),
  lon: z.number().describe('Longitude')
});

let stepSchema = z.object({
  distance: z.number().optional().describe('Step distance in meters'),
  time: z.number().optional().describe('Step time in seconds'),
  instruction: z.string().optional().describe('Turn-by-turn instruction text')
});

let legSchema = z.object({
  distance: z.number().optional().describe('Leg distance in meters'),
  time: z.number().optional().describe('Leg time in seconds'),
  steps: z.array(stepSchema).optional().describe('Turn-by-turn steps')
});

export let calculateRoute = SlateTool.create(spec, {
  name: 'Calculate Route',
  key: 'calculate_route',
  description: `Calculate a route between two or more waypoints. Supports 17 travel modes including driving, trucking, cycling, walking, hiking, scooter, and public transit. Returns distance, travel time, and turn-by-turn navigation instructions. You can avoid toll roads, ferries, highways, and specific locations.`,
  instructions: [
    'Provide at least 2 waypoints.',
    'Avoid syntax: "tolls", "ferries", "highways", "tunnels", "location:lat,lon". Combine with pipe (|).',
    'Set details to "instruction_details" for detailed turn-by-turn, "route_details" for road info, or "elevation" for elevation profile.'
  ],
  constraints: ['Routes cost 1 credit per waypoint pair plus 1 additional credit per 500km.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      waypoints: z
        .array(waypointSchema)
        .min(2)
        .describe('Ordered list of waypoints (at least 2)'),
      mode: travelModeEnum.describe('Travel mode'),
      type: z
        .enum(['balanced', 'short', 'less_maneuvers'])
        .optional()
        .describe('Route optimization type (default: balanced)'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Measurement system (default: metric)'),
      lang: z.string().optional().describe('ISO 639-1 language code for instructions'),
      avoid: z
        .string()
        .optional()
        .describe('Road types to avoid (e.g. "tolls|ferries|highways")'),
      details: z
        .string()
        .optional()
        .describe(
          'Extra response data: "instruction_details", "route_details", "elevation" (comma-separated)'
        ),
      traffic: z
        .enum(['free_flow', 'approximated'])
        .optional()
        .describe('Traffic model (default: free_flow)'),
      maxSpeed: z.number().optional().describe('Maximum vehicle speed in km/h')
    })
  )
  .output(
    z.object({
      totalDistance: z.number().describe('Total route distance in meters'),
      totalTime: z.number().describe('Total route time in seconds'),
      legs: z.array(legSchema).describe('Route legs between consecutive waypoints'),
      geometry: z.any().optional().describe('Route GeoJSON geometry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let waypointsStr = ctx.input.waypoints.map(wp => `${wp.lat},${wp.lon}`).join('|');

    let data = await client.calculateRoute({
      waypoints: waypointsStr,
      mode: ctx.input.mode,
      type: ctx.input.type,
      units: ctx.input.units,
      lang: ctx.input.lang,
      avoid: ctx.input.avoid,
      details: ctx.input.details,
      traffic: ctx.input.traffic,
      maxSpeed: ctx.input.maxSpeed
    });

    let feature = data.features?.[0];
    let props = feature?.properties || {};

    let legs = (props.legs || []).map((leg: any) => ({
      distance: leg.distance,
      time: leg.time,
      steps: (leg.steps || []).map((step: any) => ({
        distance: step.distance,
        time: step.time,
        instruction: step.instruction?.text
      }))
    }));

    let totalDistance = props.distance || 0;
    let totalTime = props.time || 0;

    let distKm = (totalDistance / 1000).toFixed(1);
    let durationMin = Math.round(totalTime / 60);

    return {
      output: {
        totalDistance,
        totalTime,
        legs,
        geometry: feature?.geometry
      },
      message: `Route calculated: **${distKm} km**, approximately **${durationMin} minutes** via ${ctx.input.mode} mode with ${legs.length} leg(s).`
    };
  })
  .build();
