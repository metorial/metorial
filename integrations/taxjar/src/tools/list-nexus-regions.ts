import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let listNexusRegions = SlateTool.create(spec, {
  name: 'List Nexus Regions',
  key: 'list_nexus_regions',
  description: `List nexus locations configured in your TaxJar account. Tax calculations use these settings when nexus addresses are not supplied per request.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      regions: z
        .array(
          z.object({
            countryCode: z.string().describe('Two-letter ISO country code'),
            country: z.string().describe('Full country name'),
            regionCode: z.string().describe('Region/state code'),
            region: z.string().describe('Full region/state name')
          })
        )
        .describe('Configured nexus regions')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let regions = await client.listNexusRegions();

    return {
      output: {
        regions: regions.map(r => ({
          countryCode: r.country_code,
          country: r.country,
          regionCode: r.region_code,
          region: r.region
        }))
      },
      message: `Found **${regions.length}** nexus region(s): ${regions.map(r => r.region_code).join(', ') || 'none'}.`
    };
  })
  .build();
