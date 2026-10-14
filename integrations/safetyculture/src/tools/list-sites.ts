import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description:
    'List leaf sites in the organization directory. Use the returned site IDs when starting inspections, creating actions or issues, assigning assets, or scheduling inspections.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum directory entries per page; defaults to 100.'),
      pageToken: z.string().optional().describe('Token returned by the previous page.')
    })
  )
  .output(
    z.object({
      sites: z.array(
        z.object({
          siteId: z.string(),
          name: z.string().optional(),
          rawSite: z.any()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listSites(ctx.input);
    let sites = result.sites.map((site: any) => ({
      siteId: site.folder_id || site.id,
      name: site.name ?? undefined,
      rawSite: site
    }));
    return {
      output: { sites, nextPageToken: result.nextPageToken },
      message: `Found ${sites.length} site directory entries.${result.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
