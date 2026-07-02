import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate images from a text prompt using Midjourney. Submits an imagine request and optionally waits for the result. Supports Midjourney parameters like aspect ratio, model version, stylize, chaos, quality, and negative prompts directly in the prompt string (e.g. \`--ar 16:9 --v 6 --s 750\`).`,
  instructions: [
    'Include Midjourney parameters directly in the prompt string using the --param syntax (e.g. "--ar 16:9", "--v 6", "--s 750", "--c 50", "--q 2", "--no text").',
    'Set waitForResult to true to poll until the image is generated. This may take up to 5 minutes for complex prompts.',
    'Use the aspectRatio field as a shortcut instead of adding --ar to the prompt.'
  ],
  constraints: [
    'Image generation is asynchronous. Without waitForResult, you receive a task ID to check status later.',
    'Generation time varies based on queue, complexity, and generation mode (fast/relax/turbo).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe(
          'Text prompt describing the image to generate. May include Midjourney parameters like --ar, --v, --s, --c, --q, --no, --style, --niji, etc.'
        ),
      aspectRatio: z
        .string()
        .optional()
        .describe(
          'Aspect ratio for the image (e.g. "16:9", "4:3", "1:1"). Appended as --ar if not already in prompt.'
        ),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, polls until generation completes and returns image URLs. If false, returns the task ID immediately.'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the generation task'),
      status: z
        .string()
        .optional()
        .describe('Current status of the task (e.g. "processing", "completed")'),
      gridImageUrl: z
        .string()
        .optional()
        .describe('URL of the 2x2 grid image containing all 4 generated images'),
      imageUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of the 4 individual generated images'),
      styleReference: z.string().optional().describe('Style reference code if --sref was used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let prompt = ctx.input.prompt;
    let aspectRatio =
      ctx.input.aspectRatio && !prompt.includes('--ar') ? ctx.input.aspectRatio : undefined;

    ctx.progress('Submitting imagine request...');

    let submitResult = await client.imagine({ prompt, aspectRatio });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Image generation task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for image generation to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: 'completed',
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls,
        styleReference: result.sref
      },
      message: `Image generation completed. ${result.image_urls?.length ?? 0} images generated.${result.original_image_url ? ` Grid: ${result.original_image_url}` : ''}`
    };
  })
  .build();
