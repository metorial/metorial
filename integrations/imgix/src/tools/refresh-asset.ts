import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

export let refreshAsset = SlateTool.create(spec, {
  name: 'Refresh Asset',
  key: 'refresh_asset',
  description: `Refresh an asset from its origin storage, forcing Imgix to re-fetch and reprocess the latest version. If the asset's ETag has changed, the cache is automatically purged. Use this when the origin file has been updated and you want Imgix to pick up the changes.`,
  constraints: ['Rate limit: 10 requests per minute.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('ID of the source containing the asset'),
      originPath: z
        .string()
        .describe('Origin path of the asset to refresh (e.g., "images/photo.jpg")')
    })
  )
  .output(
    z.object({
      originPath: z.string().describe('Origin path of the refreshed asset'),
      refreshed: z.boolean().describe('Whether the refresh request was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);
    await client.refreshAsset(ctx.input.sourceId, ctx.input.originPath);

    return {
      output: {
        originPath: ctx.input.originPath,
        refreshed: true
      },
      message: `Refreshed asset **${ctx.input.originPath}** from origin.`
    };
  })
  .build();
