import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resizeImage = SlateTool.create(spec, {
  name: 'Resize Image',
  key: 'resize_image',
  description: `Resize an image to specific dimensions with flexible fitting options. Supports padding, cropping, and canvas modes.
Can also add a watermark/caption overlay to the output image with configurable position, size, and opacity.`,
  instructions: [
    'Set width and/or height. If only one is set, the other is calculated to preserve aspect ratio.',
    'Use fitMode to control how the image fits: "canvas" places the image on a canvas, "crop" crops to fit, "bounds" scales to fit within bounds, "cover" scales to fully cover dimensions.',
    'For smart cropping, use cropMode with "content" (content-aware) or "item" (object-centered).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('URL or base64-encoded image to resize'),
      width: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Target width in pixels or percentage (e.g. "200%")'),
      height: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Target height in pixels or percentage (e.g. "200%")'),
      fitMode: z
        .enum(['canvas', 'crop', 'bounds', 'cover'])
        .optional()
        .describe('How the image fits target dimensions'),
      cropMode: z
        .enum(['center', 'content', 'item'])
        .optional()
        .describe('Cropping strategy when fitMode is "crop"'),
      padding: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Padding around content in pixels or percentage (e.g. "20%")'),
      captionUrl: z
        .string()
        .optional()
        .describe('URL of a watermark/caption image to overlay'),
      captionPosition: z
        .enum(['LT', 'MT', 'RT', 'ML', 'MM', 'MR', 'BL', 'BM', 'BR'])
        .optional()
        .describe(
          'Caption position: L=left, M=middle, R=right, T=top, B=bottom (e.g. "BR" for bottom-right)'
        ),
      captionWidthPercentage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Caption width as percentage of image width (1-100)'),
      captionPadding: z
        .number()
        .optional()
        .describe('Padding in pixels between caption and image borders'),
      captionOpacity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Caption opacity (0-100)'),
      outputFormat: z.enum(['jpg', 'png', 'webp']).optional().describe('Output image format'),
      outputQuality: z.number().min(1).max(100).optional().describe('Output quality (1-100)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Processing status'),
      jobId: z.string().describe('Job identifier for tracking'),
      resultUrl: z.string().optional().describe('URL to the processed image when complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let fit: string | { canvas?: string; crop?: string } | undefined;
    if (ctx.input.cropMode) {
      fit = { crop: ctx.input.cropMode };
    } else if (ctx.input.fitMode) {
      fit = ctx.input.fitMode;
    }

    let caption = ctx.input.captionUrl
      ? {
          url: ctx.input.captionUrl,
          position: ctx.input.captionPosition,
          targetWidthPercentage: ctx.input.captionWidthPercentage,
          padding: ctx.input.captionPadding,
          opacity: ctx.input.captionOpacity
        }
      : undefined;

    let result = await client.processImageSync({
      url: ctx.input.imageUrl,
      width: ctx.input.width,
      height: ctx.input.height,
      fit,
      padding: ctx.input.padding,
      caption,
      outputFormat: ctx.input.outputFormat,
      outputQuality: ctx.input.outputQuality
    });

    let message =
      result.status === 'complete'
        ? `Image resized successfully. Result: ${result.resultUrl}`
        : `Image resize started (status: **${result.status}**). Job ID: \`${result.jobId}\`.`;

    return {
      output: result,
      message
    };
  })
  .build();
