import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editImage = SlateTool.create(spec, {
  name: 'Edit Image',
  key: 'edit_image',
  description:
    'Edit existing images with a text instruction, such as removing an object, changing a background, or adding a detail. Provide publicly accessible source image URLs as context.',
  instructions: [
    'Describe the change clearly and supply one or more contextImageUrls.',
    'If processing is still pending, call get_job_result with the returned jobId.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      prompt: z.string().min(1).describe('Text instruction describing the desired edit'),
      contextImageUrls: z
        .array(z.url())
        .min(1)
        .describe('Publicly accessible URLs of the source and reference images'),
      modelType: z
        .enum(['gemini-3-pro-image-preview', 'google-gemini-image-flash', 'qwen'])
        .optional()
        .describe('AI editing model; defaults to gemini-3-pro-image-preview'),
      width: z.number().optional().describe('Target output width in whole pixels'),
      height: z.number().optional().describe('Target output height in whole pixels'),
      outputFormat: z.enum(['jpg', 'png', 'webp']).optional().describe('Output image format')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Processing status'),
      jobId: z.string().describe('Job identifier for tracking'),
      resultUrl: z.string().optional().describe('URL to the edited image when complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.processImageSync({
      width: ctx.input.width,
      height: ctx.input.height,
      outputFormat: ctx.input.outputFormat,
      background: {
        generate: {
          description: ctx.input.prompt,
          adapterType: 'img2img',
          modelType: ctx.input.modelType ?? 'gemini-3-pro-image-preview',
          contextImages: ctx.input.contextImageUrls
        }
      }
    });

    if (result.status === 'complete' && result.resultUrl) {
      await ctx.addAttachment({ type: 'url', url: result.resultUrl });
    }

    return {
      output: result,
      message:
        result.status === 'complete'
          ? `Image edited successfully. Result: ${result.resultUrl}`
          : `Image editing started (status: **${result.status}**). Job ID: \`${result.jobId}\`.`
    };
  })
  .build();
