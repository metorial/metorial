import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';
import { mediaRefreshAt } from './get-file-url';

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
      createdAt: z.number().nullable().describe('Creation timestamp'),
      videoPageUrl: z.string().nullable().describe('Video page in the HeyGen app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

    let result = await client.getVideoStatus(ctx.input.videoId);

    if (result.status === 'completed') {
      if (result.videoUrl)
        await ctx.addAttachment({
          type: 'url',
          url: result.videoUrl,
          mimeType: new URL(result.videoUrl).pathname.endsWith('.webm')
            ? 'video/webm'
            : 'video/mp4',
          refreshReference: { kind: 'video', id: result.videoId, field: 'video' },
          refreshAt: mediaRefreshAt()
        });
      if (result.caption)
        await ctx.addAttachment({
          type: 'url',
          url: result.caption,
          mimeType: 'application/x-subrip',
          refreshReference: { kind: 'video', id: result.videoId, field: 'subtitles' },
          refreshAt: mediaRefreshAt()
        });
    }
    let statusMessage =
      result.status === 'completed'
        ? `Video **${result.videoId}** is **completed** and ready to download.`
        : result.status === 'failed'
          ? `Video **${result.videoId}** **failed**: ${result.error || 'Unknown error'}`
          : `Video **${result.videoId}** is **${result.status}**. Check again shortly.`;

    return {
      output: result,
      message: statusMessage
    };
  })
  .build();
