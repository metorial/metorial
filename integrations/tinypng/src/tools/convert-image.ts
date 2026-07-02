import { SlateTool } from 'slates';
import { z } from 'zod';
import { TinifyClient } from '../lib/client';
import { spec } from '../spec';

export let convertImage = SlateTool.create(spec, {
  name: 'Convert Image',
  key: 'convert_image',
  description: `Compress and convert an image to a different format. Supports converting between AVIF, WebP, JPEG, and PNG. You can specify a single target format, multiple formats (the smallest result is returned), or use "*/*" to get the smallest among all supported formats. Optionally fill transparent backgrounds with a color when converting to non-transparent formats like JPEG.`,
  instructions: [
    'Use "*/*" as the target type to automatically select the smallest format.',
    'When converting a transparent PNG to JPEG, specify a background color to fill transparency.'
  ],
  constraints: [
    'Image conversion counts as one additional compression on top of the initial compression.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z
        .string()
        .describe('Publicly accessible URL of the image to compress and convert'),
      targetType: z
        .union([z.string(), z.array(z.string())])
        .describe(
          'Target MIME type(s). Single type like "image/webp", array like ["image/webp","image/png"] for smallest, or "*/*" for auto-smallest.'
        ),
      background: z
        .string()
        .optional()
        .describe(
          'Background color for transparent images when converting to non-transparent format. Hex value like "#ffffff", or "white"/"black".'
        ),
      preserve: z
        .array(z.enum(['copyright', 'creation', 'location']))
        .optional()
        .describe('Metadata to preserve. "creation" and "location" are JPEG only.')
    })
  )
  .output(
    z.object({
      inputSize: z.number().describe('Original image size in bytes'),
      inputType: z.string().describe('Original image MIME type'),
      outputUrl: z.string().describe('Temporary URL to download the converted image'),
      outputContentType: z.string().optional().describe('Output image MIME type'),
      outputWidth: z.number().optional().describe('Image width in pixels'),
      outputHeight: z.number().optional().describe('Image height in pixels'),
      compressionCount: z.number().describe('Total compressions used this month')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TinifyClient(ctx.auth.token);

    ctx.info('Compressing image...');
    let compressResult = await client.compressFromUrl(ctx.input.sourceUrl);

    ctx.info('Converting image format...');
    let convertResult = await client.convertImage(
      compressResult.outputUrl,
      {
        type: ctx.input.targetType,
        background: ctx.input.background
      },
      {
        preserve: ctx.input.preserve
      }
    );

    let outputUrl = convertResult.outputUrl || compressResult.outputUrl;

    return {
      output: {
        inputSize: compressResult.inputSize,
        inputType: compressResult.inputType,
        outputUrl,
        outputContentType: convertResult.contentType,
        outputWidth: convertResult.width,
        outputHeight: convertResult.height,
        compressionCount: convertResult.compressionCount
      },
      message: `Converted image from **${compressResult.inputType}** to **${convertResult.contentType || 'optimized format'}**. Monthly compressions used: **${convertResult.compressionCount}**.`
    };
  })
  .build();
