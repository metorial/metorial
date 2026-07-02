import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getElevationTool = SlateTool.create(spec, {
  name: 'Get Elevation',
  key: 'get_elevation',
  description: `Retrieve the elevation for a specific coordinate point. Returns elevation in meters relative to sea level.

Useful for terrain analysis, flood risk assessment, and geographic data enrichment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the location (-90 to 90)'),
      longitude: z.number().describe('Longitude of the location (-180 to 180)')
    })
  )
  .output(
    z.object({
      elevation: z.number().describe('Elevation in meters relative to sea level'),
      meta: z
        .record(z.string(), z.any())
        .describe('Request metadata including source and coordinates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getElevation({
      lat: ctx.input.latitude,
      lng: ctx.input.longitude
    });

    let elevation = result.data?.elevation ?? 0;

    return {
      output: {
        elevation,
        meta: result.meta ?? {}
      },
      message: `Elevation at coordinates (${ctx.input.latitude}, ${ctx.input.longitude}): **${elevation} meters** above sea level.`
    };
  })
  .build();
