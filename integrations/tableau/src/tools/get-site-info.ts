import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSiteInfo = SlateTool.create(spec, {
  name: 'Get Site Info',
  key: 'get_site_info',
  description: `Retrieve information about the current Tableau site, including name, URL, storage usage, and configuration settings.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      siteId: z.string(),
      name: z.string().optional(),
      contentUrl: z.string().optional(),
      adminMode: z.string().optional(),
      state: z.string().optional(),
      storageQuota: z.number().optional(),
      numCreators: z.number().optional(),
      numExplorers: z.number().optional(),
      numViewers: z.number().optional(),
      revisionHistoryEnabled: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let site = await client.getSiteInfo();

    return {
      output: {
        siteId: site.id,
        name: site.name,
        contentUrl: site.contentUrl,
        adminMode: site.adminMode,
        state: site.state,
        storageQuota: site.storageQuota != null ? Number(site.storageQuota) : undefined,
        numCreators: site.numCreators != null ? Number(site.numCreators) : undefined,
        numExplorers: site.numExplorers != null ? Number(site.numExplorers) : undefined,
        numViewers: site.numViewers != null ? Number(site.numViewers) : undefined,
        revisionHistoryEnabled: site.revisionHistoryEnabled
      },
      message: `Site **${site.name}** (state: ${site.state || 'active'}).`
    };
  })
  .build();
