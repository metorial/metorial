import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z.record(z.string(), z.any()).describe('PV Power Site summary');

export let listPvPowerSites = SlateTool.create(spec, {
  name: 'List PV Power Sites',
  key: 'list_pv_power_sites',
  description: `List PV Power Sites configured in your Solcast account, or retrieve details for a specific site by its resource ID. PV Power Sites store the system specifications used for advanced PV power estimates.

This operation does not consume API request quota.`,
  instructions: [
    'Use skip and take to page through sites. Advance skip by the number of returned sites until offset plus the returned count reaches totalCount, or an empty page is returned.',
    'Pagination applies to listing only; resourceId retrieves a single site.'
  ],
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
      skip: z
        .number()
        .optional()
        .describe(
          'Number of matching sites to skip; a nonnegative whole number. Omit for the provider default'
        ),
      take: z
        .number()
        .optional()
        .describe(
          'Maximum sites to return in this page; a positive whole number. Omit for the provider default'
        ),
      query: z.string().optional().describe('Search query to filter site name or resource ID'),
      entitlement: z
        .enum(['advanced', 'premium'])
        .optional()
        .describe('Filter by site entitlement'),
      start: z
        .string()
        .optional()
        .describe('Filter to sites created on or after this ISO 8601 datetime'),
      end: z
        .string()
        .optional()
        .describe('Filter to sites created before this ISO 8601 datetime'),
      showAll: z
        .boolean()
        .optional()
        .describe('Show all system sites; requires Solcast administrator privileges')
    })
  )
  .output(
    z.object({
      sites: z.array(siteSchema).optional().describe('List of PV Power Sites (when listing)'),
      site: siteSchema
        .optional()
        .describe('Single PV Power Site details (when resourceId is provided)'),
      totalCount: z.number().optional().describe('Total number of sites found'),
      offset: z.number().optional().describe('Provider result offset'),
      meta: z.record(z.string(), z.any()).optional().describe('Provider query metadata')
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
      skip: ctx.input.skip,
      take: ctx.input.take,
      query: ctx.input.query,
      entitlement: ctx.input.entitlement,
      start: ctx.input.start,
      end: ctx.input.end,
      showAll: ctx.input.showAll
    });

    let sites =
      result.results ??
      result.sites ??
      result.resources ??
      (Array.isArray(result) ? result : []);

    return {
      output: {
        sites,
        totalCount: result.total ?? sites.length,
        offset: result.offset,
        meta: result.meta ?? undefined
      },
      message: `Found **${sites.length}** PV Power Sites.`
    };
  })
  .build();
