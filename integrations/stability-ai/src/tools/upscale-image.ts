import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
        .describe('Creativity level for conservative/creative upscale.'),
      seed: z
        .number()
        .optional()
        .describe('Seed for reproducible results. Used by conservative and creative modes.'),
      outputFormat: z.enum(['png', 'jpeg', 'webp']).optional().describe('Output image format.')
    })
  )
  .output(
    z.object({
      base64Image: z.string().describe('Base64-encoded upscaled image.'),
      seed: z.number().optional().describe('Seed used for this upscale.'),
      finishReason: z.string().describe('Reason the operation finished.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.mode === 'fast') {
      let result = await client.upscaleFast({
        image: input.image,
        outputFormat: input.outputFormat
      });
      return {
        output: {
          base64Image: result.base64Image,
          finishReason: result.finishReason
        },
        message: `Upscaled image using **fast** mode. Finish reason: ${result.finishReason}.`
      };
    }

    if (!input.prompt)
      throw new Error('Prompt is required for conservative and creative upscale modes.');

    if (input.mode === 'conservative') {
      let result = await client.upscaleConservative({
        image: input.image,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        outputFormat: input.outputFormat,
        seed: input.seed,
        creativity: input.creativity
      });
      return {
        output: {
          base64Image: result.base64Image,
          seed: result.seed,
          finishReason: result.finishReason
        },
        message: `Upscaled image using **conservative** mode with seed **${result.seed}**. Finish reason: ${result.finishReason}.`
      };
    }

    // Creative upscale is async
    ctx.info('Starting creative upscale. This may take a few minutes...');
    let startResult = await client.upscaleCreativeStart({
      image: input.image,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      outputFormat: input.outputFormat,
      seed: input.seed,
      creativity: input.creativity
    });

    ctx.info(
      `Creative upscale started with generation ID: ${startResult.generationId}. Polling for results...`
    );
    let result = await client.pollAsyncResult(startResult.generationId);

    return {
      output: {
        base64Image: result.base64Image,
        seed: result.seed,
        finishReason: result.finishReason
      },
      message: `Upscaled image using **creative** mode with seed **${result.seed}**. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
