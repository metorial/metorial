import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rerollImage = SlateTool.create(spec, {
  name: 'Reroll Image',
  key: 'reroll_image',
  description:
    'Create a fresh 4-image grid from a previous Midjourney imagine task, optionally with a revised prompt.',
  instructions: [
    'Use this when the original concept is useful but the full 4-image grid should be regenerated.',
    'Provide prompt only when you want to redraw with different wording; otherwise APIFRAME uses the original prompt.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentTaskId: z.string().describe('Task ID of the original imagine task to reroll'),
      prompt: z
        .string()
        .optional()
        .describe(
          'Optional replacement prompt for the reroll. Defaults to the original prompt.'
        ),
      aspectRatio: z
        .string()
        .optional()
        .describe('Optional aspect ratio for the reroll, for example "16:9" or "1:1".'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until the reroll completes and returns image URLs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the reroll task'),
      status: z.string().optional().describe('Current status of the task'),
      gridImageUrl: z.string().optional().describe('URL of the rerolled grid image'),
      imageUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of the individual rerolled images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting reroll request...');

    let submitResult = await client.reroll({
      parentTaskId: ctx.input.parentTaskId,
      prompt: ctx.input.prompt,
      aspectRatio: ctx.input.aspectRatio
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Reroll task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for reroll to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: result.status ?? 'completed',
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls
      },
      message: `Reroll completed. ${result.image_urls?.length ?? 0} images generated.`
    };
  })
  .build();
