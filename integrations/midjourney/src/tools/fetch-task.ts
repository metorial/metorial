import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fetchTask = SlateTool.create(spec, {
  name: 'Fetch Task',
  key: 'fetch_task',
  description: `Check the status and retrieve results of a Midjourney task. Use this to poll for completion after submitting an asynchronous generation, variation, upscale, blend, or describe request.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z
        .string()
        .describe(
          'The task ID returned from a previous generation, variation, upscale, blend, or describe request'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The task identifier'),
      taskType: z
        .string()
        .optional()
        .describe(
          'Type of the task (e.g. "imagine", "variations", "blend", "describe", "upscale-2x")'
        ),
      status: z
        .string()
        .optional()
        .describe('Current status of the task (e.g. "processing", "completed", "failed")'),
      progress: z.string().optional().describe('Percentage completion if still processing'),
      gridImageUrl: z
        .string()
        .optional()
        .describe('URL of the grid image (for imagine, variations, blend tasks)'),
      imageUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of individual generated images'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL of a single result image (for upscale, describe tasks)'),
      prompts: z
        .array(z.string())
        .optional()
        .describe('Prompt suggestions (for describe tasks)'),
      videoUrls: z.array(z.string()).optional().describe('Generated video URLs'),
      seed: z.string().optional().describe('Seed value returned by seed tasks'),
      styleReference: z.string().optional().describe('Style reference code if applicable'),
      error: z.string().optional().describe('Provider error message when the task failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.fetchTask(ctx.input.taskId);

    let status = result.status || 'completed';
    let isComplete = status !== 'processing' && status !== 'queued' && status !== 'pending';

    return {
      output: {
        taskId: result.task_id,
        taskType: result.task_type,
        status,
        progress: result.percentage,
        gridImageUrl: result.original_image_url,
        imageUrls: result.image_urls,
        imageUrl: result.image_url,
        prompts: result.content,
        videoUrls: result.video_urls,
        seed: result.seed,
        styleReference: result.sref,
        error: result.error
      },
      message: isComplete
        ? `Task **${result.task_id}** (${result.task_type}) is **${status}**.${result.image_urls ? ` ${result.image_urls.length} images available.` : ''}${result.image_url ? ` Image: ${result.image_url}` : ''}${result.video_urls ? ` ${result.video_urls.length} videos available.` : ''}${result.content ? ` ${result.content.length} prompts generated.` : ''}${result.seed ? ` Seed: ${result.seed}.` : ''}${result.error ? ` Error: ${result.error}` : ''}`
        : `Task **${result.task_id}** (${result.task_type}) is **${status}**${result.percentage ? ` (${result.percentage}%)` : ''}.`
    };
  })
  .build();
