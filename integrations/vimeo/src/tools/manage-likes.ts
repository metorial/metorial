import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import {
  mapVideo,
  paginationInputSchema,
  paginationOutputSchema,
  videoSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listLikedVideosTool = SlateTool.create(spec, {
  name: 'List Liked Videos',
  key: 'list_liked_videos',
  description: `Retrieve the list of videos that the authenticated user has liked. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      sort: z.enum(['alphabetical', 'date']).optional().describe('Sort order for the results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      videos: z.array(videoSchema).describe('List of liked videos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.getLikedVideos({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort
    });

    let videos = (result.data ?? []).map(mapVideo);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? videos.length,
        videos
      },
      message: `Found **${result.total ?? videos.length}** liked videos`
    };
  })
  .build();

export let likeVideoTool = SlateTool.create(spec, {
  name: 'Like Video',
  key: 'like_video',
  description: `Like or unlike a video on Vimeo. Requires the **interact** scope.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The ID of the video'),
      action: z.enum(['like', 'unlike']).describe('Whether to like or unlike the video')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('The video ID'),
      liked: z.boolean().describe('Whether the video is now liked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);

    if (ctx.input.action === 'like') {
      await client.likeVideo(ctx.input.videoId);
    } else {
      await client.unlikeVideo(ctx.input.videoId);
    }

    return {
      output: {
        videoId: ctx.input.videoId,
        liked: ctx.input.action === 'like'
      },
      message:
        ctx.input.action === 'like'
          ? `Liked video **${ctx.input.videoId}**`
          : `Unliked video **${ctx.input.videoId}**`
    };
  })
  .build();
