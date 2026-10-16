import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { imageDetailSchema, mapImage } from '../lib/schemas';
import { spec } from '../spec';

export let deleteImage = SlateTool.create(spec, {
  name: 'Delete Image',
  key: 'delete_image',
  description:
    'Delete an image record and its stored alt text from the image library. Returns the deleted image record.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      imageAssetId: z
        .string()
        .describe('Asset ID to delete; use list_images or search_images to find it')
    })
  )
  .output(imageDetailSchema)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).deleteImage(ctx.input.imageAssetId);
    return { output: mapImage(result), message: `Deleted image **${result.asset_id}**.` };
  })
  .build();
