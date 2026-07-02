import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShortPixelClient } from '../lib/client';
import { spec } from '../spec';

export let optimizeImage = SlateTool.create(spec, {
  name: 'Optimize Image',
  key: 'optimize_image',
  description: `Compress, resize, convert, upscale, or remove backgrounds from images via their URLs using the ShortPixel Reducer API.
Supports batch processing of up to 100 image URLs in a single request. Results include download URLs for optimized images in various formats and compression levels, along with size statistics.
If optimization is still processing (status code 1), re-invoke this tool with the same URLs to poll for results.`,
  instructions: [
    'Provide publicly accessible image URLs. The images must be reachable from the internet.',
    'When status code is 1 (scheduled), wait a few seconds and call the tool again with the same URLs to get results.',
    'Use convertTo to request additional formats like WebP or AVIF alongside the original format.'
  ],
  constraints: [
    'Maximum of 100 URLs per request.',
    'Each optimization consumes API credits based on the number of images processed.',
    'Images must be publicly accessible via HTTP/HTTPS.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      urls: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of publicly accessible image URLs to optimize'),
      compression: z
        .enum(['lossy', 'glossy', 'lossless'])
        .default('lossy')
        .describe(
          'Compression level: lossy (best compression), glossy (high quality lossy), lossless (identical quality)'
        ),
      convertTo: z
        .string()
        .optional()
        .describe(
          'Format conversion target. Use "+webp" for WebP, "+avif" for AVIF, "+webp|+avif" for both, or "jpg", "png", "gif" for format conversion'
        ),
      resize: z
        .enum(['none', 'outer', 'inner', 'smart_crop'])
        .optional()
        .describe(
          'Resize mode: none (default), outer (fit within bounds), inner (fill bounds), smart_crop (AI-powered crop)'
        ),
      resizeWidth: z
        .number()
        .optional()
        .describe('Target width in pixels (required when resize is set)'),
      resizeHeight: z
        .number()
        .optional()
        .describe('Target height in pixels (required when resize is set)'),
      upscale: z
        .enum(['2', '3', '4'])
        .optional()
        .describe('AI upscaling factor: 2x, 3x, or 4x enlargement'),
      keepExif: z
        .boolean()
        .optional()
        .describe('Whether to preserve EXIF metadata in the output image'),
      cmykToRgb: z.boolean().optional().describe('Whether to convert CMYK color space to RGB'),
      backgroundRemove: z
        .string()
        .optional()
        .describe(
          'Background removal: "transparent" for transparent background, a hex color like "#ff0000" for replacement, or a URL for a replacement image'
        ),
      refresh: z
        .boolean()
        .optional()
        .describe('Force re-optimization even if the image was previously processed'),
      waitSeconds: z
        .number()
        .min(0)
        .max(30)
        .optional()
        .describe(
          'Seconds to wait for processing (0-30). Use 0 for immediate return, higher values to wait for results'
        )
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            statusCode: z
              .number()
              .describe('Status code: 2 = success, 1 = still processing, negative = error'),
            statusMessage: z.string().describe('Human-readable status message'),
            originalUrl: z
              .string()
              .optional()
              .describe('Original image URL that was submitted'),
            lossyUrl: z
              .string()
              .optional()
              .describe('Download URL for lossy-compressed image'),
            losslessUrl: z
              .string()
              .optional()
              .describe('Download URL for lossless-compressed image'),
            webpLossyUrl: z
              .string()
              .optional()
              .describe('Download URL for WebP lossy version'),
            webpLosslessUrl: z
              .string()
              .optional()
              .describe('Download URL for WebP lossless version'),
            avifLossyUrl: z
              .string()
              .optional()
              .describe('Download URL for AVIF lossy version'),
            avifLosslessUrl: z
              .string()
              .optional()
              .describe('Download URL for AVIF lossless version'),
            originalSize: z.number().optional().describe('Original file size in bytes'),
            lossySize: z.number().optional().describe('Lossy compressed file size in bytes'),
            losslessSize: z
              .number()
              .optional()
              .describe('Lossless compressed file size in bytes'),
            timestamp: z.string().optional().describe('Processing completion timestamp')
          })
        )
        .describe('Optimization results for each submitted URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShortPixelClient({ token: ctx.auth.token });

    let rawResults = await client.optimizeByUrl({
      urls: ctx.input.urls,
      compression: ctx.input.compression,
      convertTo: ctx.input.convertTo,
      resize: ctx.input.resize,
      resizeWidth: ctx.input.resizeWidth,
      resizeHeight: ctx.input.resizeHeight,
      upscale: ctx.input.upscale ? Number.parseInt(ctx.input.upscale, 10) : undefined,
      keepExif: ctx.input.keepExif,
      cmykToRgb: ctx.input.cmykToRgb,
      backgroundRemove: ctx.input.backgroundRemove,
      refresh: ctx.input.refresh,
      waitSeconds: ctx.input.waitSeconds
    });

    let results = rawResults.map(r => ({
      statusCode: r.Status.Code,
      statusMessage: r.Status.Message,
      originalUrl: r.OriginalURL,
      lossyUrl: 'LossyURL' in r ? r.LossyURL : undefined,
      losslessUrl: 'LosslessURL' in r ? r.LosslessURL : undefined,
      webpLossyUrl: 'WebPLossyURL' in r ? r.WebPLossyURL : undefined,
      webpLosslessUrl: 'WebPLosslessURL' in r ? r.WebPLosslessURL : undefined,
      avifLossyUrl: 'AVIFLossyURL' in r ? r.AVIFLossyURL : undefined,
      avifLosslessUrl: 'AVIFLosslessURL' in r ? r.AVIFLosslessURL : undefined,
      originalSize: 'OriginalSize' in r ? r.OriginalSize : undefined,
      lossySize: 'LossySize' in r ? r.LossySize : undefined,
      losslessSize: 'LoselessSize' in r ? r.LoselessSize : undefined,
      timestamp: 'Timestamp' in r ? r.Timestamp : undefined
    }));

    let successCount = results.filter(r => r.statusCode === 2).length;
    let pendingCount = results.filter(r => r.statusCode === 1).length;
    let errorCount = results.filter(r => r.statusCode < 0).length;

    let messageParts: string[] = [];
    if (successCount > 0) messageParts.push(`**${successCount}** optimized successfully`);
    if (pendingCount > 0) messageParts.push(`**${pendingCount}** still processing`);
    if (errorCount > 0) messageParts.push(`**${errorCount}** failed`);

    return {
      output: { results },
      message: `Processed ${results.length} image(s): ${messageParts.join(', ')}.`
    };
  })
  .build();
