import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editImage = SlateTool.create(spec, {
  name: 'Edit Image',
  key: 'edit_image',
  description: `Edit images using various AI-powered tools. Supports multiple editing operations:
- **inpaint**: Replace specific masked areas with new content
- **erase**: Remove unwanted elements using a mask
- **outpaint**: Extend the image beyond its boundaries
- **search_and_replace**: Find an object by text and replace it (no mask needed)
- **search_and_recolor**: Change colors of specific objects via text prompts
- **remove_background**: Segment the foreground and remove the background`,
  instructions: [
    'For inpaint and erase, provide a mask image (base64) where white areas indicate regions to edit and black areas are preserved.',
    'For outpaint, at least one direction (left, right, up, down) must have a non-zero pixel value.',
    'For search_and_replace, provide both a searchPrompt (what to find) and prompt (what to replace it with).',
    'For search_and_recolor, provide both a selectPrompt (what to find) and prompt (desired color/appearance).'
  ],
  constraints: [
    'Image dimensions: each side must be at least 64px, total pixel count must not exceed 9,437,184.',
    'Aspect ratio must be between 1:2.5 and 2.5:1.',
    'Supported input formats: JPEG, PNG, WebP.'
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
          'inpaint',
          'erase',
          'outpaint',
          'search_and_replace',
          'search_and_recolor',
          'remove_background'
        ])
        .describe('The editing operation to perform'),
      image: z.string().describe('Base64-encoded input image'),
      prompt: z
        .string()
        .max(10000)
        .optional()
        .describe(
          'Describes desired content. Required for inpaint, search_and_replace, and search_and_recolor.'
        ),
      negativePrompt: z
        .string()
        .max(10000)
        .optional()
        .describe('What to exclude from the result'),
      mask: z
        .string()
        .optional()
        .describe(
          'Base64-encoded mask image (white=edit, black=keep). Used for inpaint and erase.'
        ),
      growMask: z
        .number()
        .int()
        .min(0)
        .max(20)
        .optional()
        .describe('Expand mask edges by N pixels with blur. For inpaint only.'),
      searchPrompt: z
        .string()
        .max(10000)
        .optional()
        .describe(
          'Text description of the object to find and replace. Required for search_and_replace.'
        ),
      selectPrompt: z
        .string()
        .max(10000)
        .optional()
        .describe(
          'Text description of the object to recolor. Required for search_and_recolor.'
        ),
      left: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Pixels to extend leftward. For outpaint only.'),
      right: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Pixels to extend rightward. For outpaint only.'),
      up: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Pixels to extend upward. For outpaint only.'),
      down: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Pixels to extend downward. For outpaint only.'),
      creativity: z
        .number()
        .min(0.1)
        .max(1.0)
        .optional()
        .describe('How creative the outpaint should be (0.1-1.0). For outpaint only.'),
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

    let result: { base64: string; seed: number; finishReason: string };

    switch (input.operation) {
      case 'inpaint':
        result = await client.inpaint({
          image: input.image,
          prompt: input.prompt!,
          mask: input.mask,
          negativePrompt: input.negativePrompt,
          growMask: input.growMask,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'erase':
        result = await client.erase({
          image: input.image,
          mask: input.mask,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'outpaint':
        result = await client.outpaint({
          image: input.image,
          left: input.left,
          right: input.right,
          up: input.up,
          down: input.down,
          prompt: input.prompt,
          creativity: input.creativity,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'search_and_replace':
        result = await client.searchAndReplace({
          image: input.image,
          prompt: input.prompt!,
          searchPrompt: input.searchPrompt!,
          negativePrompt: input.negativePrompt,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'search_and_recolor':
        result = await client.searchAndRecolor({
          image: input.image,
          prompt: input.prompt!,
          selectPrompt: input.selectPrompt!,
          negativePrompt: input.negativePrompt,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'remove_background':
        result = await client.removeBackground({
          image: input.image,
          outputFormat: input.outputFormat === 'jpeg' ? 'png' : input.outputFormat
        });
        break;

      default:
        throw new Error(`Unknown edit operation: ${input.operation}`);
    }

    return {
      output: result,
      message: `Performed **${input.operation}** edit operation with seed \`${result.seed}\`. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
