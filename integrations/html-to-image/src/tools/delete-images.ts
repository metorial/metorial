import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteImages = SlateTool.create(spec, {
  name: 'Delete Images',
  key: 'delete_images',
  description: `Permanently delete one or more generated images. Removes the images from servers and clears CDN caching. This action **cannot be undone**.`,
  constraints: [
    'Deletion is permanent and cannot be undone.',
    'Deleted image URLs will no longer be accessible.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      imageIds: z.array(z.string()).min(1).describe('One or more image IDs to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of images deleted'),
      deletedImageIds: z.array(z.string()).describe('IDs of the deleted images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    if (ctx.input.imageIds.length === 1) {
      await client.deleteImage(ctx.input.imageIds[0]!);
    } else {
      await client.deleteImagesBatch(ctx.input.imageIds);
    }

    return {
      output: {
        deletedCount: ctx.input.imageIds.length,
        deletedImageIds: ctx.input.imageIds
      },
      message: `Permanently deleted **${ctx.input.imageIds.length}** image(s).`
    };
  })
  .build();
