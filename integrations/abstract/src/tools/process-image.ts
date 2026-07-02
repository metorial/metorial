import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let processImage = SlateTool.create(spec, {
  name: 'Process Image',
  key: 'process_image',
  description: `Compresses and optimizes an image from a URL. Supports lossy and lossless compression with configurable quality settings. Returns the optimized image URL and compression statistics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the image to process'),
      lossy: z
        .boolean()
        .optional()
        .describe(
          'Whether to use lossy compression (smaller file, slight quality loss). Defaults to lossless.'
        ),
      quality: z
        .number()
        .optional()
        .describe(
          'Quality level from 1 (most compressed) to 100 (highest quality). Only applies with lossy compression.'
        )
    })
  )
  .output(
    z.object({
      originalUrl: z.string().describe('Original image URL'),
      compressedUrl: z.string().optional().describe('URL of the compressed/optimized image'),
      originalSize: z.number().optional().describe('Original image file size in bytes'),
      compressedSize: z.number().optional().describe('Compressed image file size in bytes'),
      savedPercentage: z.number().optional().describe('Percentage of file size saved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.processImage({
      url: ctx.input.url,
      lossy: ctx.input.lossy,
      quality: ctx.input.quality
    });

    let output = {
      originalUrl: result.original_url ?? ctx.input.url,
      compressedUrl: result.compressed_url ?? result.url ?? undefined,
      originalSize: result.original_size != null ? Number(result.original_size) : undefined,
      compressedSize:
        result.compressed_size != null ? Number(result.compressed_size) : undefined,
      savedPercentage:
        result.saved_percentage != null ? Number(result.saved_percentage) : undefined
    };

    return {
      output,
      message: `Processed image${output.savedPercentage != null ? ` — saved **${output.savedPercentage}%**` : ''}${output.compressedUrl ? `. [Optimized image](${output.compressedUrl})` : ''}.`
    };
  })
  .build();
