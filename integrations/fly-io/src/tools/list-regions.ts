import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listRegions = SlateTool.create(spec, {
  name: 'List Regions',
  key: 'list_regions',
  description:
    'List Fly.io platform regions and the nearest region for the current API caller. Use this before creating Machines or volumes when a region code is needed.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      nearest: z.string().describe('Nearest Fly.io region code for the API caller'),
      regions: z
        .array(
          z.object({
            code: z.string().describe('Region code'),
            name: z.string().describe('Region display name'),
            geoRegion: z.string().describe('Geographic grouping'),
            latitude: z.number().describe('Latitude'),
            longitude: z.number().describe('Longitude'),
            gatewayAvailable: z.boolean().describe('Whether gateway access is available'),
            requiresPaidPlan: z.boolean().describe('Whether the region requires a paid plan'),
            deprecated: z.boolean().describe('Whether the region is deprecated')
          })
        )
        .describe('Fly.io regions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listRegions();

    return {
      output: result,
      message: `Found **${result.regions.length}** Fly.io region(s). Nearest: **${result.nearest || 'unknown'}**.`
    };
  })
  .build();
