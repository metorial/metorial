import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { imageDetailSchema, mapImage } from '../lib/schemas';
import { spec } from '../spec';

export let updateImage = SlateTool.create(spec, {
  name: 'Update Image',
  key: 'update_image',
  description:
    'Edit stored alt text, rename an image asset ID, or replace its custom metadata. The source image URL cannot be changed.',
  instructions: [
    'Set overwrite to true to replace existing alt text for a language. With overwrite false, only missing language entries are updated.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      imageAssetId: z
        .string()
        .describe('Existing asset ID; use list_images or search_images to find it'),
      newAssetId: z.string().optional().describe('New unique asset ID'),
      altText: z.string().max(1024).optional().describe('Replacement alt text'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to store'),
      lang: z
        .string()
        .optional()
        .describe('Language code or comma-separated language codes for the update'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Replace existing alt text; default false preserves existing languages')
    })
  )
  .output(imageDetailSchema)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).updateImage(ctx.input.imageAssetId, ctx.input);
    return { output: mapImage(result), message: `Updated image **${result.asset_id}**.` };
  })
  .build();
