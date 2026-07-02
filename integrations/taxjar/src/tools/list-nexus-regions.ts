import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNexusRegions = SlateTool.create(spec, {
  name: 'List Nexus Regions',
  key: 'list_nexus_regions',
  description: `List all nexus locations configured in your TaxJar account. Nexus regions are locations where your business has tax obligations. These are used automatically in tax calculations when nexus addresses are not provided per-request.`,
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
        .describe('Nexus regions where you have tax obligations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

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
