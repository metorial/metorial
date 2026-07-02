import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let getVideos = SlateTool.create(spec, {
  name: 'Get Videos',
  key: 'get_videos',
  description: `Retrieve VODs, highlights, and past broadcasts from Twitch. Filter by user, game, or specific video IDs. Supports sorting and time period filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoIds: z.array(z.string()).optional().describe('Specific video IDs to retrieve'),
      userId: z.string().optional().describe('Filter by user/broadcaster ID'),
      gameId: z.string().optional().describe('Filter by game/category ID'),
      type: z
        .enum(['all', 'upload', 'archive', 'highlight'])
        .optional()
        .describe('Video type filter'),
      sort: z.enum(['time', 'trending', 'views']).optional().describe('Sort order'),
      period: z
        .enum(['all', 'day', 'week', 'month'])
        .optional()
        .describe('Time period filter'),
      maxResults: z.number().optional().describe('Maximum results (1-100)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      videos: z.array(
        z.object({
          videoId: z.string(),
          streamId: z.string(),
          userId: z.string(),
          userLogin: z.string(),
          userName: z.string(),
          title: z.string(),
          description: z.string(),
          url: z.string(),
          thumbnailUrl: z.string(),
          viewCount: z.number(),
          language: z.string(),
          type: z.string(),
          duration: z.string(),
          createdAt: z.string(),
          publishedAt: z.string()
        })
      ),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    let result = await client.getVideos({
      videoIds: ctx.input.videoIds,
      userId: ctx.input.userId,
      gameId: ctx.input.gameId,
      type: ctx.input.type,
      sort: ctx.input.sort,
      period: ctx.input.period,
      first: ctx.input.maxResults,
      after: ctx.input.cursor
    });

    let videos = result.videos.map(v => ({
      videoId: v.id,
      streamId: v.stream_id,
      userId: v.user_id,
      userLogin: v.user_login,
      userName: v.user_name,
      title: v.title,
      description: v.description,
      url: v.url,
      thumbnailUrl: v.thumbnail_url,
      viewCount: v.view_count,
      language: v.language,
      type: v.type,
      duration: v.duration,
      createdAt: v.created_at,
      publishedAt: v.published_at
    }));

    return {
      output: { videos, cursor: result.cursor },
      message: videos.length === 0 ? 'No videos found' : `Found **${videos.length}** videos`
    };
  })
  .build();
