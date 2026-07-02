import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inpaintOutpaint = SlateTool.create(spec, {
  name: 'Inpaint or Outpaint',
  key: 'inpaint_outpaint',
  description: `Inpaint specific regions of an image or outpaint (uncrop) to extend the canvas beyond the original borders.
**Inpainting** fills in or modifies masked regions with AI-generated content. Provide a mask image to specify which areas to modify.
**Outpainting** expands the image canvas and generates new content to fill the extended area. Useful for adding space for text overlays or expanding tight crops.`,
  instructions: [
    'For inpainting: provide both imageUrl and maskImageUrl, plus a prompt describing what to generate in the masked area.',
    'For outpainting: provide imageUrl with a larger width/height than the original. The AI fills the new area.',
    'Set mode to "inpaint" or "outpaint" to control the operation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z
        .enum(['inpaint', 'outpaint'])
        .describe('Operation mode: inpaint to fill regions, outpaint to extend canvas'),
      imageUrl: z.string().describe('URL of the source image'),
      maskImageUrl: z
        .string()
        .optional()
        .describe('URL of the mask image for inpainting (white areas will be modified)'),
      prompt: z
        .string()
        .optional()
        .describe('Text description of what to generate in the modified area'),
      controlnetConditioningScale: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Control strength for edge preservation (0-1, default 0.5)'),
      width: z.number().optional().describe('Target output width (required for outpainting)'),
      height: z
        .number()
        .optional()
        .describe('Target output height (required for outpainting)'),
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
    let result: any;

    if (ctx.input.mode === 'outpaint') {
      result = await client.processImageSync({
        url: ctx.input.imageUrl,
        width: ctx.input.width,
        height: ctx.input.height,
        fit: { canvas: 'outpainting' },
        outputFormat: ctx.input.outputFormat,
        background: ctx.input.prompt
          ? {
              generate: {
                adapterType: 'upscale',
                description: ctx.input.prompt
              }
            }
          : undefined
      });
    } else {
      result = await client.processImageSync({
        url: ctx.input.imageUrl,
        width: ctx.input.width,
        height: ctx.input.height,
        outputFormat: ctx.input.outputFormat,
        background: {
          generate: {
            adapterType: 'inpainting',
            description: ctx.input.prompt,
            ipImage2: ctx.input.maskImageUrl,
            controlnetConditioningScale: ctx.input.controlnetConditioningScale
          }
        }
      });
    }

    let opLabel = ctx.input.mode === 'outpaint' ? 'Outpainting' : 'Inpainting';
    let message =
      result.status === 'complete'
        ? `${opLabel} completed successfully. Result: ${result.resultUrl}`
        : `${opLabel} started (status: **${result.status}**). Job ID: \`${result.jobId}\`.`;

    return {
      output: result,
      message
    };
  })
  .build();
