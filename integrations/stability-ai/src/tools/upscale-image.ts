import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { stabilityServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  createMediaAttachment,
  imageOutputFormatEnum,
  mediaAttachmentOutputSchema,
  stylePresetEnum,
  toMediaAttachmentOutput
} from './shared';

export let upscaleImage = SlateTool.create(spec, {
  name: 'Upscale Image',
  key: 'upscale_image',
  description: `Enhance image resolution using Stability AI's upscaling models. Three modes available:
- **fast**: Quick 4x resolution increase without prompt guidance. Best for simple upscaling tasks.
- **conservative**: Upscales up to 4K while preserving details and minimizing alterations. Requires a descriptive prompt.
- **creative**: Significantly reinterprets and enhances images up to 4K resolution. Best for heavily degraded images. Accepts a creativity scale parameter. This is an async operation that may take longer.`,
  constraints: [
    'Fast upscale does not accept a prompt.',
    'Conservative upscale creativity range: 0.1–0.5.',
    'Creative upscale is asynchronous and may take up to 5 minutes to complete.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z.enum(['fast', 'conservative', 'creative']).describe('Upscaling mode.'),
      image: z.string().describe('Base64-encoded input image to upscale.'),
      prompt: z
        .string()
        .optional()
        .describe(
          'Descriptive text guiding the upscale. Required for conservative and creative modes.'
        ),
      negativePrompt: z
        .string()
        .optional()
        .describe('Text describing what to avoid. Used by conservative and creative modes.'),
      creativity: z
        .number()
        .min(0.1)
        .max(0.5)
        .optional()
        .describe(
          'Creativity level. Conservative requires 0.2-0.5; creative supports 0.1-0.5.'
        ),
      seed: z
        .number()
        .optional()
        .describe('Seed for reproducible results. Used by conservative and creative modes.'),
      stylePreset: stylePresetEnum,
      outputFormat: imageOutputFormatEnum
    })
  )
  .output(mediaAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.mode === 'fast') {
      let result = await client.upscaleFast({
        image: input.image,
        outputFormat: input.outputFormat
      });
      return {
        output: toMediaAttachmentOutput(result),
        attachments: [createMediaAttachment(result)],
        message: `Upscaled image using **fast** mode. Attachment MIME: \`${result.mimeType}\`.`
      };
    }

    if (!input.prompt)
      throw stabilityServiceError(
        'Prompt is required for conservative and creative upscale modes.'
      );

    if (input.mode === 'conservative') {
      if (input.creativity !== undefined && input.creativity < 0.2) {
        throw stabilityServiceError(
          'Conservative upscale creativity must be between 0.2 and 0.5.'
        );
      }

      let result = await client.upscaleConservative({
        image: input.image,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        outputFormat: input.outputFormat,
        seed: input.seed,
        creativity: input.creativity
      });
      return {
        output: toMediaAttachmentOutput(result),
        attachments: [createMediaAttachment(result)],
        message: `Upscaled image using **conservative** mode. Attachment MIME: \`${result.mimeType}\`.`
      };
    }

    // Creative upscale is async
    ctx.info('Starting creative upscale. This may take a few minutes...');
    let startResult = await client.upscaleCreative({
      image: input.image,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      outputFormat: input.outputFormat,
      seed: input.seed,
      creativity: input.creativity,
      stylePreset: input.stylePreset
    });

    return {
      output: toMediaAttachmentOutput(startResult),
      attachments: [createMediaAttachment(startResult)],
      message: `Upscaled image using **creative** mode. Attachment MIME: \`${startResult.mimeType}\`.`
    };
  })
  .build();
