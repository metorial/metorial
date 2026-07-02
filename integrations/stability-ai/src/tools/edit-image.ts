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

export let editImage = SlateTool.create(spec, {
  name: 'Edit Image',
  key: 'edit_image',
  description: `Edit images using Stability AI's suite of editing tools. Supports multiple operations:
- **erase**: Remove unwanted elements using a prompt and optional mask.
- **inpaint**: Fill or replace masked areas with new content based on a prompt.
- **outpaint**: Extend image boundaries in any direction while maintaining visual consistency.
- **search_and_replace**: Swap objects by describing what to find and what to replace it with (no mask needed).
- **search_and_recolor**: Change colors of specific objects described in plain language (no mask needed).
- **remove_background**: Remove the background from an image, leaving the subject on a transparent background.`,
  instructions: [
    'For erase: provide prompt and optionally a mask image where white areas indicate regions to erase.',
    'For inpaint: provide a mask where transparent/white areas will be filled. If no mask, the image alpha channel is used.',
    'For outpaint: specify at least one direction (left, right, up, down) with a positive pixel value.',
    'For search_and_replace: use searchPrompt to describe what to find, and prompt to describe the replacement.',
    'For search_and_recolor: use selectPrompt to describe the object, and prompt to describe the new color.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'erase',
          'inpaint',
          'outpaint',
          'search_and_replace',
          'search_and_recolor',
          'remove_background'
        ])
        .describe('The editing operation to perform.'),
      image: z.string().describe('Base64-encoded input image to edit.'),
      prompt: z
        .string()
        .optional()
        .describe(
          'Text prompt describing the desired edit result. Required for erase, inpaint, search_and_replace, and search_and_recolor; optional for outpaint.'
        ),
      negativePrompt: z
        .string()
        .optional()
        .describe('Text describing what to avoid in the edited result.'),
      mask: z
        .string()
        .optional()
        .describe(
          'Base64-encoded mask image. White/transparent areas indicate regions to edit. Used by erase and inpaint.'
        ),
      searchPrompt: z
        .string()
        .optional()
        .describe(
          'Text describing the object to find and replace. Required for search_and_replace.'
        ),
      selectPrompt: z
        .string()
        .optional()
        .describe(
          'Text describing the object to find and recolor. Required for search_and_recolor.'
        ),
      left: z
        .number()
        .min(0)
        .optional()
        .describe('Pixels to extend to the left. Used by outpaint.'),
      right: z
        .number()
        .min(0)
        .optional()
        .describe('Pixels to extend to the right. Used by outpaint.'),
      up: z.number().min(0).optional().describe('Pixels to extend upward. Used by outpaint.'),
      down: z
        .number()
        .min(0)
        .optional()
        .describe('Pixels to extend downward. Used by outpaint.'),
      seed: z.number().optional().describe('Seed for reproducible results.'),
      growMask: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe(
          'Pixels to grow the generated mask. Used by erase, inpaint, search_and_replace, and search_and_recolor.'
        ),
      creativity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Creative freedom for outpaint.'),
      stylePreset: stylePresetEnum,
      outputFormat: imageOutputFormatEnum
    })
  )
  .output(mediaAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result: any;

    switch (input.operation) {
      case 'erase':
        if (!input.prompt)
          throw stabilityServiceError('Prompt is required for erase operation.');
        result = await client.eraseImage({
          image: input.image,
          prompt: input.prompt,
          mask: input.mask,
          growMask: input.growMask,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'inpaint':
        if (!input.prompt)
          throw stabilityServiceError('Prompt is required for inpaint operation.');
        result = await client.inpaintImage({
          image: input.image,
          prompt: input.prompt,
          mask: input.mask,
          negativePrompt: input.negativePrompt,
          growMask: input.growMask,
          stylePreset: input.stylePreset,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'outpaint':
        if (
          (input.left ?? 0) === 0 &&
          (input.right ?? 0) === 0 &&
          (input.up ?? 0) === 0 &&
          (input.down ?? 0) === 0
        ) {
          throw stabilityServiceError(
            'At least one of left, right, up, or down must be greater than 0 for outpaint operation.'
          );
        }
        result = await client.outpaintImage({
          image: input.image,
          prompt: input.prompt,
          left: input.left,
          right: input.right,
          up: input.up,
          down: input.down,
          creativity: input.creativity,
          stylePreset: input.stylePreset,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'search_and_replace':
        if (!input.prompt)
          throw stabilityServiceError('Prompt is required for search_and_replace operation.');
        if (!input.searchPrompt)
          throw stabilityServiceError(
            'searchPrompt is required for search_and_replace operation.'
          );
        result = await client.searchAndReplace({
          image: input.image,
          prompt: input.prompt,
          searchPrompt: input.searchPrompt,
          negativePrompt: input.negativePrompt,
          growMask: input.growMask,
          stylePreset: input.stylePreset,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'search_and_recolor':
        if (!input.prompt)
          throw stabilityServiceError('Prompt is required for search_and_recolor operation.');
        if (!input.selectPrompt)
          throw stabilityServiceError(
            'selectPrompt is required for search_and_recolor operation.'
          );
        result = await client.searchAndRecolor({
          image: input.image,
          prompt: input.prompt,
          selectPrompt: input.selectPrompt,
          negativePrompt: input.negativePrompt,
          growMask: input.growMask,
          stylePreset: input.stylePreset,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'remove_background':
        if (input.outputFormat === 'jpeg') {
          throw stabilityServiceError(
            'remove_background only supports png or webp outputFormat.'
          );
        }
        result = await client.removeBackground({
          image: input.image,
          outputFormat: input.outputFormat
        });
        break;
    }

    return {
      output: toMediaAttachmentOutput(result),
      attachments: [createMediaAttachment(result)],
      message: `Completed **${input.operation}** edit operation. Attachment MIME: \`${result.mimeType}\`.`
    };
  })
  .build();
