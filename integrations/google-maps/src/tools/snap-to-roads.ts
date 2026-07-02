import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let snappedPointSchema = z.object({
  latitude: z.number().describe('Snapped latitude'),
  longitude: z.number().describe('Snapped longitude'),
  originalIndex: z
    .number()
    .optional()
    .describe(
      'Index of the corresponding original input point (only for non-interpolated points)'
    ),
  placeId: z.string().optional().describe('Place ID of the road segment')
});

export let snapToRoadsTool = SlateTool.create(spec, {
  name: 'Snap to Roads',
  key: 'snap_to_roads',
  description: `Snap GPS coordinates to the nearest road. Takes a series of GPS points and returns them snapped to the most likely roads, correcting for GPS drift and inaccuracy. Optionally interpolates additional points along the road for smoother paths.`,
  constraints: ['Maximum 100 points per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .array(
          z.object({
            latitude: z.number().describe('Latitude'),
            longitude: z.number().describe('Longitude')
          })
        )
        .describe('GPS coordinate points to snap to roads'),
      interpolate: z
        .boolean()
        .optional()
        .describe(
          'If true, returns additional interpolated points for smoother path along the road'
        )
    })
  )
  .output(
    z.object({
      snappedPoints: z.array(snappedPointSchema).describe('Road-snapped coordinate points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let response = await client.snapToRoads({
      path: ctx.input.path,
      interpolate: ctx.input.interpolate
    });

    let rawPoints = (response.snappedPoints as Record<string, unknown>[]) || [];

    let snappedPoints = rawPoints.map(p => {
      let location = p.location as { latitude: number; longitude: number };
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        originalIndex: p.originalIndex as number | undefined,
        placeId: p.placeId as string | undefined
      };
    });

    let message = `Snapped **${ctx.input.path.length}** GPS point(s) → **${snappedPoints.length}** road-aligned point(s)${ctx.input.interpolate ? ' (with interpolation)' : ''}.`;

    return {
      output: { snappedPoints },
      message
    };
  })
  .build();
