import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { assetOutput, mapAsset, originPath, sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description:
    'Read exact asset metadata in a source discovered by list_sources. Native tag scores, nullable metadata, warning levels, and source/path identity remain explicit.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ sourceId, originPath }))
  .output(assetOutput)
  .handleInvocation(async ctx => {
    const asset = (
      await new ImgixClient(ctx.auth.token).getAsset(ctx.input.sourceId, ctx.input.originPath)
    ).data;
    return { output: mapAsset(asset), message: 'Retrieved the existing asset metadata.' };
  })
  .build();
