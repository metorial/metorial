import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { deliverImageDownload } from '../lib/images';
import { spec } from '../spec';

export let animateImage = SlateTool.create(spec, {
  name: 'Animate Image',
  key: 'animate_image',
  description: `Converts a static image into an animated GIF with a glint visual effect.
Provide an image URL and choose glint, the currently documented animation effect.`,
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
        .describe('Animation effect; current provider documentation supports glint')
    })
  )
  .output(
    z.object({
      downloadError: z
        .string()
        .optional()
        .describe('Reason the downloadable copy could not be prepared'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
      animatedImageUrl: z.string().describe('URL of the animated GIF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.animateImage(ctx.input.imageUrl, ctx.input.animationType);

    let downloadError = await deliverImageDownload(result.url, content =>
      ctx.addAttachment({ type: 'content', content })
    );

    return {
      output: {
        raw: { ...result },
        downloadError,
        animatedImageUrl: result.url
      },
      message: `${downloadError ? `${downloadError} ` : ''}Created animated GIF: ${result.url}`
    };
  })
  .build();
