import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let aspectRatioEnum = z
  .enum(['1:1', '16:9', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'])
  .optional()
  .describe('Aspect ratio of the generated image');

let outputFormatEnum = z
  .enum(['png', 'jpeg', 'webp'])
  .optional()
  .default('png')
  .describe('Output image format');

let stylePresetEnum = z
  .enum([
    '3d-model',
    'analog-film',
    'anime',
    'cinematic',
    'comic-book',
    'digital-art',
    'enhance',
    'fantasy-art',
    'isometric',
    'line-art',
    'low-poly',
    'modeling-compound',
    'neon-punk',
    'origami',
    'photographic',
    'pixel-art',
    'tile-texture'
  ])
  .optional()
  .describe('Visual style preset to guide the generation');

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using Stability AI's Stable Diffusion models. Supports multiple model tiers with different quality/speed tradeoffs:
- **Ultra**: Highest quality, 1MP output (8 credits)
- **Core**: Fast, high-quality, 1.5MP output with style presets (3 credits)
- **SD 3.5 Large**: Detailed generation, 1MP output (6.5 credits)
- **SD 3.5 Large Turbo**: Faster variant of Large (4 credits)
- **SD 3.5 Medium**: Balanced quality and speed (3.5 credits)`,
  instructions: [
    'Provide a detailed prompt for best results. The more descriptive, the better the output.',
    'Use negative prompts to exclude unwanted elements from the generated image.',
    'Turbo models do not support negative prompts.',
    'Style presets are only available with the Core model.'
  ],
  constraints: [
    'Rate limit: 150 requests per 10 seconds.',
    'Maximum prompt length: 10,000 characters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z.string().min(1).max(10000).describe('Text description of the desired image'),
      model: z
        .enum(['ultra', 'core', 'sd3.5-large', 'sd3.5-large-turbo', 'sd3.5-medium'])
        .default('core')
        .describe('Model to use for generation'),
      negativePrompt: z
        .string()
        .max(10000)
        .optional()
        .describe(
          'What to exclude from the generated image. Not supported with turbo models.'
        ),
      aspectRatio: aspectRatioEnum,
      seed: z
        .number()
        .int()
        .min(0)
        .max(4294967294)
        .optional()
        .describe('Seed for reproducible generation. 0 or omit for random.'),
      outputFormat: outputFormatEnum,
      stylePreset: stylePresetEnum
    })
  )
  .output(
    z.object({
      base64: z.string().describe('Base64-encoded image data'),
      seed: z.number().describe('Seed used for this generation'),
      finishReason: z
        .string()
        .describe('Generation finish reason (SUCCESS or CONTENT_FILTERED)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let result: { base64: string; seed: number; finishReason: string };

    if (input.model === 'ultra') {
      result = await client.generateImageUltra({
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        aspectRatio: input.aspectRatio,
        seed: input.seed,
        outputFormat: input.outputFormat
      });
    } else if (input.model === 'core') {
      result = await client.generateImageCore({
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        aspectRatio: input.aspectRatio,
        seed: input.seed,
        outputFormat: input.outputFormat,
        stylePreset: input.stylePreset
      });
    } else {
      result = await client.generateImageSd3({
        prompt: input.prompt,
        model: input.model,
        negativePrompt: input.negativePrompt,
        aspectRatio: input.aspectRatio,
        seed: input.seed,
        outputFormat: input.outputFormat
      });
    }

    return {
      output: result,
      message: `Generated image using **${input.model}** model with seed \`${result.seed}\`. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
