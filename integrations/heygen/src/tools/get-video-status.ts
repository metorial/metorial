import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let getVideoStatus = SlateTool.create(spec, {
  name: 'Get Video Status',
  key: 'get_video_status',
  description: `Check the status of a video generation job and retrieve the completed video URL. Use this after creating a video to poll for completion. Returns the video URL, thumbnail, GIF preview, and duration once complete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('Video ID returned from a video generation request')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Video ID'),
      status: z
        .string()
        .describe('Video status: "processing", "completed", "failed", "pending"'),
      videoUrl: z.string().nullable().describe('URL to download the completed video'),
      thumbnailUrl: z.string().nullable().describe('URL of the video thumbnail'),
      gifUrl: z.string().nullable().describe('URL of the GIF preview'),
      duration: z.number().nullable().describe('Video duration in seconds'),
      caption: z.string().nullable().describe('Video caption/subtitle if available'),
      error: z.string().nullable().describe('Error message if generation failed'),
      callbackId: z
        .string()
        .nullable()
        .describe('Custom callback ID if provided during creation'),
      createdAt: z.number().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.getVideoStatus(ctx.input.videoId);

    let statusMessage =
      result.status === 'completed'
        ? `Video **${result.videoId}** is **completed**. [Download video](${result.videoUrl})`
        : result.status === 'failed'
          ? `Video **${result.videoId}** **failed**: ${result.error || 'Unknown error'}`
          : `Video **${result.videoId}** is **${result.status}**. Check again shortly.`;

    return {
      output: result,
      message: statusMessage
    };
  })
  .build();
