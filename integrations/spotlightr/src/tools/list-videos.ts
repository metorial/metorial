import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVideos = SlateTool.create(spec, {
  name: 'List Videos',
  key: 'list_videos',
  description: `Retrieve videos from your Spotlightr account. You can fetch all videos, a specific video by ID, or filter by project group.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z
        .string()
        .optional()
        .describe('Specific video ID to retrieve. If omitted, returns all videos.'),
      videoGroup: z.string().optional().describe('Project group ID to filter videos by.')
    })
  )
  .output(
    z.object({
      videos: z
        .array(z.record(z.string(), z.any()))
        .describe('List of video objects returned from Spotlightr.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let videos = await client.listVideos({
      videoId: ctx.input.videoId,
      videoGroup: ctx.input.videoGroup
    });

    let videoList = Array.isArray(videos) ? videos : [videos];

    return {
      output: {
        videos: videoList
      },
      message: `Retrieved **${videoList.length}** video(s) from Spotlightr.`
    };
  })
  .build();
