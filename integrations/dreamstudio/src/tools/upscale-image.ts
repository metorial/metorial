import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upscaleImage = SlateTool.create(spec, {
  name: 'Upscale Image',
  key: 'upscale_image',
  description: `Increase image resolution using AI upscaling. Three modes available:
- **conservative**: Preserves original appearance, outputs up to 4MP. Requires a prompt. (25 credits)
- **creative**: For heavily degraded images (<1MP), creatively enhances to high-res. Async operation. (25 credits)
- **fast**: Quick 4x resolution increase in ~1 second. No prompt needed. (Fewer credits)`,
  instructions: [
    'Use "fast" for quick, no-fuss upscaling of compressed images.',
    'Use "conservative" when you want to preserve the original look at higher resolution.',
    'Use "creative" for very low-resolution or degraded images that need AI-powered enhancement.',
    'Creative upscale is async and may take up to a few minutes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z.enum(['conservative', 'creative', 'fast']).describe('Upscaling mode'),
      image: z.string().describe('Base64-encoded image to upscale'),
      prompt: z
        .string()
        .optional()
        .describe(
          'Describes the desired upscaled output. Required for conservative and creative modes.'
        ),
      negativePrompt: z
        .string()
        .optional()
        .describe('What to exclude. For conservative and creative modes.'),
      creativity: z
        .number()
        .optional()
        .describe('Creative freedom level. Conservative: 0.2-0.5, Creative: 0-0.35.'),
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
      base64: z.string().describe('Base64-encoded upscaled image'),
      seed: z.number().describe('Seed used for this operation'),
      finishReason: z.string().describe('Finish reason (SUCCESS or CONTENT_FILTERED)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let result: { base64: string; seed: number; finishReason: string };

    switch (input.mode) {
      case 'conservative':
        result = await client.upscaleConservative({
          image: input.image,
          prompt: input.prompt!,
          negativePrompt: input.negativePrompt,
          creativity: input.creativity,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'creative': {
        ctx.progress('Submitting creative upscale job...');

        let { generationId } = await client.upscaleCreativeSubmit({
          image: input.image,
          prompt: input.prompt!,
          negativePrompt: input.negativePrompt,
          creativity: input.creativity,
          seed: input.seed,
          outputFormat: input.outputFormat
        });

        ctx.progress(`Job submitted. Generation ID: ${generationId}. Polling for result...`);

        result = await client.pollAsyncResult(
          `/v2beta/stable-image/upscale/creative/result/${generationId}`
        );
        break;
      }

      case 'fast':
        result = await client.upscaleFast({
          image: input.image,
          outputFormat: input.outputFormat
        });
        break;

      default:
        throw new Error(`Unknown upscale mode: ${input.mode}`);
    }

    return {
      output: result,
      message: `Upscaled image using **${input.mode}** mode with seed \`${result.seed}\`. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
