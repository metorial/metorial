import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z.record(z.string(), z.any()).describe('PV Power Site summary');

export let listPvPowerSites = SlateTool.create(spec, {
  name: 'List PV Power Sites',
  key: 'list_pv_power_sites',
  description: `List all PV Power Sites configured in your Solcast account, or retrieve details for a specific site by its resource ID. PV Power Sites store the system specifications used for advanced PV power estimates.

This operation does not consume API request quota.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .optional()
        .describe(
          'If provided, retrieve details for this specific PV Power Site instead of listing all sites'
        ),
      query: z.string().optional().describe('Search query to filter sites'),
      showAll: z.boolean().optional().describe('Show all sites including inactive ones')
    })
  )
  .output(
    z.object({
      sites: z.array(siteSchema).optional().describe('List of PV Power Sites (when listing)'),
      site: siteSchema
        .optional()
        .describe('Single PV Power Site details (when resourceId is provided)'),
      totalCount: z.number().optional().describe('Total number of sites found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.resourceId) {
      let site = await client.getPvPowerSite(ctx.input.resourceId);
      return {
        output: { site },
        message: `Retrieved PV Power Site \`${ctx.input.resourceId}\`.`
      };
    }

    let result = await client.listPvPowerSites({
      query: ctx.input.query,
      showAll: ctx.input.showAll
    });

    let sites = result.sites ?? result.resources ?? (Array.isArray(result) ? result : []);

    return {
      output: {
        sites,
        totalCount: sites.length
      },
      message: `Found **${sites.length}** PV Power Sites.`
    };
  })
  .build();
