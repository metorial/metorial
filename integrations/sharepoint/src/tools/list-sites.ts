import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';
import { oneOfRequiredError } from './errors';

let siteSchema = z.object({
  siteId: z.string().describe('Unique site ID'),
  siteName: z.string().describe('Display name of the site'),
  siteDescription: z.string().nullable().describe('Site description'),
  webUrl: z.string().describe('Full URL of the site'),
  createdDateTime: z.string().optional().describe('When the site was created'),
  lastModifiedDateTime: z.string().optional().describe('When the site was last modified')
});

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `Search for SharePoint sites by keyword, or list subsites of a given site. Returns a list of matching sites with their IDs and URLs.`,
  instructions: [
    'Provide a **searchQuery** to find sites across the tenant.',
    'Provide a **parentSiteId** to list subsites of a specific site.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      searchQuery: z
        .string()
        .optional()
        .describe('Keyword to search for sites across the tenant'),
      parentSiteId: z.string().optional().describe('Site ID to list subsites of')
    })
  )
  .output(
    z.object({
      sites: z.array(siteSchema).describe('List of matching sites'),
      totalCount: z.number().describe('Number of sites returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let result: any;

    if (ctx.input.parentSiteId) {
      result = await client.listSubsites(ctx.input.parentSiteId);
    } else if (ctx.input.searchQuery) {
      result = await client.searchSites(ctx.input.searchQuery);
    } else {
      throw oneOfRequiredError('One of searchQuery or parentSiteId must be provided.', [
        'searchQuery',
        'parentSiteId'
      ]);
    }

    let sites = (result.value || []).map((site: any) => ({
      siteId: site.id,
      siteName: site.displayName || site.name,
      siteDescription: site.description || null,
      webUrl: site.webUrl,
      createdDateTime: site.createdDateTime,
      lastModifiedDateTime: site.lastModifiedDateTime
    }));

    return {
      output: {
        sites,
        totalCount: sites.length
      },
      message: `Found **${sites.length}** site(s)${ctx.input.searchQuery ? ` matching "${ctx.input.searchQuery}"` : ''}.`
    };
  })
  .build();
