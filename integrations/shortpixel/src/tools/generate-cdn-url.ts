import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShortPixelClient } from '../lib/client';
import { spec } from '../spec';

export let generateCdnUrl = SlateTool.create(spec, {
  name: 'Generate CDN URL',
  key: 'generate_cdn_url',
  description: `Generate a ShortPixel CDN URL that will serve an optimized, resized, and/or converted version of an image on-the-fly.
The generated URL can be used directly in HTML, CSS, or any context where an image URL is needed. Images are processed and cached by ShortPixel's CDN automatically.`,
  instructions: [
    'The original image URL must be publicly accessible.',
    'The domain of the original image should be associated with your API key for free CDN delivery.',
    'If using a different CDN, point to no-cdn.shortpixel.ai and image optimization credits will be used.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      originalUrl: z
        .string()
        .describe('The full URL of the original image to optimize via CDN'),
      width: z.number().optional().describe('Desired width in pixels'),
      height: z.number().optional().describe('Desired height in pixels'),
      crop: z
        .enum(['smart', 'top', 'bottom', 'left', 'right', 'center'])
        .optional()
        .describe('Crop style when resizing. "smart" uses AI-based cropping'),
      quality: z
        .enum(['lossy', 'glossy', 'lossless', 'lqip'])
        .optional()
        .describe('Compression quality. "lqip" generates a low-quality image placeholder'),
      format: z
        .enum(['webp', 'avif', 'auto'])
        .optional()
        .describe('Output format. "auto" selects the best format based on browser support')
    })
  )
  .output(
    z.object({
      cdnUrl: z.string().describe('The generated ShortPixel CDN URL for the optimized image'),
      originalUrl: z.string().describe('The original image URL that was provided'),
      parameters: z.string().describe('The CDN parameter string used in the URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShortPixelClient({ token: ctx.auth.token });

    let cdnUrl = client.buildCdnUrl({
      originalUrl: ctx.input.originalUrl,
      width: ctx.input.width,
      height: ctx.input.height,
      crop: ctx.input.crop,
      quality: ctx.input.quality,
      format: ctx.input.format
    });

    let paramParts: string[] = [];
    if (ctx.input.quality) paramParts.push(`q_${ctx.input.quality}`);
    if (ctx.input.format) paramParts.push(`to_${ctx.input.format}`);
    if (ctx.input.width) paramParts.push(`w_${ctx.input.width}`);
    if (ctx.input.height) paramParts.push(`h_${ctx.input.height}`);
    if (ctx.input.crop) paramParts.push(`c_${ctx.input.crop}`);
    let parameters = paramParts.length > 0 ? paramParts.join(',') : 'q_lossy';

    return {
      output: {
        cdnUrl,
        originalUrl: ctx.input.originalUrl,
        parameters
      },
      message: `Generated CDN URL:\n\`${cdnUrl}\``
    };
  })
  .build();
