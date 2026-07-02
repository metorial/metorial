import { SlateTool } from 'slates';
import { z } from 'zod';
import { TinifyClient } from '../lib/client';
import { spec } from '../spec';

export let compressImage = SlateTool.create(spec, {
  name: 'Compress Image',
  key: 'compress_image',
  description: `Compress an image using TinyPNG's lossy compression engine. Supports AVIF, WebP, JPEG, and PNG formats. The image type is automatically detected and optimized with the appropriate engine. Provide a publicly accessible URL to the image. Returns compression statistics and a temporary URL to download the optimized image. You can optionally preserve metadata (copyright, creation date, GPS location) in the compressed output.`,
  instructions: [
    'The returned outputUrl is temporary and should be downloaded or stored promptly.',
    'Preserving metadata does not count as an additional compression.'
  ],
  constraints: [
    'Each compression counts toward the monthly limit (500 free per month).',
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
          'Metadata to preserve in the compressed image. "creation" and "location" are JPEG only.'
        )
    })
  )
  .output(
    z.object({
      inputSize: z.number().describe('Original image size in bytes'),
      inputType: z.string().describe('Original image MIME type'),
      outputSize: z.number().describe('Compressed image size in bytes'),
      outputType: z.string().describe('Compressed image MIME type'),
      outputWidth: z.number().describe('Image width in pixels'),
      outputHeight: z.number().describe('Image height in pixels'),
      compressionRatio: z
        .number()
        .describe('Compression ratio (0-1, lower is better compression)'),
      outputUrl: z.string().describe('Temporary URL to download the compressed image'),
      compressionCount: z.number().describe('Total compressions used this month')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TinifyClient(ctx.auth.token);

    ctx.info('Compressing image from URL...');
    let result = await client.compressFromUrl(ctx.input.sourceUrl);

    if (ctx.input.preserve && ctx.input.preserve.length > 0) {
      ctx.info('Preserving metadata...');
      let outputResult = await client.postToOutput(result.outputUrl, {
        preserve: ctx.input.preserve
      });
      result.outputUrl = outputResult.outputUrl || result.outputUrl;
      result.compressionCount = outputResult.compressionCount;
    }

    let savingsPercent = ((1 - result.outputRatio) * 100).toFixed(1);

    return {
      output: {
        inputSize: result.inputSize,
        inputType: result.inputType,
        outputSize: result.outputSize,
        outputType: result.outputType,
        outputWidth: result.outputWidth,
        outputHeight: result.outputHeight,
        compressionRatio: result.outputRatio,
        outputUrl: result.outputUrl,
        compressionCount: result.compressionCount
      },
      message: `Compressed **${result.inputType}** image from **${formatBytes(result.inputSize)}** to **${formatBytes(result.outputSize)}** (saved **${savingsPercent}%**). Monthly compressions used: **${result.compressionCount}**.`
    };
  })
  .build();

let formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  let k = 1024;
  let sizes = ['B', 'KB', 'MB', 'GB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]!}`;
};
