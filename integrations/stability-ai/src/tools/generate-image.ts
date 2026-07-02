import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let aspectRatioEnum = z
  .enum(['16:9', '1:1', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'])
  .optional()
  .describe('Aspect ratio of the generated image. Defaults to 1:1.');

let outputFormatEnum = z
  .enum(['png', 'jpeg', 'webp'])
  .optional()
  .describe('Output image format. Defaults to png.');

let stylePresetEnum = z
  .enum([
    'enhance',
    'anime',
    'photographic',
    'digital-art',
    'comic-book',
    'fantasy-art',
    'line-art',
    'analog-film',
    'neon-punk',
    'isometric',
    'low-poly',
    'origami',
    'modeling-compound',
    'cinematic',
    '3d-model',
    'pixel-art',
    'tile-texture'
  ])
  .optional()
  .describe('Visual style preset to apply.');

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from text prompts using Stability AI models. Supports three model tiers:
- **Ultra**: Top-tier quality powered by Stable Diffusion 3.5, excels at typography, complex compositions, and photorealism.
- **Core**: Fast, affordable generation with good quality. Supports style presets.
- **SD3.5**: Access to specific SD3.5 model variants with advanced controls like CFG scale.

Optionally provide a reference image for image-to-image generation (Ultra and SD3.5 only).`,
  constraints: [
    'Seed range: 0 to 4,294,967,294. Use 0 for random.',
    'Image-to-image is only supported with Ultra and SD3.5 models.',
    'Style presets are only available with the Core model.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe(
          'Text description of the desired image. Be descriptive about elements, colors, and subjects for best results.'
        ),
      model: z
        .enum(['ultra', 'core', 'sd3'])
        .default('ultra')
        .describe('Model tier to use for generation.'),
      negativePrompt: z
        .string()
        .optional()
        .describe(
          'Keywords describing what to exclude from the output. Max 10,000 characters.'
        ),
      aspectRatio: aspectRatioEnum,
      seed: z
        .number()
        .optional()
        .describe('Seed for reproducible results. Use 0 or omit for random.'),
      outputFormat: outputFormatEnum,
      stylePreset: stylePresetEnum,
      referenceImage: z
        .string()
        .optional()
        .describe(
          'Base64-encoded reference image for image-to-image generation (Ultra and SD3.5 only).'
        ),
      strength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Influence of the reference image (0.0 = identical to input, 1.0 = ignore input). Only used with a reference image.'
        ),
      sd3Model: z
        .enum(['sd3.5-large', 'sd3.5-large-turbo', 'sd3.5-medium'])
        .optional()
        .describe('Specific SD3.5 model variant. Only used when model is sd3.'),
      cfgScale: z
        .number()
        .min(0)
        .max(35)
        .optional()
        .describe('CFG scale for prompt adherence (0-35). Only used with SD3.5.')
    })
  )
  .output(
    z.object({
      base64Image: z.string().describe('Base64-encoded generated image.'),
      seed: z
        .number()
        .describe('Seed used for this generation. Save this to reproduce the same output.'),
      finishReason: z
        .string()
        .describe(
          'Reason generation finished. "SUCCESS" or "CONTENT_FILTERED" if flagged by safety systems.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: { base64Image: string; seed: number; finishReason: string };

    if (ctx.input.model === 'ultra') {
      result = await client.generateImageUltra({
        prompt: ctx.input.prompt,
        negativePrompt: ctx.input.negativePrompt,
        aspectRatio: ctx.input.aspectRatio,
        seed: ctx.input.seed,
        outputFormat: ctx.input.outputFormat,
        image: ctx.input.referenceImage,
        strength: ctx.input.strength
      });
    } else if (ctx.input.model === 'core') {
      result = await client.generateImageCore({
        prompt: ctx.input.prompt,
        negativePrompt: ctx.input.negativePrompt,
        aspectRatio: ctx.input.aspectRatio,
        seed: ctx.input.seed,
        outputFormat: ctx.input.outputFormat,
        stylePreset: ctx.input.stylePreset
      });
    } else {
      result = await client.generateImageSD3({
        prompt: ctx.input.prompt,
        negativePrompt: ctx.input.negativePrompt,
        aspectRatio: ctx.input.aspectRatio,
        seed: ctx.input.seed,
        outputFormat: ctx.input.outputFormat,
        model: ctx.input.sd3Model,
        image: ctx.input.referenceImage,
        strength: ctx.input.strength,
        cfgScale: ctx.input.cfgScale
      });
    }

    return {
      output: result,
      message: `Generated image using **${ctx.input.model}** model with seed **${result.seed}**. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
