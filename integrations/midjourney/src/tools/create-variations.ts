import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVariations = SlateTool.create(spec, {
  name: 'Create Variations',
  key: 'create_variations',
  description: `Generate variations of a previously generated Midjourney image. Select one of the 4 images from a generation grid and create new variations in either strong or subtle mode, or use the classic V1-V4 variation buttons.`,
  instructions: [
    'Use index "1" through "4" for classic V1-V4 variations that create a new grid.',
    'Use index "strong" or "subtle" for Vary Strong/Subtle which creates a single varied image.'
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
        .describe('Task ID of the original generation task to create variations from'),
      index: z
        .enum(['1', '2', '3', '4', 'strong', 'subtle'])
        .describe(
          'Image index (1-4) for classic variations, or "strong"/"subtle" for vary modes'
        ),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until variations complete and returns image URLs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the variation task'),
      status: z.string().optional().describe('Current status of the task'),
      gridImageUrl: z.string().optional().describe('URL of the variation grid image'),
      imageUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of the individual variation images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting variations request...');

    let submitResult = await client.variations({
      parentTaskId: ctx.input.parentTaskId,
      index: ctx.input.index
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Variations task **${submitResult.task_id}** submitted for image index ${ctx.input.index}. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for variations to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: 'completed',
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls
      },
      message: `Variations completed. ${result.image_urls?.length ?? 0} variation images generated.`
    };
  })
  .build();
