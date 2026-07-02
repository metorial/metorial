import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editImage = SlateTool.create(spec, {
  name: 'Edit Image',
  key: 'edit_image',
  description: `Edit images using Stability AI's suite of editing tools. Supports multiple operations:
- **erase**: Remove unwanted elements using a mask.
- **inpaint**: Fill or replace masked areas with new content based on a prompt.
- **outpaint**: Extend image boundaries in any direction while maintaining visual consistency.
- **search_and_replace**: Swap objects by describing what to find and what to replace it with (no mask needed).
- **search_and_recolor**: Change colors of specific objects described in plain language (no mask needed).
- **remove_background**: Remove the background from an image, leaving the subject on a transparent background.`,
  instructions: [
    'For erase: provide a mask image where white areas indicate regions to erase.',
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
          'Text prompt describing the desired edit result. Required for inpaint, search_and_replace, and search_and_recolor.'
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
      outputFormat: z.enum(['png', 'jpeg', 'webp']).optional().describe('Output image format.')
    })
  )
  .output(
    z.object({
      base64Image: z.string().describe('Base64-encoded edited image.'),
      seed: z.number().optional().describe('Seed used for this edit.'),
      finishReason: z.string().describe('Reason the operation finished.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result: { base64Image: string; seed?: number; finishReason: string };

    switch (input.operation) {
      case 'erase':
        result = await client.eraseImage({
          image: input.image,
          mask: input.mask,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'inpaint':
        if (!input.prompt) throw new Error('Prompt is required for inpaint operation.');
        result = await client.inpaintImage({
          image: input.image,
          prompt: input.prompt,
          mask: input.mask,
          negativePrompt: input.negativePrompt,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'outpaint':
        result = await client.outpaintImage({
          image: input.image,
          prompt: input.prompt,
          left: input.left,
          right: input.right,
          up: input.up,
          down: input.down,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'search_and_replace':
        if (!input.prompt)
          throw new Error('Prompt is required for search_and_replace operation.');
        if (!input.searchPrompt)
          throw new Error('searchPrompt is required for search_and_replace operation.');
        result = await client.searchAndReplace({
          image: input.image,
          prompt: input.prompt,
          searchPrompt: input.searchPrompt,
          negativePrompt: input.negativePrompt,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'search_and_recolor':
        if (!input.prompt)
          throw new Error('Prompt is required for search_and_recolor operation.');
        if (!input.selectPrompt)
          throw new Error('selectPrompt is required for search_and_recolor operation.');
        result = await client.searchAndRecolor({
          image: input.image,
          prompt: input.prompt,
          selectPrompt: input.selectPrompt,
          negativePrompt: input.negativePrompt,
          outputFormat: input.outputFormat,
          seed: input.seed
        });
        break;

      case 'remove_background':
        result = await client.removeBackground({
          image: input.image,
          outputFormat: input.outputFormat
        });
        break;
    }

    return {
      output: {
        base64Image: result.base64Image,
        seed: 'seed' in result ? result.seed : undefined,
        finishReason: result.finishReason
      },
      message: `Completed **${input.operation}** edit operation. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
