import { SlateTool } from 'slates';
import { z } from 'zod';
import { TinifyClient } from '../lib/client';
import { deliverContent } from '../lib/delivery';
import { validateOptions } from '../lib/validation';
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
        .describe(
          'Metadata to preserve. "location" is JPEG only; "creation" also supports PNG.'
        )
    })
  )
  .output(
    z.object({
      inputSize: z.number().optional().describe('Original image size in bytes'),
      inputType: z.string().optional().describe('Original image MIME type'),
      outputUrl: z
        .string()
        .optional()
        .describe('Not returned when the processed image is delivered as a downloadable file'),
      outputContentType: z.string().optional().describe('Output image MIME type'),
      outputWidth: z.number().optional().describe('Image width in pixels'),
      outputHeight: z.number().optional().describe('Image height in pixels'),
      compressionCount: z.number().optional().describe('Total compressions used this month')
    })
  )
  .handleInvocation(async ctx => {
    validateOptions({
      convert: { type: ctx.input.targetType, background: ctx.input.background },
      preserve: ctx.input.preserve
    });
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

    await deliverContent(ctx, convertResult);

    return {
      output: {
        inputSize: compressResult.inputSize,
        inputType: compressResult.inputType,
        outputUrl: undefined,
        outputContentType: convertResult.contentType,
        outputWidth: convertResult.width,
        outputHeight: convertResult.height,
        compressionCount: convertResult.compressionCount
      },
      message:
        'Prepared the processed image for download. Submitted operations retain compression usage.'
    };
  })
  .build();
