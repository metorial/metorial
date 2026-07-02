import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `Lists media assets from the Agility CMS asset library. Supports search, pagination, and gallery filtering. Requires OAuth authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter assets by name'),
      pageSize: z.number().optional().describe('Number of assets to return per page'),
      recordOffset: z.number().optional().describe('Offset for pagination'),
      galleryId: z.number().optional().describe('Filter assets by gallery ID')
    })
  )
  .output(
    z.object({
      assets: z.array(z.record(z.string(), z.any())).describe('Array of asset objects'),
      totalCount: z.number().optional().describe('Total number of matching assets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region
    });

    let result = await client.listAssets({
      search: ctx.input.search,
      pageSize: ctx.input.pageSize,
      recordOffset: ctx.input.recordOffset,
      galleryID: ctx.input.galleryId
    });

    let assets = Array.isArray(result) ? result : result?.assetMedias || result?.assets || [];
    let totalCount = result?.totalCount ?? assets.length;

    return {
      output: { assets, totalCount },
      message: `Retrieved **${assets.length}** asset(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}`
    };
  })
  .build();
