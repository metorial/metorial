import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { originPath, sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const addAsset = SlateTool.create(spec, {
  name: 'Add Asset',
  key: 'add_asset',
  description:
    'Queue an existing origin path for Asset Manager indexing in a source discovered by list_sources. The path must already exist and be readable. A 202 receipt proves queued acceptance, not readiness; inspect get_asset later. Indexing and history are retained.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ sourceId, originPath }))
  .output(
    z.object({
      sourceId: z.string(),
      originPath: z.string(),
      accepted: z.boolean(),
      status: z.literal('queued')
    })
  )
  .handleInvocation(async ctx => {
    await new ImgixClient(ctx.auth.token).addAsset(ctx.input.sourceId, ctx.input.originPath);
    return {
      output: {
        sourceId: ctx.input.sourceId,
        originPath: ctx.input.originPath,
        accepted: true,
        status: 'queued'
      },
      message:
        'Asset indexing was queued. Read get_asset later to determine whether it became available; no origin file was uploaded.'
    };
  })
  .build();
