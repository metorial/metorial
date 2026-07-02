import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let panImage = SlateTool.create(spec, {
  name: 'Pan Image',
  key: 'pan_image',
  description:
    'Expand a previously upscaled Midjourney image canvas in one direction and fill the new area.',
  instructions: [
    'Use a parentTaskId from a prior 1x upscale task.',
    'Use prompt when you want to guide what Midjourney adds in the expanded area.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentTaskId: z.string().describe('Task ID of the upscaled image to pan'),
      direction: z
        .enum(['up', 'down', 'left', 'right'])
        .describe('Direction to expand the image canvas'),
      prompt: z.string().optional().describe('Optional prompt to guide the generated area'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until the pan task completes and returns image URLs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the pan task'),
      status: z.string().optional().describe('Current status of the task'),
      gridImageUrl: z.string().optional().describe('URL of the panned grid image'),
      imageUrls: z.array(z.string()).optional().describe('URLs of the panned images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting pan request...');

    let submitResult = await client.pan({
      parentTaskId: ctx.input.parentTaskId,
      direction: ctx.input.direction,
      prompt: ctx.input.prompt
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Pan task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for pan to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: result.status ?? 'completed',
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls
      },
      message: `Pan completed. ${result.image_urls?.length ?? 0} images generated.`
    };
  })
  .build();
