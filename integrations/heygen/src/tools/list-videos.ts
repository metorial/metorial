import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listVideos = SlateTool.create(spec, {
  name: 'List Videos',
  key: 'list_videos',
  description: `List generated videos in your HeyGen account with pagination support. Returns video IDs, statuses, titles, and URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paginationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response to get the next page'),
      limit: z.number().optional().describe('Maximum number of videos to return')
    })
  )
  .output(
    z.object({
      videos: z
        .array(
          z.object({
            videoId: z.string().describe('Video ID'),
            title: z.string().nullable().describe('Video title'),
            status: z.string().describe('Video status'),
            videoUrl: z.string().nullable().describe('Video download URL'),
            thumbnailUrl: z.string().nullable().describe('Thumbnail URL'),
            createdAt: z.number().nullable().describe('Creation timestamp')
          })
        )
        .describe('List of videos'),
      paginationToken: z
        .string()
        .nullable()
        .describe('Token for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.listVideos({
      token: ctx.input.paginationToken,
      limit: ctx.input.limit
    });

    return {
      output: {
        videos: result.videos,
        paginationToken: result.token
      },
      message: `Found **${result.videos.length}** videos.${result.token ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
