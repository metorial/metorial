import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSitemap = SlateTool.create(spec, {
  name: 'Delete Sitemap',
  key: 'delete_sitemap',
  description: `Permanently delete a sitemap and all its associated configuration. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      sitemapId: z.number().describe('The numeric ID of the sitemap to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.deleteSitemap(ctx.input.sitemapId);

    return {
      output: {
        success: true
      },
      message: `Deleted sitemap with ID \`${ctx.input.sitemapId}\`.`
    };
  })
  .build();
