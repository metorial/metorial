import { SlateTool } from 'slates';
import { z } from 'zod';
import { imageUrls, validateInteger } from '../lib/client';
import { spec } from '../spec';

export let downloadImage = SlateTool.create(spec, {
  name: 'Download Image',
  key: 'download_image',
  description:
    'Prepare a previously generated image as a downloadable PNG, JPG, WebP, or PDF. Optionally resize the image. Uses the existing image without creating another image or consuming render credits.',
  instructions: [
    'Use an image ID from generate_image, generate_image_from_template, or list_images. Hosted files remain available while the account is active and the image has not been deleted.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      imageId: z.string().describe('ID of an existing generated image'),
      format: z
        .enum(['png', 'jpg', 'webp', 'pdf'])
        .optional()
        .describe('Download format; defaults to PNG'),
      width: z.number().optional().describe('Optional output width in pixels (1-5000)'),
      height: z.number().optional().describe('Optional output height in pixels (1-5000)'),
      dpi: z.number().optional().describe('DPI metadata from 30 to 600')
    })
  )
  .output(
    z.object({
      imageId: z.string(),
      url: z.string().describe('Provider download URL'),
      format: z.enum(['png', 'jpg', 'webp', 'pdf'])
    })
  )
  .handleInvocation(async ctx => {
    let urls = imageUrls(ctx.input.imageId);
    let format = ctx.input.format ?? 'png';
    validateInteger(ctx.input.width, 'width', 1, 5000);
    validateInteger(ctx.input.height, 'height', 1, 5000);
    validateInteger(ctx.input.dpi, 'dpi', 30, 600);
    let url = new URL(urls[`${format}Url`]);
    for (let key of ['width', 'height', 'dpi'] as const) {
      if (ctx.input[key] !== undefined) url.searchParams.set(key, String(ctx.input[key]));
    }
    await ctx.addAttachment({
      type: 'url',
      url,
      mimeType:
        format === 'pdf' ? 'application/pdf' : `image/${format === 'jpg' ? 'jpeg' : format}`,
      filename: `${ctx.input.imageId}.${format}`
    });
    return {
      output: { imageId: ctx.input.imageId, url: url.href, format },
      message:
        'Prepared the existing image for download. Availability depends on the image still being hosted.'
    };
  })
  .build();
