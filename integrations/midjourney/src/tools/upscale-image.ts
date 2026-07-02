import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { midjourneyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let upscaleImage = SlateTool.create(spec, {
  name: 'Upscale Image',
  key: 'upscale_image',
  description: `Upscale a Midjourney image. Supports APIFRAME's 1x grid selection, subtle/creative upscales from a selected image, and 2x/4x high-resolution upscales from a task or image URL.`,
  instructions: [
    'Use scale "1x" with parentTaskId and index to select one image from a 4-image Midjourney grid.',
    'Use scale "subtle" or "creative" with the parentTaskId returned by a prior 1x upscale.',
    'Use scale "2x" or "4x" with exactly one of parentTaskId or imageUrl. Add index only when the parent task is a 4-image grid.'
  ],
  constraints: [
    'When using imageUrl directly for 2x/4x upscales, the image must not be larger than 2048x2048.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentTaskId: z
        .string()
        .optional()
        .describe('Task ID of a previous generation to upscale from'),
      imageUrl: z
        .string()
        .optional()
        .describe('Direct URL of an image to upscale (alternative to parentTaskId)'),
      scale: z
        .enum(['1x', '2x', '4x', 'subtle', 'creative'])
        .describe(
          'Upscale mode: "1x" selects from an image grid, "subtle"/"creative" upscale a 1x image, and "2x"/"4x" run high-resolution upscale.'
        ),
      index: z
        .enum(['1', '2', '3', '4'])
        .optional()
        .describe('Image index (1-4) when upscaling from a grid generation task'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until upscale completes and returns the image URL')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the upscale task'),
      status: z.string().optional().describe('Current status of the task'),
      imageUrl: z.string().optional().describe('URL of the upscaled image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.scale === '1x') {
      if (!ctx.input.parentTaskId || !ctx.input.index) {
        throw midjourneyServiceError(
          'scale "1x" requires parentTaskId and index from a 4-image grid task.'
        );
      }
      if (ctx.input.imageUrl) {
        throw midjourneyServiceError('scale "1x" does not support imageUrl.');
      }
    } else if (ctx.input.scale === 'subtle' || ctx.input.scale === 'creative') {
      if (!ctx.input.parentTaskId) {
        throw midjourneyServiceError(
          `scale "${ctx.input.scale}" requires parentTaskId from a prior 1x upscale task.`
        );
      }
      if (ctx.input.imageUrl || ctx.input.index) {
        throw midjourneyServiceError(
          `scale "${ctx.input.scale}" does not support imageUrl or index.`
        );
      }
    } else {
      if (Boolean(ctx.input.parentTaskId) === Boolean(ctx.input.imageUrl)) {
        throw midjourneyServiceError(
          'scale "2x" and "4x" require exactly one of parentTaskId or imageUrl.'
        );
      }
      if (ctx.input.imageUrl && ctx.input.index) {
        throw midjourneyServiceError('index is only supported with parentTaskId.');
      }
    }

    ctx.progress('Submitting upscale request...');

    let submitResult = await client.upscale({
      parentTaskId: ctx.input.parentTaskId,
      imageUrl: ctx.input.imageUrl,
      type: ctx.input.scale,
      index: ctx.input.index
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Upscale task **${submitResult.task_id}** submitted (${ctx.input.scale}). Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for upscale to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: 'completed',
        imageUrl: result.image_url
      },
      message: `Upscale (${ctx.input.scale}) completed.${result.image_url ? ` Image: ${result.image_url}` : ''}`
    };
  })
  .build();
