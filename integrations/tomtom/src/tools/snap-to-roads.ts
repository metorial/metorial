import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let snapToRoads = SlateTool.create(spec, {
  name: 'Snap to Roads',
  key: 'snap_to_roads',
  description: `Match raw GPS points to the road network and reconstruct the driven route. Corrects GPS drift by snapping points to the nearest valid road. Returns matched positions along with road details such as speed limits and road names.`,
  constraints: ['Points should be ordered chronologically for best results'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      points: z
        .array(
          z.object({
            lat: z.number().describe('GPS latitude'),
            lon: z.number().describe('GPS longitude'),
            timestamp: z.string().optional().describe('Point timestamp in ISO 8601 format')
          })
        )
        .min(1)
        .describe('GPS points to snap to the road network')
    })
  )
  .output(
    z.object({
      snappedPoints: z
        .array(
          z.object({
            lat: z.number().describe('Snapped latitude on the road'),
            lon: z.number().describe('Snapped longitude on the road'),
            speedLimitKph: z.number().optional().describe('Speed limit in km/h'),
            roadName: z.string().optional().describe('Road name'),
            roadNumber: z.string().optional().describe('Road number')
          })
        )
        .describe('Points snapped to the road network')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.snapToRoads({
      points: ctx.input.points
    });

    let snappedPoints = (data.snappedPoints || data.points || []).map((p: any) => ({
      lat: p.latitude || p.lat,
      lon: p.longitude || p.lon,
      speedLimitKph: p.speedLimit || p.speedLimitKph,
      roadName: p.roadName || p.street,
      roadNumber: p.roadNumber
    }));

    return {
      output: { snappedPoints },
      message: `Snapped **${ctx.input.points.length}** GPS point(s) to the road network, returned **${snappedPoints.length}** matched point(s).`
    };
  })
  .build();
