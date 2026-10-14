import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let snapToRoads = SlateTool.create(spec, {
  name: 'Snap to Roads',
  key: 'snap_to_roads',
  description: `Match raw GPS points to the road network and reconstruct the driven route. Corrects GPS drift by snapping points to the nearest valid road. Returns matched positions along with road details such as speed limits and road names.`,
  constraints: [
    'Points should be ordered chronologically for best results',
    'Provide 2-5,000 points; road distance between consecutive points must not exceed 6,000 meters'
  ],
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
            inputIndex: z.number().optional().describe('Index of the original GPS point'),
            speedLimitKph: z.number().optional().describe('Speed limit in km/h'),
            snapResult: z.string().optional().describe('Provider matching status'),
            roadName: z.string().optional().describe('Road name'),
            roadNumber: z.string().optional().describe('Road number')
          })
        )
        .describe('Points successfully snapped to the road network'),
      unmatchedPoints: z
        .array(
          z.object({
            inputIndex: z.number().describe('Index of the original GPS point'),
            snapResult: z.string().optional().describe('Provider matching status')
          })
        )
        .optional()
        .describe('Points that could not be snapped to the road network')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.snapToRoads({
      points: ctx.input.points
    });

    let isProjectedResponse = data.projectedPoints !== undefined;
    let mappedPoints = (data.projectedPoints ?? data.snappedPoints ?? data.points ?? []).map(
      (p: any, inputIndex: number) => {
        let road = data.route?.[p.properties?.routeIndex]?.properties;
        let lat = isProjectedResponse
          ? p.geometry?.coordinates?.[1]
          : (p.geometry?.coordinates?.[1] ?? p.latitude ?? p.lat);
        let lon = isProjectedResponse
          ? p.geometry?.coordinates?.[0]
          : (p.geometry?.coordinates?.[0] ?? p.longitude ?? p.lon);
        let snapResult = p.properties?.snapResult ?? undefined;
        let matched =
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          (isProjectedResponse
            ? snapResult === 'Matched' &&
              Number.isInteger(p.properties?.routeIndex) &&
              p.properties.routeIndex >= 0
            : snapResult === undefined || snapResult === 'Matched');
        return {
          matched,
          point: {
            lat,
            lon,
            inputIndex,
            speedLimitKph:
              road?.speedLimits?.value ?? p.speedLimit ?? p.speedLimitKph ?? undefined,
            snapResult,
            roadName: road?.address?.roadName ?? p.roadName ?? p.street ?? undefined,
            roadNumber: road?.address?.roadNumbers?.[0] ?? p.roadNumber ?? undefined
          }
        };
      }
    );
    let snappedPoints = mappedPoints.filter((p: any) => p.matched).map((p: any) => p.point);
    let unmatchedPoints = mappedPoints
      .filter((p: any) => !p.matched)
      .map((p: any) => ({ inputIndex: p.point.inputIndex, snapResult: p.point.snapResult }));

    return {
      output: { snappedPoints, unmatchedPoints },
      message: `Returned **${snappedPoints.length}** matched point(s) and **${unmatchedPoints.length}** unmatched point(s).`
    };
  })
  .build();
