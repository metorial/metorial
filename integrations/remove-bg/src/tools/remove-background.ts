import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeBackground = SlateTool.create(spec, {
  name: 'Remove Background',
  key: 'remove_background',
  description: `Remove or replace the background of an image using AI. Provide an image via URL or base64-encoded data and receive the processed result with the background removed, replaced with a solid color, or replaced with a custom background image. Supports configuring output size, format, cropping, scaling, shadow effects, and region of interest.`,
  instructions: [
    'Provide exactly one image source: either imageUrl or imageFileB64.',
    'To replace the background, set bgColor for a solid color or bgImageUrl/bgImageFileB64 for a custom background image. Only use one background option at a time.',
    'The crop and cropMargin options work together - cropMargin only applies when crop is true.'
  ],
  constraints: [
    'Maximum input image size is 50 megapixels and 22 MB.',
    'PNG output is limited to 10 MP; JPG, WebP, and ZIP support up to 50 MP.',
    'Rate limit: 500 megapixel-images per minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the image to process. Provide this or imageFileB64.'),
      imageFileB64: z
        .string()
        .optional()
        .describe('Base64-encoded image data. Provide this or imageUrl.'),
      size: z
        .enum(['preview', 'small', 'regular', 'medium', 'hd', 'full', '4k', '50MP', 'auto'])
        .optional()
        .describe(
          'Output image resolution. "preview"/"small" = 0.25 MP, "medium" = 1.5 MP, "hd" = 4 MP, "full"/"4k" = original, "50MP" = up to 50 MP, "auto" = highest available up to 25 MP.'
        ),
      type: z
        .enum([
          'auto',
          'person',
          'product',
          'animal',
          'car',
          'car_interior',
          'car_part',
          'transportation',
          'graphics',
          'graphic',
          'other'
        ])
        .optional()
        .describe(
          'Foreground subject type. Use "auto" for detection; "graphic" selects graphics.'
        ),
      typeLevel: z
        .enum(['none', '1', '2', 'latest'])
        .optional()
        .describe('Classification level of the detected foreground type.'),
      format: z
        .enum(['auto', 'png', 'jpg', 'webp', 'zip'])
        .optional()
        .describe(
          'Output image format. ZIP contains color.jpg + alpha.png for best performance.'
        ),
      channels: z
        .enum(['rgba', 'alpha'])
        .optional()
        .describe('Request the finalized RGBA image or just the alpha mask.'),
      crop: z
        .boolean()
        .optional()
        .describe('Automatically crop off empty regions from the result.'),
      cropMargin: z
        .string()
        .optional()
        .describe(
          'Margin around the cropped subject. Absolute (e.g. "30px") or relative (e.g. "10%"). Supports 1, 2, or 4 values like CSS.'
        ),
      scale: z
        .string()
        .optional()
        .describe(
          'Scale the subject relative to the total image size. Use "original" to keep the original scale, or a percentage like "80%".'
        ),
      position: z
        .string()
        .optional()
        .describe(
          'Position of the subject. "original" or "center". Can be one value or two (horizontal, vertical).'
        ),
      roi: z
        .string()
        .optional()
        .describe(
          'Region of interest rectangle as "x1 y1 x2 y2" with px or % suffix, e.g. "0% 0% 100% 100%".'
        ),
      bgColor: z
        .string()
        .optional()
        .describe(
          'Solid background color as hex code (e.g. "81d4fa", "fff") or color name (e.g. "green").'
        ),
      bgImageUrl: z
        .string()
        .optional()
        .describe('URL of a background image to composite behind the subject.'),
      bgImageFileB64: z.string().optional().describe('Base64-encoded background image data.'),
      shadowType: z
        .string()
        .optional()
        .describe('Type of artificial shadow to add to the result.'),
      shadowOpacity: z.number().optional().describe('Opacity of the shadow effect (0-100).'),
      semitransparency: z
        .boolean()
        .optional()
        .describe(
          'Whether to preserve semi-transparent areas like glass or windows. Defaults to true.'
        )
    })
  )
  .output(
    z.object({
      resultImageB64: z
        .string()
        .describe('Base64-encoded result image with background removed or replaced.'),
      creditsCharged: z.number().describe('Number of API credits charged for this request.'),
      detectedType: z
        .string()
        .optional()
        .describe('The detected foreground type. Omitted when typeLevel is "none".'),
      imageWidth: z.number().describe('Width of the result image in pixels.'),
      imageHeight: z.number().describe('Height of the result image in pixels.'),
      foregroundTop: z
        .number()
        .describe('Top position of the detected foreground in the original image (pixels).'),
      foregroundLeft: z
        .number()
        .describe('Left position of the detected foreground in the original image (pixels).'),
      foregroundWidth: z
        .number()
        .describe('Width of the detected foreground in the original image (pixels).'),
      foregroundHeight: z
        .number()
        .describe('Height of the detected foreground in the original image (pixels).'),
      filename: z.string().optional().describe('Name of the downloadable result file.'),
      mimeType: z.string().optional().describe('MIME type detected from the result file.'),
      byteSize: z.number().optional().describe('Size of the result file in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Processing image with Remove.bg...');

    let result = await client.removeBackground({
      imageUrl: ctx.input.imageUrl,
      imageFileB64: ctx.input.imageFileB64,
      size: ctx.input.size,
      type: ctx.input.type,
      typeLevel: ctx.input.typeLevel,
      format: ctx.input.format,
      channels: ctx.input.channels,
      crop: ctx.input.crop,
      cropMargin: ctx.input.cropMargin,
      scale: ctx.input.scale,
      position: ctx.input.position,
      roi: ctx.input.roi,
      bgColor: ctx.input.bgColor,
      bgImageUrl: ctx.input.bgImageUrl,
      bgImageFileB64: ctx.input.bgImageFileB64,
      shadowType: ctx.input.shadowType,
      shadowOpacity: ctx.input.shadowOpacity,
      semitransparency: ctx.input.semitransparency
    });

    let content = Buffer.from(result.resultImageB64, 'base64');
    if (!content.byteLength) {
      throw createApiServiceError('Remove.bg returned an empty processed image.');
    }
    let fileFormat = content
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? { extension: 'png', mimeType: 'image/png' }
      : content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff
        ? { extension: 'jpg', mimeType: 'image/jpeg' }
        : content.toString('ascii', 0, 4) === 'RIFF' &&
            content.toString('ascii', 8, 12) === 'WEBP'
          ? { extension: 'webp', mimeType: 'image/webp' }
          : content[0] === 0x50 &&
              content[1] === 0x4b &&
              content[2] === 0x03 &&
              content[3] === 0x04
            ? { extension: 'zip', mimeType: 'application/zip' }
            : { extension: 'bin', mimeType: 'application/octet-stream' };
    let filename = `background-result.${fileFormat.extension}`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(content), {
        headers: { 'Content-Type': fileFormat.mimeType }
      }),
      filename,
      mimeType: fileFormat.mimeType
    });

    let bgDescription = ctx.input.bgColor
      ? `replaced with color **${ctx.input.bgColor}**`
      : ctx.input.bgImageUrl || ctx.input.bgImageFileB64
        ? 'replaced with a custom background image'
        : 'removed';

    return {
      output: {
        resultImageB64: result.resultImageB64,
        creditsCharged: result.creditsCharged,
        detectedType: result.detectedType,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        foregroundTop: result.foregroundTop,
        foregroundLeft: result.foregroundLeft,
        foregroundWidth: result.foregroundWidth,
        foregroundHeight: result.foregroundHeight,
        filename,
        mimeType: fileFormat.mimeType,
        byteSize: content.byteLength
      },
      message: `Background ${bgDescription}. ${result.detectedType ? `Detected subject type: **${result.detectedType}**. ` : ''}Output size: **${result.imageWidth}x${result.imageHeight}** px. Credits charged: **${result.creditsCharged}**.`
    };
  })
  .build();
