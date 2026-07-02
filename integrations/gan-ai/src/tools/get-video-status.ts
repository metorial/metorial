import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let getVideoStatus = SlateTool.create(spec, {
  name: 'Get Video Status',
  key: 'get_video_status',
  description: `Check the generation status of a personalized video (Studio API). Returns the current status, video URL (when complete), permalink, and any error details. Use inference IDs returned from **Create Personalized Videos**.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace ID containing the project'),
      projectId: z.string().describe('Project ID the video belongs to'),
      inferenceId: z.string().describe('Inference ID from the video creation response')
    })
  )
  .output(
    z.object({
      generationStatus: z
        .string()
        .describe('Current status (PENDING, PROCESSING, SUCCEEDED, FAILED, etc.)'),
      videoUrl: z.string().nullable().describe('S3 URL to the completed video'),
      permalink: z.string().nullable().describe('Non-expiring permanent link'),
      thumbnailUrl: z.string().nullable().describe('Thumbnail URL'),
      smartUrl: z.string().nullable().describe('Landing page URL'),
      error: z
        .object({
          statusCode: z.number(),
          message: z.string()
        })
        .nullable()
        .describe('Error details if generation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StudioClient(ctx.auth.token);
    let result = await client.getVideoStatus({
      workspaceId: ctx.input.workspaceId,
      projectId: ctx.input.projectId,
      inferenceId: ctx.input.inferenceId
    });

    return {
      output: {
        generationStatus: result.gen_status,
        videoUrl: result.video_url,
        permalink: result.permalink,
        thumbnailUrl: result.thumbnail_url,
        smartUrl: result.smart_url,
        error: result.error
          ? {
              statusCode: result.error.status_code,
              message: result.error.message
            }
          : null
      },
      message: `Video **${ctx.input.inferenceId}** status: **${result.gen_status}**.${result.gen_status === 'SUCCEEDED' ? ` [View video](${result.permalink || result.video_url})` : ''}`
    };
  })
  .build();
