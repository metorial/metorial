import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z.object({
  apiSiteParameter: z
    .string()
    .describe('Site identifier to use in the "site" config parameter'),
  name: z.string().describe('Human-readable name of the site'),
  siteUrl: z.string().describe('URL of the site'),
  audience: z.string().optional().describe("Description of the site's target audience"),
  iconUrl: z.string().optional().describe("URL to the site's icon"),
  siteType: z.string().optional().describe('Type of site (main_site, meta_site)'),
  siteState: z.string().optional().describe('State of the site (normal, linked_meta, etc.)')
});

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `List all sites in the Stack Exchange network. Returns site identifiers, names, URLs, and audience descriptions. Use the "apiSiteParameter" value from results as the site config parameter.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (1-indexed)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      sites: z.array(siteSchema).describe('List of Stack Exchange sites'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let result = await client.getSites({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let sites = result.items.map((s: any) => ({
      apiSiteParameter: s.api_site_parameter,
      name: s.name,
      siteUrl: s.site_url,
      audience: s.audience,
      iconUrl: s.icon_url,
      siteType: s.site_type,
      siteState: s.site_state
    }));

    return {
      output: { sites, hasMore: result.hasMore },
      message: `Found **${sites.length}** Stack Exchange site(s).`
    };
  })
  .build();
