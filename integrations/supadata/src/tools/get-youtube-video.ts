import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getYouTubeVideo = SlateTool.create(spec, {
  name: 'Get YouTube Video',
  key: 'get_youtube_video',
  description: `Fetch detailed metadata for a specific YouTube video. Returns title, description, channel info, engagement stats, duration, thumbnails, and more.
For metadata from other platforms (TikTok, Instagram, etc.), use the "Get Media Metadata" tool instead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('YouTube video URL or video ID')
    })
  )
  .output(
    z.object({
      videoId: z.string().optional().describe('YouTube video ID'),
      title: z.string().optional().describe('Video title'),
      description: z.string().optional().describe('Video description'),
      channelName: z.string().optional().describe('Channel name'),
      channelId: z.string().optional().describe('Channel ID'),
      duration: z.number().optional().describe('Video duration in seconds'),
      viewCount: z.number().optional().describe('View count'),
      likeCount: z.number().optional().describe('Like count'),
      commentCount: z.number().optional().describe('Comment count'),
      thumbnail: z.string().optional().describe('Thumbnail URL'),
      tags: z.array(z.string()).optional().describe('Video tags'),
      publishedAt: z.string().optional().describe('Publish date'),
      categoryId: z.string().optional().describe('YouTube category ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getYouTubeVideo({ url: ctx.input.url });

    return {
      output: {
        videoId: result.id ?? result.videoId,
        title: result.title,
        description: result.description,
        channelName: result.channelName ?? result.channel?.name,
        channelId: result.channelId ?? result.channel?.id,
        duration: result.duration,
        viewCount: result.viewCount ?? result.views,
        likeCount: result.likeCount ?? result.likes,
        commentCount: result.commentCount ?? result.comments,
        thumbnail: result.thumbnail,
        tags: result.tags,
        publishedAt: result.publishedAt ?? result.createdAt,
        categoryId: result.categoryId
      },
      message: `YouTube video: **${result.title ?? 'unknown'}** — ${result.viewCount ?? result.views ?? 0} views, ${result.duration ?? 0}s duration.`
    };
  })
  .build();
