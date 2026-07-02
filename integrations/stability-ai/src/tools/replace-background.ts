import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  createMediaAttachment,
  imageOutputFormatEnum,
  mediaAttachmentOutputSchema,
  toMediaAttachmentOutput
} from './shared';

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
      negativePrompt: z
        .string()
        .optional()
        .describe('Text describing what to avoid in the generated background.'),
      preserveOriginalSubject: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How strongly to preserve the original subject.'),
      originalBackgroundDepth: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Depth estimate for the original background.'),
      keepOriginalBackground: z
        .boolean()
        .optional()
        .describe('Whether to keep the original background while relighting.'),
      lightSourceDirection: z
        .enum(['above', 'below', 'left', 'right'])
        .optional()
        .describe('Direction of the light source.'),
      lightReference: z
        .string()
        .optional()
        .describe('Base64-encoded image to use as a lighting reference.'),
      lightSourceStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Intensity of the light source (0-1).'),
      seed: z.number().optional().describe('Seed for reproducible results.'),
      outputFormat: imageOutputFormatEnum
    })
  )
  .output(mediaAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Starting background replacement. This may take a moment...');

    let result = await client.replaceBackgroundAndRelight({
      subjectImage: ctx.input.subjectImage,
      backgroundPrompt: ctx.input.backgroundPrompt,
      backgroundReference: ctx.input.backgroundReference,
      foregroundPrompt: ctx.input.foregroundPrompt,
      negativePrompt: ctx.input.negativePrompt,
      preserveOriginalSubject: ctx.input.preserveOriginalSubject,
      originalBackgroundDepth: ctx.input.originalBackgroundDepth,
      keepOriginalBackground: ctx.input.keepOriginalBackground,
      lightSourceDirection: ctx.input.lightSourceDirection,
      lightReference: ctx.input.lightReference,
      lightSourceStrength: ctx.input.lightSourceStrength,
      outputFormat: ctx.input.outputFormat,
      seed: ctx.input.seed
    });

    return {
      output: toMediaAttachmentOutput(result),
      attachments: [createMediaAttachment(result)],
      message: `Replaced background. Attachment MIME: \`${result.mimeType}\`.`
    };
  })
  .build();
