import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

let coordinateSchema = z.object({
  lat: z.number().describe('Latitude'),
  lon: z.number().describe('Longitude')
});

export let calculateRouteMatrix = SlateTool.create(spec, {
  name: 'Calculate Route Matrix',
  key: 'calculate_route_matrix',
  description: `Generate a time-distance matrix between multiple origin and destination points. Useful for comparing travel times/distances between many location pairs at once — e.g. finding the closest warehouse to multiple customers.`,
  constraints: [
    'Maximum 1000 source-target combinations per request (sources × targets ≤ 1000).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sources: z.array(coordinateSchema).describe('Origin locations'),
      targets: z.array(coordinateSchema).describe('Destination locations'),
      mode: z
        .enum([
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
        ])
        .describe('Travel mode'),
      type: z
        .enum(['balanced', 'short', 'less_maneuvers'])
        .optional()
        .describe('Route optimization type'),
      traffic: z.enum(['free_flow', 'approximated']).optional().describe('Traffic model'),
      units: z.enum(['metric', 'imperial']).optional().describe('Measurement system')
    })
  )
  .output(
    z.object({
      matrix: z
        .array(
          z.array(
            z.object({
              distance: z.number().optional().describe('Distance in meters'),
              time: z.number().optional().describe('Time in seconds'),
              sourceIndex: z.number().describe('Source index'),
              targetIndex: z.number().describe('Target index')
            })
          )
        )
        .describe('Matrix of travel times and distances (sources × targets)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.calculateRouteMatrix({
      mode: ctx.input.mode,
      sources: ctx.input.sources.map(s => ({ location: [s.lon, s.lat] })),
      targets: ctx.input.targets.map(t => ({ location: [t.lon, t.lat] })),
      type: ctx.input.type,
      traffic: ctx.input.traffic,
      units: ctx.input.units
    });

    let matrix = (data.sources_to_targets || []).map((row: any[]) =>
      row.map((cell: any) => ({
        distance: cell.distance,
        time: cell.time,
        sourceIndex: cell.source_index,
        targetIndex: cell.target_index
      }))
    );

    let totalPairs = ctx.input.sources.length * ctx.input.targets.length;
    return {
      output: { matrix },
      message: `Computed route matrix with **${totalPairs}** source-target pair(s) (${ctx.input.sources.length} sources × ${ctx.input.targets.length} targets) using ${ctx.input.mode} mode.`
    };
  })
  .build();
