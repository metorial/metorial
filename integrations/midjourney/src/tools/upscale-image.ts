import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upscaleImage = SlateTool.create(spec, {
  name: 'Upscale Image',
  key: 'upscale_image',
  description: `Upscale a Midjourney image to higher resolution at 2x or 4x scale. Can upscale from a previous task by referencing its task ID, or upscale any image by providing its URL directly.`,
  instructions: [
    'Provide either a parentTaskId (to upscale from a previous generation) or an imageUrl (to upscale any image), but not both.',
    'When upscaling from a 4-image grid task, specify the index (1-4) to select which image to upscale.'
  ],
  constraints: ['When using imageUrl directly, the image must not be larger than 2048x2048.'],
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
      scale: z.enum(['2x', '4x']).describe('Upscale factor: "2x" or "4x"'),
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

    if (!ctx.input.parentTaskId && !ctx.input.imageUrl) {
      throw new Error('Either parentTaskId or imageUrl must be provided');
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
