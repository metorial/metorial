import { SlateTool } from 'slates';
import { z } from 'zod';
import { StockClient } from '../lib/stock';
import { spec } from '../spec';

export let getStockAsset = SlateTool.create(spec, {
  key: 'get_stock_asset',
  name: 'Get Stock Asset',
  description:
    'Retrieve Adobe Stock asset metadata by content ID. Use search_stock to discover content IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ contentId: z.string().describe('Content ID from search_stock') }))
  .output(
    z.object({
      data: z.any().describe('Adobe Stock metadata response, including matching files')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new StockClient(ctx.auth).getContentInfo(ctx.input.contentId);
    return { output: { data }, message: 'Retrieved Adobe Stock asset metadata.' };
  })
  .build();
