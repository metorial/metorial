import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let buyImage = SlateTool.create(spec, {
  name: 'Buy Image',
  key: 'buy_image',
  description: `Purchase a stock image by its ID and receive direct download URLs for preview, full, upscale, and upscale UHD versions. Credits are consumed on first purchase only — subsequent requests for the same image return URLs without additional cost.`,
  constraints: ['Requires sufficient credits in your account.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageId: z.string().describe('ID of the image to purchase')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('Image ID'),
      previewUrl: z.string().describe('Direct URL to download preview image'),
      fullUrl: z.string().describe('Direct URL to download full image'),
      upscaleUrl: z.string().optional().describe('Direct URL to download upscale image'),
      upscaleUhdUrl: z.string().describe('Direct URL to download upscale UHD image'),
      downloadedAt: z.string().describe('Download timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let image = await client.buyImage(ctx.input.imageId);

    return {
      output: image,
      message: `Image \`${image.imageId}\` purchased successfully. Download URLs are available for preview, full, and upscale versions.`
    };
  })
  .build();
