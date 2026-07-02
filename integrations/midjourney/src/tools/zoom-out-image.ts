import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let zoomOutImage = SlateTool.create(spec, {
  name: 'Zoom Out Image',
  key: 'zoom_out_image',
  description:
    'Outpaint a previously upscaled Midjourney image by enlarging the canvas and generating surrounding content.',
  instructions: [
    'Use a parentTaskId from a prior 1x upscale task.',
    'Use zoomRatio 1 to make square, 1.5 for 1.5x zoom out, 2 for 2x zoom out, or another value greater than 1 and up to 2 for custom zoom.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentTaskId: z.string().describe('Task ID of the upscaled image to zoom out'),
      zoomRatio: z
        .number()
        .min(1)
        .max(2)
        .describe(
          'Zoom out ratio. Use 1 to make square, or a value greater than 1 and up to 2.'
        ),
      aspectRatio: z
        .string()
        .optional()
        .describe('Optional aspect ratio for the outpainted image, for example "16:9".'),
      prompt: z
        .string()
        .optional()
        .describe('Optional prompt to guide generated surrounding areas'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until the zoom-out task completes and returns image URLs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the zoom-out task'),
      status: z.string().optional().describe('Current status of the task'),
      gridImageUrl: z.string().optional().describe('URL of the outpainted grid image'),
      imageUrls: z.array(z.string()).optional().describe('URLs of the outpainted images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting zoom-out request...');

    let submitResult = await client.outpaint({
      parentTaskId: ctx.input.parentTaskId,
      zoomRatio: ctx.input.zoomRatio,
      aspectRatio: ctx.input.aspectRatio,
      prompt: ctx.input.prompt
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Zoom-out task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for zoom-out to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: result.status ?? 'completed',
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls
      },
      message: `Zoom-out completed. ${result.image_urls?.length ?? 0} images generated.`
    };
  })
  .build();
