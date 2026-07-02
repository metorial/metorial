import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let blendImages = SlateTool.create(spec, {
  name: 'Blend Images',
  key: 'blend_images',
  description: `Combine 2 to 5 images into a new blended image using Midjourney. The resulting image merges the concepts and aesthetics of all input images. Supports configurable output dimensions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrls: z
        .array(z.string())
        .min(2)
        .max(5)
        .describe(
          'URLs of 2-5 images to blend together. All images must be publicly accessible.'
        ),
      dimension: z
        .enum(['square', 'portrait', 'landscape'])
        .optional()
        .describe('Output image dimensions. Defaults to square.'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until blending completes and returns image URLs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the blend task'),
      status: z.string().optional().describe('Current status of the task'),
      gridImageUrl: z.string().optional().describe('URL of the blended image grid'),
      imageUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of the individual blended images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting blend request...');

    let submitResult = await client.blend({
      imageUrls: ctx.input.imageUrls,
      dimension: ctx.input.dimension
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Blend task **${submitResult.task_id}** submitted with ${ctx.input.imageUrls.length} images. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for blend to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: 'completed',
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls
      },
      message: `Blend completed. ${result.image_urls?.length ?? 0} blended images generated.`
    };
  })
  .build();
