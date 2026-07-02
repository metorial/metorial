import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description:
    'Generate short Midjourney videos from a text prompt and a starting image URL using APIFRAME.',
  instructions: [
    'Provide an accessible image URL to use as the start frame.',
    'Use motion "high" for more movement or "low" for subtler movement.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z.string().describe('Text prompt describing the desired video'),
      imageUrl: z
        .string()
        .describe('Public URL of the starting image frame. Can come from an imagine result.'),
      motion: z
        .enum(['low', 'high'])
        .optional()
        .default('low')
        .describe('Video motion amount. Defaults to low.'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, polls until the video task completes and returns video URLs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the video generation task'),
      status: z.string().optional().describe('Current status of the task'),
      videoUrls: z.array(z.string()).optional().describe('URLs of generated videos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting video generation request...');

    let submitResult = await client.imagineVideo({
      prompt: ctx.input.prompt,
      imageUrl: ctx.input.imageUrl,
      motion: ctx.input.motion
    });

    if (!ctx.input.waitForResult) {
      return {
        output: {
          taskId: submitResult.task_id,
          status: 'submitted'
        },
        message: `Video generation task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for video generation to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: result.status ?? 'completed',
        videoUrls: result.video_urls
      },
      message: `Video generation completed. ${result.video_urls?.length ?? 0} videos generated.`
    };
  })
  .build();
