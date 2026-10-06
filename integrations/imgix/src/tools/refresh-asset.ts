import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { assetOutput, mapAsset, originPath, sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const refreshAsset = SlateTool.create(spec, {
  name: 'Refresh Asset',
  key: 'refresh_asset',
  description:
    'Request origin re-fetch, reprocessing when the ETag changes, and cache purge for a path in a source discovered by list_sources. Can also add a previously uncrawled origin asset. This does not erase origin files or history.',
  constraints: [
    'Requires Asset Manager Edit and Purge permissions; the documented refresh rate is 10 per minute.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ sourceId, originPath }))
  .output(
    z.object({
      originPath: z.string(),
      refreshed: z
        .boolean()
        .describe(
          'The provider returned a successful refresh receipt; this does not prove every cached derivative changed.'
        ),
      asset: assetOutput
    })
  )
  .handleInvocation(async ctx => {
    const asset = (
      await new ImgixClient(ctx.auth.token).refreshAsset(
        ctx.input.sourceId,
        ctx.input.originPath
      )
    ).data;
    return {
      output: {
        originPath: asset.attributes.origin_path,
        refreshed: true,
        asset: mapAsset(asset)
      },
      message:
        'The provider accepted refresh and returned asset metadata. Origin files and retained history remain; cached clients may need a separate refresh.'
    };
  })
  .build();
