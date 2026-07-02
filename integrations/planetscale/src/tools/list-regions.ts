import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRegions = SlateTool.create(spec, {
  name: 'List Regions',
  key: 'list_regions',
  description: `List PlanetScale regions available to the configured organization. Use this before creating databases or branches that need an explicit region.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      regions: z.array(
        z.object({
          regionId: z.string(),
          slug: z.string(),
          displayName: z.string().optional(),
          provider: z.string().optional(),
          location: z.string().optional(),
          enabled: z.boolean().optional(),
          currentDefault: z.boolean().optional(),
          mysqlSupported: z.boolean().optional(),
          postgresqlSupported: z.boolean().optional(),
          publicIpAddresses: z.array(z.string()).optional()
        })
      ),
      currentPage: z.number(),
      nextPage: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let result = await client.listRegions({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let regions = result.data.map((region: any) => ({
      regionId: region.id,
      slug: region.slug,
      displayName: region.display_name,
      provider: region.provider,
      location: region.location,
      enabled: region.enabled,
      currentDefault: region.current_default,
      mysqlSupported: region.mysql_supported,
      postgresqlSupported: region.postgresql_supported,
      publicIpAddresses: region.public_ip_addresses
    }));

    return {
      output: {
        regions,
        currentPage: result.currentPage,
        nextPage: result.nextPage
      },
      message: `Found **${regions.length}** PlanetScale region(s).`
    };
  });
