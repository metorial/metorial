import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let replaceBackground = SlateTool.create(spec, {
  name: 'Replace Background & Relight',
  key: 'replace_background',
  description: `Replace the background of a subject image with a new AI-generated scene and adjust lighting. Useful for e-commerce product shots, real estate photography, and creative compositing.

Provide a subject image and describe the desired background. Optionally control the lighting direction and intensity to match the new scene.`,
  instructions: [
    'Provide either a background prompt (text description) or a background reference image, or both.',
    'Light source direction options: above, below, left, right.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subjectImage: z
        .string()
        .describe('Base64-encoded image of the subject whose background will be replaced.'),
      backgroundPrompt: z
        .string()
        .optional()
        .describe('Text description of the desired new background.'),
      backgroundReference: z
        .string()
        .optional()
        .describe('Base64-encoded reference image for the background.'),
      foregroundPrompt: z
        .string()
        .optional()
        .describe('Text prompt for enhancing or describing the subject lighting.'),
      lightSourceDirection: z
        .enum(['above', 'below', 'left', 'right'])
        .optional()
        .describe('Direction of the light source.'),
      lightSourceStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Intensity of the light source (0-1).'),
      seed: z.number().optional().describe('Seed for reproducible results.'),
      outputFormat: z.enum(['png', 'jpeg', 'webp']).optional().describe('Output image format.')
    })
  )
  .output(
    z.object({
      base64Image: z.string().describe('Base64-encoded image with replaced background.'),
      seed: z.number().describe('Seed used for this generation.'),
      finishReason: z.string().describe('Reason the operation finished.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Starting background replacement. This may take a moment...');

    let result = await client.replaceBackgroundAndRelight({
      subjectImage: ctx.input.subjectImage,
      backgroundPrompt: ctx.input.backgroundPrompt,
      backgroundReference: ctx.input.backgroundReference,
      foregroundPrompt: ctx.input.foregroundPrompt,
      lightSourceDirection: ctx.input.lightSourceDirection,
      lightSourceStrength: ctx.input.lightSourceStrength,
      outputFormat: ctx.input.outputFormat,
      seed: ctx.input.seed
    });

    return {
      output: result,
      message: `Replaced background with seed **${result.seed}**. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
