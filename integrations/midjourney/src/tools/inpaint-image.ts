import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { midjourneyServiceError } from '../lib/errors';
import { spec } from '../spec';

let normalizeMask = (maskBase64: string, mimeType: string) => {
  let trimmed = maskBase64.trim();
  if (!trimmed) {
    throw midjourneyServiceError('maskBase64 must contain a base64-encoded mask image.');
  }

  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  return `data:${mimeType};base64,${trimmed}`;
};

export let inpaintImage = SlateTool.create(spec, {
  name: 'Inpaint Image',
  key: 'inpaint_image',
  description:
    'Redraw a selected region of a previously upscaled Midjourney image using a mask and optional prompt.',
  instructions: [
    'Use a parentTaskId from a prior 1x upscale task.',
    'Provide maskBase64 as either raw base64 or a data:image/...;base64 URI matching the selected region mask.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentTaskId: z.string().describe('Task ID of the upscaled image to inpaint'),
      maskBase64: z
        .string()
        .describe('Base64-encoded mask image, either raw base64 or a data URI'),
      maskMimeType: z
        .string()
        .optional()
        .default('image/png')
        .describe('MIME type to use when maskBase64 is raw base64. Defaults to image/png.'),
      prompt: z
        .string()
        .optional()
        .describe('Optional prompt describing what to draw in the selected region'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until the inpaint task completes and returns image URLs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the inpaint task'),
      status: z.string().optional().describe('Current status of the task'),
      gridImageUrl: z.string().optional().describe('URL of the inpainted grid image'),
      imageUrls: z.array(z.string()).optional().describe('URLs of the inpainted images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting inpaint request...');

    let submitResult = await client.inpaint({
      parentTaskId: ctx.input.parentTaskId,
      mask: normalizeMask(ctx.input.maskBase64, ctx.input.maskMimeType),
      prompt: ctx.input.prompt
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Inpaint task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for inpaint to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: result.status ?? 'completed',
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls
      },
      message: `Inpaint completed. ${result.image_urls?.length ?? 0} images generated.`
    };
  })
  .build();
