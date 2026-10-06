import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { resourceSchema } from '../lib/types';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset Details',
  key: 'get_asset',
  description: `Retrieve full details of a single Cloudinary asset by its public ID or asset ID. Returns all metadata, tags, context, dimensions, and delivery URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicId: z
        .string()
        .optional()
        .describe('Public ID of the asset to retrieve. Provide either publicId or assetId.'),
      assetId: z
        .string()
        .optional()
        .describe('Immutable asset ID to retrieve. Provide either publicId or assetId.'),
      resourceType: z
        .enum(['image', 'video', 'raw'])
        .default('image')
        .describe('Resource type of the asset. Only needed when using publicId.'),
      type: z
        .enum(['upload', 'fetch', 'private', 'authenticated'])
        .default('upload')
        .describe('Delivery type of the asset. Only needed when using publicId.')
    })
  )
  .output(resourceSchema)
  .handleInvocation(async ctx => {
    if ((ctx.input.assetId !== undefined) === (ctx.input.publicId !== undefined))
      fail('Provide exactly one assetId or publicId.');
    const client = createClient(ctx);
    const result =
      ctx.input.assetId !== undefined
        ? await client.getResourceByAssetId(ctx.input.assetId)
        : await client.getResource(
            ctx.input.publicId!,
            ctx.input.resourceType,
            ctx.input.type
          );
    return { output: result, message: `Retrieved asset **${result.publicId}**.` };
  })
  .build();
