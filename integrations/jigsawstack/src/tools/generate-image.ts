import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using AI. Returns a URL to the generated image. Supports various aspect ratios, custom dimensions, and output formats (PNG, SVG). Advanced options include negative prompts, guidance scale, and seed for reproducibility.`,
  constraints: [
    'Prompt must be 1-5000 characters.',
    'Width and height range: 256-1920 pixels.',
    'Steps range: 1-90 (higher values improve quality but take longer).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe('Text description of the image to generate (1-5000 characters)'),
      aspectRatio: z
        .enum([
          '1:1',
          '16:9',
          '21:9',
          '3:2',
          '2:3',
          '4:5',
          '5:4',
          '3:4',
          '4:3',
          '9:16',
          '9:21'
        ])
        .optional()
        .describe('Aspect ratio (default: "1:1")'),
      width: z.number().optional().describe('Image width in pixels (256-1920)'),
      height: z.number().optional().describe('Image height in pixels (256-1920)'),
      steps: z
        .number()
        .optional()
        .describe('Number of inference steps (1-90, default: 4). Higher = better quality.'),
      outputFormat: z
        .enum(['png', 'svg'])
        .optional()
        .describe('Output format (default: "png")'),
      negativePrompt: z.string().optional().describe('What to avoid in the generated image'),
      guidance: z.number().optional().describe('How closely to follow the prompt (1-28)'),
      seed: z.number().optional().describe('Seed for reproducible results')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      imageUrl: z.string().describe('URL to the generated image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let advanceConfig =
      ctx.input.negativePrompt || ctx.input.guidance || ctx.input.seed
        ? {
            negativePompt: ctx.input.negativePrompt,
            guidance: ctx.input.guidance,
            seed: ctx.input.seed
          }
        : undefined;

    let result = await client.generateImage({
      prompt: ctx.input.prompt,
      aspectRatio: ctx.input.aspectRatio,
      width: ctx.input.width,
      height: ctx.input.height,
      steps: ctx.input.steps,
      outputFormat: ctx.input.outputFormat,
      advanceConfig
    });

    return {
      output: {
        success: result.success,
        imageUrl: result.url
      },
      message: `Generated image from prompt. Image URL: ${result.url}`
    };
  })
  .build();
