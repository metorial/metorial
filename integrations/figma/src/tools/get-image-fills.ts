import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let getImageFills = SlateTool.create(spec, {
  name: 'Get Image Fills',
  key: 'get_image_fills',
  description: `Retrieve download URLs for all images used as fills in a Figma file. This returns URLs for user-uploaded images, not rendered node exports. URLs expire after 14 days.`,
  constraints: ['Image URLs expire after no more than 14 days'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file')
    })
  )
  .output(
    z.object({
      images: z
        .record(z.string(), z.string())
        .describe('Map of image references to download URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    let result = await client.getImageFills(ctx.input.fileKey);

    let images = result.meta?.images || {};
    let count = Object.keys(images).length;

    return {
      output: { images },
      message: `Found **${count}** image fill(s) in file`
    };
  })
  .build();
