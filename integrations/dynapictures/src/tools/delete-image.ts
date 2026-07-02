import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteImage = SlateTool.create(spec, {
  name: 'Delete Image',
  key: 'delete_image',
  description: `Delete a previously generated image from DynaPictures. Provide the image path (the subpath portion from the image URL after the domain). This permanently removes the generated image.`,
  instructions: [
    'The imagePath is the path portion after "https://api.dynapictures.com/images/" in the generated image URL.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      imagePath: z
        .string()
        .describe('Path of the generated image to delete (subpath from the image URL)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the image was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteImage(ctx.input.imagePath);

    return {
      output: { deleted: true },
      message: `Successfully deleted image at path **${ctx.input.imagePath}**.`
    };
  })
  .build();
