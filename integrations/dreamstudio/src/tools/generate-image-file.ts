import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  aspectRatioSchema,
  imageFile,
  imageFileOutputSchema,
  outputFormatSchema,
  seedSchema,
  stylePresetSchema
} from '../lib/files';
import { spec } from '../spec';

export let generateImageFile = SlateTool.create(spec, {
  name: 'Generate Image File',
  key: 'generate_image_file',
  description:
    'Generate a downloadable image from text with Stable Image Core, Ultra, or Stable Diffusion 3.5. Ultra and SD 3.5 also support image-to-image generation.',
  instructions: [
    'Provide image and strength together to use image-to-image; Core supports only text-to-image.',
    'For SD 3.5 image-to-image, omit aspectRatio because the source image sets the composition.',
    'Generation consumes account credits. Use get_account to check your balance.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      prompt: z.string().min(1).max(10000).describe('Description of the desired image'),
      model: z
        .enum([
          'ultra',
          'core',
          'sd3.5-large',
          'sd3.5-large-turbo',
          'sd3.5-medium',
          'sd3.5-flash'
        ])
        .default('core'),
      image: z
        .string()
        .optional()
        .describe('Base64-encoded PNG, JPEG, or WebP starting image; Ultra and SD 3.5 only'),
      strength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Required with image; 0 preserves the source and 1 reimagines it'),
      negativePrompt: z
        .string()
        .max(10000)
        .optional()
        .describe('Content to exclude from the image'),
      aspectRatio: aspectRatioSchema
        .optional()
        .describe('Output aspect ratio; omit for SD 3.5 image-to-image'),
      cfgScale: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Prompt adherence; SD 3.5 models only'),
      seed: seedSchema,
      outputFormat: outputFormatSchema,
      stylePreset: stylePresetSchema
    })
  )
  .output(imageFileOutputSchema)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if ((input.image === undefined) !== (input.strength === undefined))
      throw createApiServiceError(
        'Provide image and strength together for image-to-image generation.'
      );
    if (input.model === 'core' && input.image !== undefined)
      throw createApiServiceError(
        'Core supports text-to-image only. Select Ultra or an SD 3.5 model.'
      );
    if ((input.model === 'core' || input.model === 'ultra') && input.cfgScale !== undefined)
      throw createApiServiceError('cfgScale is supported only by SD 3.5 models.');
    if (
      input.model.startsWith('sd3.5-') &&
      input.image !== undefined &&
      input.aspectRatio !== undefined
    )
      throw createApiServiceError('Omit aspectRatio for SD 3.5 image-to-image generation.');
    let client = new Client(ctx.auth.token);
    let result =
      input.model === 'core'
        ? await client.generateImageCore(input)
        : input.model === 'ultra'
          ? await client.generateImageUltra(input)
          : await client.generateImageSd3({
              ...input,
              mode: input.image ? 'image-to-image' : 'text-to-image'
            });
    let file = imageFile(result, 'generated-image');
    await ctx.addAttachment({
      type: 'content',
      content: file.content,
      filename: file.output.fileName
    });
    return {
      output: file.output,
      message: `Generated a downloadable image with ${input.model}. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
