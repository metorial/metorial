import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaDesignClient } from '../lib/client';
import { spec } from '../spec';

export let generateImageTool = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate AI images from text prompts using Astica's image generation API. Creates realistic photographs and creative images at 1024x1024 resolution.
Supports quality settings, negative prompts to exclude unwanted elements, reproducible generation via seed values, and content moderation filtering.`,
  instructions: [
    'Provide a descriptive prompt (max 350 characters) specifying the desired style, colors, and subject.',
    'Use negativePrompt to exclude unwanted elements from the generated image.',
    'Set a whole-number seed value for reproducible image generation.',
    'Low-priority requests may return a URL to check for results instead of a completed image.'
  ],
  constraints: [
    'Prompt and negative prompt are limited to 350 characters each.',
    'All images are generated at 1024x1024 resolution.',
    'Higher quality settings increase generation time.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe('Text description of the image to generate (max 350 characters)'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Elements to exclude from the generated image (max 350 characters)'),
      modelVersion: z
        .enum(['1.0_full', '2.0_full'])
        .optional()
        .describe('Model version. Defaults to 2.0_full.'),
      quality: z
        .enum(['faster', 'fast', 'standard', 'high'])
        .optional()
        .describe('Output quality level. Higher quality takes longer. Defaults to standard.'),
      lossless: z
        .boolean()
        .optional()
        .describe('If true, output as PNG; otherwise JPG. Defaults to false (JPG).'),
      seed: z
        .number()
        .optional()
        .describe('Seed for reproducible generation. Use 0 for random.'),
      moderate: z
        .boolean()
        .optional()
        .describe('Enable content safety filter. Defaults to true.'),
      lowPriority: z
        .boolean()
        .optional()
        .describe('Use low-priority mode for lower cost. Results may be delayed.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      imageUrl: z.string().describe('URL to the generated image'),
      quality: z.string().optional().describe('Quality setting used'),
      lossless: z.number().optional().describe('Whether lossless (PNG) output was used'),
      seed: z.number().optional().describe('Seed value used for generation')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.prompt.trim() || ctx.input.prompt.length > 350) {
      throw createApiServiceError(
        'Provide a non-empty image prompt of at most 350 characters.'
      );
    }
    if (ctx.input.negativePrompt && ctx.input.negativePrompt.length > 350) {
      throw createApiServiceError('The negative image prompt must be at most 350 characters.');
    }
    if (ctx.input.seed !== undefined && !Number.isInteger(ctx.input.seed)) {
      throw createApiServiceError('The image generation seed must be a whole number.');
    }
    let client = new AsticaDesignClient(ctx.auth.token);

    ctx.info(`Generating image with prompt: "${ctx.input.prompt.substring(0, 80)}..."`);

    let result = await client.generateImage({
      prompt: ctx.input.prompt,
      negativePrompt: ctx.input.negativePrompt,
      modelVersion: ctx.input.modelVersion,
      quality: ctx.input.quality,
      lossless: ctx.input.lossless ? 1 : 0,
      seed: ctx.input.seed,
      moderate: ctx.input.moderate === false ? 0 : 1,
      lowPriority: ctx.input.lowPriority ? 1 : 0
    });

    let imageUrl = result.output || '';
    let completed = result.status === 'success' && !ctx.input.lowPriority;
    if (completed) {
      if (
        typeof imageUrl !== 'string' ||
        !URL.canParse(imageUrl) ||
        !['https:', 'http:'].includes(new URL(imageUrl).protocol)
      ) {
        throw createApiServiceError(
          'Astica completed image generation without returning a valid image URL.'
        );
      }
      await ctx.addAttachment({
        type: 'url',
        url: imageUrl,
        mimeType:
          (result.generate_lossless ?? (ctx.input.lossless ? 1 : 0)) === 1
            ? 'image/png'
            : 'image/jpeg'
      });
    }

    return {
      output: {
        status: result.status || 'unknown',
        imageUrl,
        quality: result.generate_quality,
        lossless: result.generate_lossless,
        seed: result.seed
      },
      message: completed
        ? `Image generated successfully. [View image](${imageUrl})`
        : `${ctx.input.lowPriority ? 'Low-priority image generation submitted.' : 'Image generation submitted.'} Status: ${result.status || 'unknown'}.${imageUrl ? ` Check results at ${imageUrl}.` : ''}`
    };
  })
  .build();
