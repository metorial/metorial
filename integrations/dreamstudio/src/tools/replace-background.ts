import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let replaceBackground = SlateTool.create(spec, {
  name: 'Replace Background & Relight',
  key: 'replace_background',
  description: `Replace the background of an image while keeping the main subject intact, with optional lighting adjustments. This is an **async operation** that submits a job and polls for the result.
Can provide a text prompt for the new background or upload a reference background image. Supports lighting controls via direction, strength, and reference images.`,
  instructions: [
    'Provide either a backgroundPrompt or backgroundReference (or both) to define the new background.',
    'Use lightSourceDirection and lightSourceStrength to control lighting on the subject.',
    'The operation is asynchronous and may take up to a few minutes to complete.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subjectImage: z.string().describe('Base64-encoded image of the subject'),
      backgroundPrompt: z
        .string()
        .optional()
        .describe('Text description of the new background'),
      foregroundPrompt: z
        .string()
        .optional()
        .describe('Text to enhance lighting on the subject'),
      backgroundReference: z
        .string()
        .optional()
        .describe('Base64-encoded reference image for the background'),
      lightSourceDirection: z
        .enum(['above', 'below', 'left', 'right'])
        .optional()
        .describe('Direction of the light source'),
      lightSourceStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Intensity of the light source (0-1)'),
      lightReference: z
        .string()
        .optional()
        .describe('Base64-encoded reference image for lighting'),
      negativePrompt: z.string().optional().describe('What to exclude from the result'),
      keepOriginalBackground: z.boolean().optional().describe('Keep the original background'),
      originalBackgroundDepth: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How much to preserve original background depth'),
      preserveOriginalSubject: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How strongly to preserve the subject'),
      seed: z
        .number()
        .int()
        .min(0)
        .max(4294967294)
        .optional()
        .describe('Seed for reproducible results'),
      outputFormat: z
        .enum(['png', 'jpeg', 'webp'])
        .optional()
        .default('png')
        .describe('Output image format')
    })
  )
  .output(
    z.object({
      base64: z.string().describe('Base64-encoded result image'),
      seed: z.number().describe('Seed used for this operation'),
      finishReason: z.string().describe('Finish reason (SUCCESS or CONTENT_FILTERED)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    ctx.progress('Submitting background replacement job...');

    let { generationId } = await client.replaceBackgroundAndRelight({
      subjectImage: input.subjectImage,
      backgroundPrompt: input.backgroundPrompt,
      foregroundPrompt: input.foregroundPrompt,
      backgroundReference: input.backgroundReference,
      lightSourceDirection: input.lightSourceDirection,
      lightSourceStrength: input.lightSourceStrength,
      lightReference: input.lightReference,
      negativePrompt: input.negativePrompt,
      keepOriginalBackground: input.keepOriginalBackground,
      originalBackgroundDepth: input.originalBackgroundDepth,
      preserveOriginalSubject: input.preserveOriginalSubject,
      outputFormat: input.outputFormat,
      seed: input.seed
    });

    ctx.progress(`Job submitted. Generation ID: ${generationId}. Polling for result...`);

    let result = await client.pollAsyncResult(
      `/v2beta/stable-image/edit/replace-background-and-relight/result/${generationId}`
    );

    return {
      output: result,
      message: `Background replaced successfully. Generation ID: \`${generationId}\`, seed: \`${result.seed}\`. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
