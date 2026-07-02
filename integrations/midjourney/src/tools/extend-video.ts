import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extendVideo = SlateTool.create(spec, {
  name: 'Extend Video',
  key: 'extend_video',
  description: 'Extend a previously generated Midjourney video using APIFRAME.',
  instructions: [
    'Provide the parent task ID of a prior video generation task.',
    'Use index "1" to "4" to select which video result to extend.',
    'Optionally provide an accessible image URL as the next start frame.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentTaskId: z.string().describe('Task ID of the original video task'),
      index: z
        .enum(['1', '2', '3', '4'])
        .describe('Video index from the original video task to extend'),
      prompt: z.string().describe('Text prompt describing the video extension'),
      imageUrl: z
        .string()
        .optional()
        .describe('Optional public image URL to use as the next start frame'),
      motion: z
        .enum(['low', 'high'])
        .optional()
        .default('low')
        .describe('Video motion amount. Defaults to low.'),
      waitForResult: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, polls until the video extension task completes and returns video URLs'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier for the video extension task'),
      status: z.string().optional().describe('Current status of the task'),
      videoUrls: z.array(z.string()).optional().describe('URLs of extended videos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting video extension request...');

    let submitResult = await client.extendVideo({
      parentTaskId: ctx.input.parentTaskId,
      index: ctx.input.index,
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
        message: `Video extension task **${submitResult.task_id}** submitted. Use the **Fetch Task** tool to check its status.`
      };
    }

    ctx.progress('Waiting for video extension to complete...');

    let result = await client.pollUntilComplete(submitResult.task_id);

    return {
      output: {
        taskId: result.task_id,
        status: result.status ?? 'completed',
        videoUrls: result.video_urls
      },
      message: `Video extension completed. ${result.video_urls?.length ?? 0} videos generated.`
    };
  })
  .build();
