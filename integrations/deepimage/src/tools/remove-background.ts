import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeBackground = SlateTool.create(spec, {
  name: 'Remove Background',
  key: 'remove_background',
  description: `Remove the background from an image, optionally replacing it with a solid color, a custom image, or an AI-generated background.
Ideal for product photography, e-commerce listings, and creative workflows. Supports automatic object detection and smart cropping.`,
  instructions: [
    'Set removalAlgorithm to control how the background is detected. "auto" works for most images.',
    'Use replacementColor for a solid background (hex color or "transparent").',
    'Use replacementImageUrl to replace the background with another image.',
    'Use the generate options to create an AI-generated background from a text prompt.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('URL or base64-encoded image to process'),
      removalAlgorithm: z
        .enum(['auto', 'v2', 'human', 'item'])
        .optional()
        .default('auto')
        .describe('Background removal algorithm. "human" for people, "item" for products'),
      replacementColor: z
        .string()
        .optional()
        .describe('Background color: hex (e.g. "#FFFFFF"), "transparent", or "auto"'),
      replacementImageUrl: z
        .string()
        .optional()
        .describe('URL of image to use as new background'),
      generateDescription: z
        .string()
        .optional()
        .describe('Text prompt for AI-generated background'),
      generateModelType: z
        .string()
        .optional()
        .describe('AI model for background generation (e.g. realistic, fantasy, premium)'),
      generateSampleNum: z
        .number()
        .optional()
        .describe('Seed number for reproducible generation results'),
      itemAreaPercentage: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How much of the canvas the item occupies (0-1, e.g. 0.65 = 65%)'),
      generateBackgroundUrl: z
        .string()
        .optional()
        .describe('Image URL to blend with the generated background for consistent imagery'),
      generateBackgroundColor: z
        .array(z.number())
        .optional()
        .describe('RGB array [R,G,B] to tint the generated background (e.g. [255,255,255])'),
      width: z.number().optional().describe('Target output width in pixels'),
      height: z.number().optional().describe('Target output height in pixels'),
      fitCrop: z
        .enum(['center', 'content', 'item'])
        .optional()
        .describe('Cropping mode. "item" crops around the detected object'),
      padding: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Padding around the object in pixels or percentage (e.g. "20%")'),
      outputFormat: z.enum(['jpg', 'png', 'webp']).optional().describe('Output image format')
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

    let generate =
      ctx.input.generateDescription || ctx.input.generateModelType
        ? {
            description: ctx.input.generateDescription,
            modelType: ctx.input.generateModelType,
            sampleNum: ctx.input.generateSampleNum,
            adapterType: 'generate_background' as const,
            itemAreaPercentage: ctx.input.itemAreaPercentage,
            backgroundUrl: ctx.input.generateBackgroundUrl,
            color: ctx.input.generateBackgroundColor
          }
        : undefined;

    let fit = ctx.input.fitCrop ? { crop: ctx.input.fitCrop } : undefined;

    let result = await client.processImageSync({
      url: ctx.input.imageUrl,
      width: ctx.input.width,
      height: ctx.input.height,
      background: {
        remove: ctx.input.removalAlgorithm,
        color: ctx.input.replacementColor,
        replace: ctx.input.replacementImageUrl,
        generate
      },
      fit,
      padding: ctx.input.padding,
      outputFormat: ctx.input.outputFormat
    });

    let message =
      result.status === 'complete'
        ? `Background removed successfully. Result: ${result.resultUrl}`
        : `Background removal started (status: **${result.status}**). Job ID: \`${result.jobId}\`.`;

    return {
      output: result,
      message
    };
  })
  .build();
