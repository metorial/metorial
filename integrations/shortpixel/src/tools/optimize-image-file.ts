import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ShortPixelClient } from '../lib/client';
import { spec } from '../spec';

export let optimizeImageFile = SlateTool.create(spec, {
  name: 'Optimize Image File',
  key: 'optimize_image_file',
  description:
    'Optimize one publicly accessible image and retrieve the optimized image content in the same request. Supports compression, resizing, a single output format, upscaling and background removal.',
  instructions: [
    'Choose this tool when starting a single-image workflow that needs the actual image content. It starts processing; do not use it as a download or renewal step after optimize_image.',
    'Use optimize_image for batches, multiple output variants, PDFs or processing status metadata.',
    'This makes one synchronous processing request and does not automatically retry pending or failed processing.',
    'The original image must be publicly accessible via HTTP or HTTPS.'
  ],
  constraints: [
    'Processing consumes ShortPixel credits.',
    'The optimized image must be no larger than 25 MiB.',
    'Only an image response is accepted; pending JSON and provider errors are reported without another processing request.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      url: z.string().describe('Public HTTP or HTTPS URL of the single image to optimize'),
      compression: z.enum(['lossy', 'glossy', 'lossless']).default('lossy'),
      format: z
        .enum(['jpg', 'png', 'gif', 'webp', 'avif'])
        .optional()
        .describe('Single target format. Omit to retain the original image format.'),
      resize: z
        .enum(['none', 'outer', 'inner', 'smart_crop'])
        .optional()
        .describe(
          'Outer contains the target rectangle; inner fits inside it; smart_crop crops to it.'
        ),
      resizeWidth: z.number().optional().describe('Target width in pixels'),
      resizeHeight: z.number().optional().describe('Target height in pixels'),
      upscale: z.enum(['2', '3', '4']).optional().describe('AI upscale factor'),
      keepExif: z.boolean().optional().describe('Preserve EXIF metadata'),
      cmykToRgb: z.boolean().optional().describe('Convert CMYK colors to RGB'),
      backgroundRemove: z
        .string()
        .optional()
        .describe(
          'Use transparent, an RGBA hex color such as #ff0000FF, or a background image URL'
        ),
      waitSeconds: z
        .number()
        .min(0)
        .max(30)
        .default(30)
        .describe('Maximum processing wait in seconds. A pending result is not retried.')
    })
  )
  .output(
    z.object({
      mimeType: z.string().describe('Image MIME type returned by ShortPixel'),
      sizeBytes: z.number().describe('Actual optimized image content size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let url: URL;
    try {
      url = new URL(ctx.input.url);
    } catch {
      throw createApiServiceError('Provide a valid HTTP or HTTPS image URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw createApiServiceError('The image URL must use HTTP or HTTPS.');
    }
    for (let dimension of [ctx.input.resizeWidth, ctx.input.resizeHeight]) {
      if (dimension !== undefined && (!Number.isFinite(dimension) || dimension <= 0)) {
        throw createApiServiceError('Resize dimensions must be positive pixel values.');
      }
    }
    if (
      ['inner', 'smart_crop'].includes(ctx.input.resize ?? '') &&
      (ctx.input.resizeWidth === undefined || ctx.input.resizeHeight === undefined)
    ) {
      throw createApiServiceError(
        'Provide both resizeWidth and resizeHeight for this resize mode.'
      );
    }
    let file = await new ShortPixelClient({ token: ctx.auth.token }).optimizeImageFile({
      url: ctx.input.url,
      compression: ctx.input.compression,
      convertTo: ctx.input.format,
      resize: ctx.input.resize,
      resizeWidth: ctx.input.resizeWidth,
      resizeHeight: ctx.input.resizeHeight,
      upscale: ctx.input.upscale ? Number.parseInt(ctx.input.upscale, 10) : undefined,
      keepExif: ctx.input.keepExif,
      cmykToRgb: ctx.input.cmykToRgb,
      backgroundRemove: ctx.input.backgroundRemove,
      waitSeconds: ctx.input.waitSeconds
    });
    await ctx.addAttachment({
      type: 'content',
      content: new Response(file.bytes, { headers: { 'content-type': file.mimeType } }),
      mimeType: file.mimeType
    });
    return {
      output: { mimeType: file.mimeType, sizeBytes: file.bytes.byteLength },
      message: `Retrieved optimized image content (${file.bytes.byteLength} bytes, ${file.mimeType}).`
    };
  })
  .build();
