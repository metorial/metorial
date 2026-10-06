import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ImageResult } from '../lib/client';
import {
  generationDownload,
  imageFile,
  imageFileOutputSchema,
  outputFormatSchema,
  seedSchema
} from '../lib/files';
import { spec } from '../spec';

export let transformImage = SlateTool.create(spec, {
  name: 'Transform Image',
  key: 'transform_image',
  description:
    'Create a downloadable image using AI editing, background removal or relighting, upscaling, or sketch, structure, and style guidance.',
  instructions: [
    'Inpaint and erase need a mask or an input image with transparent regions. White mask pixels are edited; black pixels are preserved.',
    'Background replacement and creative upscale are asynchronous. Set waitForResult=false to return a job ID immediately, then use get_generation_result.',
    'Asynchronous provider results expire after 24 hours. Generation consumes credits.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      operation: z.enum([
        'inpaint',
        'erase',
        'outpaint',
        'search_and_replace',
        'search_and_recolor',
        'remove_background',
        'replace_background',
        'upscale_fast',
        'upscale_conservative',
        'upscale_creative',
        'control_sketch',
        'control_structure',
        'control_style'
      ]),
      image: z
        .string()
        .describe(
          'Base64-encoded PNG, JPEG, or WebP image; the subject image for background replacement'
        ),
      prompt: z
        .string()
        .max(10000)
        .optional()
        .describe(
          'Required for inpaint, search operations, conservative/creative upscale, and control; optional for outpaint'
        ),
      negativePrompt: z
        .string()
        .max(10000)
        .optional()
        .describe(
          'Exclusions for inpaint, search operations, conservative/creative upscale, control, and background replacement'
        ),
      mask: z
        .string()
        .optional()
        .describe(
          'Base64-encoded PNG, JPEG, or WebP mask for inpaint or erase; otherwise the source alpha channel is used'
        ),
      growMask: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe('Mask expansion in pixels for inpaint'),
      searchPrompt: z
        .string()
        .max(10000)
        .optional()
        .describe('Required object description for search_and_replace'),
      selectPrompt: z
        .string()
        .max(10000)
        .optional()
        .describe('Required object description for search_and_recolor'),
      left: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Outpaint extension to the left in pixels'),
      right: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Outpaint extension to the right in pixels'),
      up: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Outpaint extension upward in pixels'),
      down: z
        .number()
        .int()
        .min(0)
        .max(2000)
        .optional()
        .describe('Outpaint extension downward in pixels'),
      creativity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Outpaint: 0–1; conservative upscale: 0.2–0.5; creative upscale: 0.1–0.5'),
      controlStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Reference influence for control_sketch and control_structure'),
      fidelity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Style resemblance for control_style'),
      backgroundPrompt: z
        .string()
        .max(10000)
        .optional()
        .describe(
          'New background description for replace_background; provide this or backgroundReference'
        ),
      backgroundReference: z
        .string()
        .optional()
        .describe('Base64-encoded background reference for replace_background'),
      foregroundPrompt: z
        .string()
        .max(10000)
        .optional()
        .describe('Subject description for replace_background'),
      lightSourceDirection: z
        .enum(['above', 'below', 'left', 'right'])
        .optional()
        .describe('Lighting direction for replace_background'),
      lightSourceStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Lighting intensity for replace_background; requires lightSourceDirection or lightReference'
        ),
      lightReference: z
        .string()
        .optional()
        .describe('Base64-encoded lighting reference for replace_background'),
      keepOriginalBackground: z
        .boolean()
        .optional()
        .describe('Retain the source background while relighting'),
      originalBackgroundDepth: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Preserve source background depth for replace_background'),
      preserveOriginalSubject: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Preserve source subject pixels for replace_background'),
      seed: seedSchema.describe(
        'Randomness seed; unavailable for remove_background or upscale_fast'
      ),
      outputFormat: outputFormatSchema,
      waitForResult: z
        .boolean()
        .default(true)
        .describe(
          'Wait up to five minutes for creative upscale or background replacement; false returns the job ID immediately'
        )
    })
  )
  .output(imageFileOutputSchema)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let prompt = input.prompt ?? '';
    let promptedOperations = [
      'inpaint',
      'search_and_replace',
      'search_and_recolor',
      'upscale_conservative',
      'upscale_creative',
      'control_sketch',
      'control_structure',
      'control_style'
    ];
    if (promptedOperations.includes(input.operation) && !prompt.trim())
      throw createApiServiceError(`prompt is required for ${input.operation}.`);
    if (input.operation === 'search_and_replace' && !input.searchPrompt?.trim())
      throw createApiServiceError('searchPrompt is required for search_and_replace.');
    if (input.operation === 'search_and_recolor' && !input.selectPrompt?.trim())
      throw createApiServiceError('selectPrompt is required for search_and_recolor.');
    if (
      input.operation === 'outpaint' &&
      ![input.left, input.right, input.up, input.down].some(value => (value ?? 0) > 0)
    )
      throw createApiServiceError('Outpaint requires at least one positive direction.');
    if (input.operation === 'remove_background' && input.outputFormat === 'jpeg')
      throw createApiServiceError(
        'Background removal requires PNG or WebP output to preserve transparency.'
      );
    if (input.operation === 'control_style' && input.controlStrength !== undefined)
      throw createApiServiceError(
        'Use fidelity for control_style. controlStrength applies to sketch or structure.'
      );
    if (input.operation !== 'control_style' && input.fidelity !== undefined)
      throw createApiServiceError('fidelity applies only to control_style.');
    let branchFields: Record<string, string[]> = {
      prompt: [...promptedOperations, 'outpaint'],
      negativePrompt: [...promptedOperations, 'replace_background'],
      mask: ['inpaint', 'erase'],
      growMask: ['inpaint'],
      searchPrompt: ['search_and_replace'],
      selectPrompt: ['search_and_recolor'],
      left: ['outpaint'],
      right: ['outpaint'],
      up: ['outpaint'],
      down: ['outpaint'],
      creativity: ['outpaint', 'upscale_conservative', 'upscale_creative'],
      controlStrength: ['control_sketch', 'control_structure'],
      backgroundPrompt: ['replace_background'],
      backgroundReference: ['replace_background'],
      foregroundPrompt: ['replace_background'],
      lightSourceDirection: ['replace_background'],
      lightSourceStrength: ['replace_background'],
      lightReference: ['replace_background'],
      keepOriginalBackground: ['replace_background'],
      originalBackgroundDepth: ['replace_background'],
      preserveOriginalSubject: ['replace_background']
    };
    for (let [field, value] of Object.entries(input)) {
      let operations = branchFields[field];
      if (value !== undefined && operations && !operations.includes(input.operation))
        throw createApiServiceError(`${field} is not supported for ${input.operation}.`);
    }
    if (
      input.seed !== undefined &&
      ['remove_background', 'upscale_fast'].includes(input.operation)
    )
      throw createApiServiceError(`seed is not supported for ${input.operation}.`);
    if (
      !input.waitForResult &&
      !['replace_background', 'upscale_creative'].includes(input.operation)
    )
      throw createApiServiceError(
        'waitForResult=false applies only to background replacement or creative upscale.'
      );
    if (input.operation === 'replace_background') {
      if (!input.backgroundPrompt?.trim() && !input.backgroundReference)
        throw createApiServiceError(
          'Provide backgroundPrompt or backgroundReference for replace_background.'
        );
      if (
        input.lightSourceStrength !== undefined &&
        !input.lightReference &&
        !input.lightSourceDirection
      )
        throw createApiServiceError(
          'lightSourceStrength requires lightReference or lightSourceDirection.'
        );
    }
    let client = new Client(ctx.auth.token);
    let result: ImageResult;
    let generationId: string | undefined;
    let common = { image: input.image, seed: input.seed, outputFormat: input.outputFormat };
    let prompted = { ...common, prompt, negativePrompt: input.negativePrompt };
    switch (input.operation) {
      case 'inpaint':
        result = await client.inpaint({
          ...prompted,
          mask: input.mask,
          growMask: input.growMask
        });
        break;
      case 'erase':
        result = await client.erase({ ...common, mask: input.mask });
        break;
      case 'outpaint':
        result = await client.outpaint({
          ...common,
          prompt: input.prompt,
          left: input.left,
          right: input.right,
          up: input.up,
          down: input.down,
          creativity: input.creativity
        });
        break;
      case 'search_and_replace':
        result = await client.searchAndReplace({
          ...prompted,
          searchPrompt: input.searchPrompt ?? ''
        });
        break;
      case 'search_and_recolor':
        result = await client.searchAndRecolor({
          ...prompted,
          selectPrompt: input.selectPrompt ?? ''
        });
        break;
      case 'remove_background':
        result = await client.removeBackground(common);
        break;
      case 'upscale_fast':
        result = await client.upscaleFast(common);
        break;
      case 'upscale_conservative':
        result = await client.upscaleConservative({
          ...prompted,
          creativity: input.creativity
        });
        break;
      case 'control_sketch':
        result = await client.controlSketch({
          ...prompted,
          controlStrength: input.controlStrength
        });
        break;
      case 'control_structure':
        result = await client.controlStructure({
          ...prompted,
          controlStrength: input.controlStrength
        });
        break;
      case 'control_style':
        result = await client.controlStyle({ ...prompted, controlStrength: input.fidelity });
        break;
      case 'upscale_creative':
      case 'replace_background': {
        let job =
          input.operation === 'upscale_creative'
            ? await client.upscaleCreativeSubmit({ ...prompted, creativity: input.creativity })
            : await client.replaceBackgroundAndRelight({
                ...input,
                subjectImage: input.image
              });
        generationId = job.generationId;
        ctx.progress(`Submitted image job ${generationId}.`);
        let completed = input.waitForResult
          ? await client.waitForGeneration(generationId)
          : { status: 'in-progress' as const };
        if (completed.status === 'in-progress')
          return {
            output: { status: 'in-progress' as const, generationId },
            message: `Image job ${generationId} is processing. Use get_generation_result after 10 seconds to retrieve it within 24 hours.`
          };
        result = completed;
        break;
      }
    }
    let file = imageFile(result, 'transformed-image', generationId);
    if (generationId)
      await ctx.addAttachment(
        generationDownload(generationId, ctx.auth.token, file.output.mimeType)
      );
    else
      await ctx.addAttachment({
        type: 'content',
        content: file.content,
        filename: file.output.fileName
      });
    return {
      output: file.output,
      message: `Completed ${input.operation}. The image is ready to download. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
