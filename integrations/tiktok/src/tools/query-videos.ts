import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokConsumerClient } from '../lib/client';
import { spec } from '../spec';

export let queryVideos = SlateTool.create(spec, {
  name: 'Query Videos',
  key: 'query_videos',
  description: `Look up specific TikTok videos by their IDs. Returns video metadata including cover image, engagement metrics, embed links, and dimensions. Useful for refreshing expired cover image URLs or fetching details for known videos.`,
  constraints: [
    'Maximum 20 video IDs per request.',
    'Videos must belong to the authenticated user.',
    'Requires the video.list scope.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoIds: z
        .array(z.string())
        .min(1)
        .max(20)
        .describe('List of video IDs to query (1-20).')
    })
  )
  .output(
    z.object({
      videos: z
        .array(
          z.object({
            videoId: z.string().optional().describe('Unique video ID.'),
            createTime: z
              .number()
              .optional()
              .describe('Unix timestamp when the video was created.'),
            coverImageUrl: z.string().optional().describe('Cover image URL.'),
            shareUrl: z.string().optional().describe('URL to share the video.'),
            videoDescription: z.string().optional().describe('Video description text.'),
            title: z.string().optional().describe('Video title.'),
            duration: z.number().optional().describe('Duration in seconds.'),
            height: z.number().optional().describe('Video height in pixels.'),
            width: z.number().optional().describe('Video width in pixels.'),
            embedHtml: z.string().optional().describe('HTML embed code.'),
            embedLink: z.string().optional().describe('Embeddable video link.'),
            likeCount: z.number().optional().describe('Number of likes.'),
            commentCount: z.number().optional().describe('Number of comments.'),
            shareCount: z.number().optional().describe('Number of shares.'),
            viewCount: z.number().optional().describe('Number of views.')
          })
        )
        .describe('List of matching video objects.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokConsumerClient({ token: ctx.auth.token });

    let fields = [
      'id',
      'create_time',
      'cover_image_url',
      'share_url',
      'video_description',
      'duration',
      'height',
      'width',
      'title',
      'embed_html',
      'embed_link',
      'like_count',
      'comment_count',
      'share_count',
      'view_count'
    ];

    let rawVideos = await client.queryVideos({
      videoIds: ctx.input.videoIds,
      fields
    });

    let videos = rawVideos.map(v => ({
      videoId: v.id,
      createTime: v.create_time,
      coverImageUrl: v.cover_image_url,
      shareUrl: v.share_url,
      videoDescription: v.video_description,
      title: v.title,
      duration: v.duration,
      height: v.height,
      width: v.width,
      embedHtml: v.embed_html,
      embedLink: v.embed_link,
      likeCount: v.like_count,
      commentCount: v.comment_count,
      shareCount: v.share_count,
      viewCount: v.view_count
    }));

    return {
      output: { videos },
      message: `Found **${videos.length}** video(s) out of ${ctx.input.videoIds.length} requested.`
    };
  })
  .build();
