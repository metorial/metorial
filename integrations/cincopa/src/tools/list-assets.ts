import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List and search assets in your Cincopa account. Filter by text search, reference ID, or asset type (video, image, audio). Supports pagination for large libraries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Text search query to filter assets'),
      referenceId: z
        .string()
        .optional()
        .describe('Filter by reference ID assigned to the asset'),
      assetType: z
        .enum(['video', 'image', 'audio', 'other'])
        .optional()
        .describe('Filter by asset type. If not specified, all types are returned.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of assets per page')
    })
  )
  .output(
    z.object({
      assets: z.array(z.record(z.string(), z.any())).describe('List of asset objects'),
      totalCount: z.number().optional().describe('Total number of matching assets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let data = await client.listAssets({
      search: ctx.input.search,
      referenceId: ctx.input.referenceId,
      type: ctx.input.assetType,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let assets = data?.items || data?.assets || [];
    let totalCount = data?.total_count ?? data?.count ?? assets.length;

    return {
      output: {
        assets,
        totalCount
      },
      message: `Found **${totalCount}** assets${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}${ctx.input.assetType ? ` of type "${ctx.input.assetType}"` : ''}.`
    };
  })
  .build();
