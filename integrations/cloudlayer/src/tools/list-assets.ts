import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assetSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List generated assets (PDFs and images) stored in your Cloudlayer account. Returns asset metadata including download URLs. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of assets to return (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset (default 0)')
    })
  )
  .output(
    z.object({
      assets: z.array(assetSchema).describe('List of assets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAssets({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let assets = Array.isArray(result) ? result : (result.assets ?? result.data ?? []);

    let mappedAssets = assets.map((asset: Record<string, unknown>) => ({
      assetId: (asset.id ?? asset.assetId ?? '') as string,
      jobId: asset.jobId as string | undefined,
      ext: asset.ext as string | undefined,
      type: asset.type as string | undefined,
      size: asset.size as number | undefined,
      url: asset.url as string | undefined,
      timestamp: asset.timestamp as string | undefined
    }));

    return {
      output: { assets: mappedAssets },
      message: `Found **${mappedAssets.length}** assets.`
    };
  })
  .build();
