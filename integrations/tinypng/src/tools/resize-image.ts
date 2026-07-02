import { SlateTool } from 'slates';
import { z } from 'zod';
import { TinifyClient } from '../lib/client';
import { spec } from '../spec';

export let resizeImage = SlateTool.create(spec, {
  name: 'Resize Image',
  key: 'resize_image',
  description: `Compress and resize an image in one step. First compresses the source image via TinyPNG, then resizes it using the specified method. Supports four resize methods: **scale** (proportional by width or height), **fit** (fit within dimensions), **cover** (fill exact dimensions with intelligent cropping), and **thumb** (advanced cover with cut-out detection). Optionally convert format and preserve metadata in the same request.`,
  instructions: [
    'For "scale", provide only width OR height — not both.',
    'For "fit", "cover", and "thumb", provide both width and height.',
    'Images will not be upscaled beyond their original dimensions.'
  ],
  constraints: [
    'Each resize counts as one additional compression on top of the initial compression.'
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
        .describe('Publicly accessible URL of the image to compress and resize'),
      method: z.enum(['scale', 'fit', 'cover', 'thumb']).describe('Resize method to use'),
      width: z.number().optional().describe('Target width in pixels'),
      height: z.number().optional().describe('Target height in pixels'),
      convertTo: z
        .string()
        .optional()
        .describe(
          'Target image format MIME type, e.g. "image/webp", "image/png", "image/jpeg", "image/avif". Use "*/*" for smallest format.'
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
      outputUrl: z.string().describe('Temporary URL to download the resized image'),
      outputWidth: z.number().optional().describe('Resized image width in pixels'),
      outputHeight: z.number().optional().describe('Resized image height in pixels'),
      outputContentType: z.string().optional().describe('Output image MIME type'),
      compressionCount: z.number().describe('Total compressions used this month')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TinifyClient(ctx.auth.token);

    ctx.info('Compressing image...');
    let compressResult = await client.compressFromUrl(ctx.input.sourceUrl);

    ctx.info(`Resizing with method "${ctx.input.method}"...`);
    let convertOptions = ctx.input.convertTo
      ? {
          type: ctx.input.convertTo as string,
          background: ctx.input.background
        }
      : undefined;

    let resizeResult = await client.resizeImage(
      compressResult.outputUrl,
      {
        method: ctx.input.method,
        width: ctx.input.width,
        height: ctx.input.height
      },
      {
        preserve: ctx.input.preserve,
        convert: convertOptions
      }
    );

    let outputUrl = resizeResult.outputUrl || compressResult.outputUrl;

    return {
      output: {
        inputSize: compressResult.inputSize,
        inputType: compressResult.inputType,
        outputUrl,
        outputWidth: resizeResult.width,
        outputHeight: resizeResult.height,
        outputContentType: resizeResult.contentType,
        compressionCount: resizeResult.compressionCount
      },
      message: `Resized image using **${ctx.input.method}** method${resizeResult.width ? ` to **${resizeResult.width}x${resizeResult.height}**` : ''}. Monthly compressions used: **${resizeResult.compressionCount}**.`
    };
  })
  .build();
