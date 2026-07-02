import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteImage = SlateTool.create(spec, {
  name: 'Delete Image',
  key: 'delete_image',
  description: `Delete an image from your NiftyImages account. This permanently removes the image and it will no longer be served.`,
  constraints: ['This action is irreversible. The image will be permanently deleted.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      imageId: z.string().describe('The ID of the image to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the image was deleted successfully.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteImage(ctx.input.imageId);

    return {
      output: { success: true },
      message: `Successfully deleted image **${ctx.input.imageId}**.`
    };
  })
  .build();
