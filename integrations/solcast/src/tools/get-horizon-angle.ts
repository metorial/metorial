import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHorizonAngle = SlateTool.create(spec, {
  name: 'Get Horizon Angle',
  key: 'get_horizon_angle',
  description: `Retrieve the terrain horizon angle profile for a given location. Returns elevation angles at specified azimuth intervals around the compass, useful for understanding terrain shading effects on solar installations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude in decimal degrees'),
      longitude: z.number().min(-180).max(180).describe('Longitude in decimal degrees'),
      azimuthIntervals: z
        .number()
        .min(1)
        .max(360)
        .describe(
          'Number of azimuth intervals to divide the 360° compass into (e.g. 36 gives one angle every 10°)'
        )
    })
  )
  .output(
    z.object({
      horizonAngles: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of horizon angle data points with azimuth and elevation angle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getHorizonAngle({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      azimuthIntervals: ctx.input.azimuthIntervals
    });

    let horizonAngles =
      result.horizon_angles ?? result.angles ?? (Array.isArray(result) ? result : [result]);

    return {
      output: {
        horizonAngles
      },
      message: `Retrieved horizon angle profile for (${ctx.input.latitude}, ${ctx.input.longitude}) with ${ctx.input.azimuthIntervals} azimuth intervals.`
    };
  })
  .build();
