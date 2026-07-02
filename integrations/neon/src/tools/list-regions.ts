import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let regionSchema = z.object({
  regionId: z.string().describe('Region ID used by project and endpoint APIs'),
  name: z.string().describe('Human-readable region name'),
  default: z.boolean().describe('Whether this region is the default for new projects'),
  geoLat: z.string().describe('Approximate region latitude'),
  geoLong: z.string().describe('Approximate region longitude')
});

export let listRegions = SlateTool.create(spec, {
  name: 'List Regions',
  key: 'list_regions',
  description: `Lists supported Neon regions. Use this before creating projects to choose a valid region ID. Pass orgId to see the regions available to a specific Neon organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID to return only regions available to that organization')
    })
  )
  .output(
    z.object({
      regions: z.array(regionSchema).describe('Supported Neon regions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.listRegions({ orgId: ctx.input.orgId });

    let regions = (result.regions || []).map((region: any) => ({
      regionId: region.region_id,
      name: region.name,
      default: region.default,
      geoLat: region.geo_lat,
      geoLong: region.geo_long
    }));

    return {
      output: { regions },
      message: `Found **${regions.length}** supported Neon region(s).`
    };
  })
  .build();
