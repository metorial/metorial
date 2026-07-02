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

export let calculateIsoline = SlateTool.create(spec, {
  name: 'Calculate Isoline',
  key: 'calculate_isoline',
  description: `Calculate reachability areas from a point — either isochrones (areas reachable within a travel time) or isodistances (areas reachable within a distance). Returns GeoJSON polygons representing the reachable area. Supports multiple ranges in a single request.`,
  instructions: [
    'For isochrones (time-based), set type to "time" and provide range in seconds (e.g. "300,600,900" for 5, 10, 15 min).',
    'For isodistances (distance-based), set type to "distance" and provide range in meters (e.g. "1000,5000,10000").',
    'Multiple comma-separated ranges generate multiple polygons in one request.'
  ],
  constraints: [
    'Maximum 60 minutes (3600 seconds) for isochrones.',
    'Maximum 60 km (60000 meters) for isodistances.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().describe('Origin latitude'),
      lon: z.number().describe('Origin longitude'),
      type: z
        .enum(['time', 'distance'])
        .describe('"time" for isochrone (seconds), "distance" for isodistance (meters)'),
      mode: travelModeEnum.describe('Travel mode'),
      range: z
        .string()
        .describe('Comma-separated range values (seconds for time, meters for distance)'),
      avoid: z.string().optional().describe('Road types to avoid (e.g. "tolls|ferries")'),
      traffic: z.enum(['free_flow', 'approximated']).optional().describe('Traffic model'),
      routeType: z
        .enum(['balanced', 'short', 'less_maneuvers'])
        .optional()
        .describe('Route optimization type'),
      maxSpeed: z.number().optional().describe('Maximum vehicle speed in km/h'),
      units: z.enum(['metric', 'imperial']).optional().describe('Measurement system')
    })
  )
  .output(
    z.object({
      isolines: z
        .array(
          z.object({
            range: z.number().optional().describe('Range value for this isoline'),
            geometry: z
              .any()
              .describe('GeoJSON Polygon/MultiPolygon geometry of the reachable area')
          })
        )
        .describe('Isoline polygons'),
      isolineId: z
        .string()
        .optional()
        .describe(
          'Isoline ID for retrieving results later (if calculation is still processing)'
        ),
      pending: z.boolean().describe('Whether the calculation is still processing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.calculateIsoline({
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      type: ctx.input.type,
      mode: ctx.input.mode,
      range: ctx.input.range,
      avoid: ctx.input.avoid,
      traffic: ctx.input.traffic,
      routeType: ctx.input.routeType,
      maxSpeed: ctx.input.maxSpeed,
      units: ctx.input.units
    });

    let isolines = (data.features || []).map((f: any) => ({
      range: f.properties?.range,
      geometry: f.geometry
    }));

    let pending = data.properties?.id !== undefined && isolines.length === 0;

    return {
      output: {
        isolines,
        isolineId: data.properties?.id,
        pending
      },
      message: pending
        ? `Isoline calculation is processing. Use the isolineId to retrieve results later.`
        : `Generated **${isolines.length}** isoline polygon(s) for ${ctx.input.type === 'time' ? 'time' : 'distance'}-based reachability from (${ctx.input.lat}, ${ctx.input.lon}).`
    };
  })
  .build();
