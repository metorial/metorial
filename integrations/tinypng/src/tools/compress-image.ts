import { SlateTool } from 'slates';
import { z } from 'zod';
import { type OutputResult, TinifyClient } from '../lib/client';
import { deliverContent, deliverOriginal } from '../lib/delivery';
import { validateOptions } from '../lib/validation';
import { spec } from '../spec';

export let compressImage = SlateTool.create(spec, {
  name: 'Compress Image',
  key: 'compress_image',
  description: `Compress an image using TinyPNG's lossy compression engine. Supports AVIF, WebP, JPEG, and PNG formats. The image type is automatically detected and optimized with the appropriate engine. Provide a publicly accessible URL to the image. Returns a downloadable optimized image and available compression statistics. You can optionally preserve metadata (copyright, creation date, GPS location) in the compressed output.`,
  instructions: [
    'Download the result promptly. Provider retention is not controlled by this tool.',
    'Preserving metadata does not count as an additional compression.'
  ],
  constraints: [
    'Each submitted compression can consume monthly quota or incur charges. Deleting a local file does not reverse usage.',
    'Only AVIF, WebP, JPEG, and PNG image formats are supported.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('Publicly accessible URL of the image to compress'),
      preserve: z
        .array(z.enum(['copyright', 'creation', 'location']))
        .optional()
        .describe(
          'Metadata to preserve in the compressed image. "location" is JPEG only; "creation" also supports PNG.'
        )
    })
  )
  .output(
    z.object({
      inputSize: z.number().optional().describe('Original image size in bytes'),
      inputType: z.string().optional().describe('Original image MIME type'),
      outputSize: z.number().optional().describe('Compressed image size in bytes'),
      outputType: z.string().optional().describe('Compressed image MIME type'),
      outputWidth: z.number().optional().describe('Image width in pixels'),
      outputHeight: z.number().optional().describe('Image height in pixels'),
      compressionRatio: z
        .number()
        .optional()
        .describe('Output/input byte ratio when known; preserved metadata can increase size'),
      outputUrl: z
        .string()
        .optional()
        .describe(
          'Provider URL for the original compressed image; omitted when metadata processing returns a downloadable file'
        ),
      compressionCount: z.number().optional().describe('Total compressions used this month')
    })
  )
  .handleInvocation(async ctx => {
    validateOptions({ preserve: ctx.input.preserve });
    let client = new TinifyClient(ctx.auth.token);

    ctx.info('Compressing image from URL...');
    let result = await client.compressFromUrl(ctx.input.sourceUrl);

    let processed: OutputResult | undefined;
    if (ctx.input.preserve?.length) {
      processed = await client.postToOutput(result.outputUrl, {
        preserve: ctx.input.preserve
      });
      await deliverContent(ctx, processed);
    } else await deliverOriginal(ctx, client, result);

    return {
      output: {
        inputSize: result.inputSize,
        inputType: result.inputType,
        outputSize: processed?.contentLength ?? result.outputSize,
        outputType: processed?.contentType ?? result.outputType,
        outputWidth: processed?.width ?? result.outputWidth,
        outputHeight: processed?.height ?? result.outputHeight,
        compressionRatio:
          processed && result.inputSize
            ? processed.contentLength! / result.inputSize
            : result.outputRatio,
        outputUrl: processed ? undefined : result.outputUrl,
        compressionCount: processed ? processed.compressionCount : result.compressionCount
      },
      message:
        'Prepared the compressed image for download. Compression usage and provider retention remain in effect.'
    };
  })
  .build();
