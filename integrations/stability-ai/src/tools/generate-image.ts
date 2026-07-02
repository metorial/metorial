import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { stabilityServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  aspectRatioEnum,
  createMediaAttachment,
  imageOutputFormatEnum,
  mediaAttachmentOutputSchema,
  stylePresetEnum,
  toMediaAttachmentOutput
} from './shared';

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
    'CFG scale is only available with SD3.5 and must be between 1 and 10.'
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
      outputFormat: imageOutputFormatEnum,
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
        .min(1)
        .max(10)
        .optional()
        .describe('CFG scale for prompt adherence (1-10). Only used with SD3.5.')
    })
  )
  .output(mediaAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.model === 'core' && ctx.input.referenceImage) {
      throw stabilityServiceError(
        'referenceImage is only supported with Ultra and SD3.5 models.'
      );
    }

    if (ctx.input.strength !== undefined && !ctx.input.referenceImage) {
      throw stabilityServiceError('strength requires referenceImage.');
    }

    let result: any;
    if (ctx.input.model === 'ultra') {
      result = await client.generateImageUltra({
        prompt: ctx.input.prompt,
        negativePrompt: ctx.input.negativePrompt,
        aspectRatio: ctx.input.aspectRatio,
        seed: ctx.input.seed,
        outputFormat: ctx.input.outputFormat,
        image: ctx.input.referenceImage,
        strength: ctx.input.strength,
        stylePreset: ctx.input.stylePreset
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
        cfgScale: ctx.input.cfgScale,
        stylePreset: ctx.input.stylePreset
      });
    }

    return {
      output: toMediaAttachmentOutput(result),
      attachments: [createMediaAttachment(result)],
      message: `Generated image using **${ctx.input.model}** model. Attachment MIME: \`${result.mimeType}\`.`
    };
  })
  .build();
