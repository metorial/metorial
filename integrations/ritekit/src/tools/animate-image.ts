import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let animateImage = SlateTool.create(spec, {
  name: 'Animate Image',
  key: 'animate_image',
  description: `Converts a static image into an animated GIF with a visual effect like glint.
Provide an image URL and choose an animation type to create an eye-catching animated version.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('URL of the static image to animate'),
      animationType: z
        .enum(['glint', 'rays', 'circle'])
        .describe('Type of animation effect to apply')
    })
  )
  .output(
    z.object({
      animatedImageUrl: z.string().describe('URL of the animated GIF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.animateImage(ctx.input.imageUrl, ctx.input.animationType);

    return {
      output: {
        animatedImageUrl: result.url
      },
      message: `Created animated GIF with **${ctx.input.animationType}** effect: ${result.url}`
    };
  })
  .build();
