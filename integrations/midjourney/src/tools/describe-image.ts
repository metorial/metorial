import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let describeImage = SlateTool.create(spec, {
  name: 'Describe Image',
  key: 'describe_image',
  description: `Analyze an image and generate text prompt suggestions that could produce similar images in Midjourney. Returns up to 4 descriptive prompts inspired by the visual content, style, and composition of the input image.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z
        .string()
        .describe(
          'URL of the image to describe. Must be publicly accessible on the internet.'
        ),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until description completes and returns prompt suggestions')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the describe task'),
      status: z.string().optional().describe('Current status of the task'),
      prompts: z
        .array(z.string())
        .optional()
        .describe('Generated text prompt suggestions based on the image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting describe request...');

    let submitResult = await client.describe({
      imageUrl: ctx.input.imageUrl
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Describe task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for description to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: 'completed',
        prompts: result.content
      },
      message: `Description completed. ${result.content?.length ?? 0} prompt suggestions generated.${result.content ? `\n\n${result.content.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}`
    };
  })
  .build();
