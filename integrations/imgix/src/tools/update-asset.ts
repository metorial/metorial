import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { assetOutput, mapAsset, originPath, sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description:
    'Update metadata for an existing asset in a source discovered by list_sources. Supplied categories and customFields replace the entire prior list/object; include every value to retain. Asset metadata history can remain.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      sourceId,
      originPath,
      name: z.string().optional(),
      description: z.string().optional(),
      categories: z.array(z.string()).optional(),
      customFields: z.record(z.string(), z.string()).optional()
    })
  )
  .output(assetOutput)
  .handleInvocation(async ctx => {
    const attributes = pickDefined({
      name: ctx.input.name,
      description: ctx.input.description,
      categories: ctx.input.categories,
      custom_fields: ctx.input.customFields
    });
    if (!Object.keys(attributes).length)
      throw createApiServiceError('Provide at least one metadata change.', { parent: {} });
    const asset = (
      await new ImgixClient(ctx.auth.token).updateAsset(
        ctx.input.sourceId,
        ctx.input.originPath,
        attributes
      )
    ).data;
    return {
      output: mapAsset(asset),
      message:
        'The existing asset returned updated metadata; omitted scalar attributes were not included in the patch.'
    };
  })
  .build();
