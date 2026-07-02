import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokConsumerClient } from '../lib/client';
import { spec } from '../spec';

let videoOutputSchema = z.object({
  videoId: z.string().optional().describe('Unique video ID.'),
  createTime: z.number().optional().describe('Unix timestamp when the video was created.'),
  coverImageUrl: z.string().optional().describe('Cover image URL (expires after some time).'),
  shareUrl: z.string().optional().describe('URL to share the video.'),
  videoDescription: z.string().optional().describe('Video description text.'),
  title: z.string().optional().describe('Video title.'),
  duration: z.number().optional().describe('Video duration in seconds.'),
  height: z.number().optional().describe('Video height in pixels.'),
  width: z.number().optional().describe('Video width in pixels.'),
  embedHtml: z.string().optional().describe('HTML embed code for the video.'),
  embedLink: z.string().optional().describe('Embeddable video link.'),
  likeCount: z.number().optional().describe('Number of likes.'),
  commentCount: z.number().optional().describe('Number of comments.'),
  shareCount: z.number().optional().describe('Number of shares.'),
  viewCount: z.number().optional().describe('Number of views.')
});

export let listVideos = SlateTool.create(spec, {
  name: 'List Videos',
  key: 'list_videos',
  description: `Retrieve a paginated list of the authenticated user's public TikTok videos, sorted by creation time (newest first). Returns video metadata including engagement metrics, embed links, and cover images. Use cursor-based pagination to retrieve additional pages.`,
  constraints: [
    'Maximum 20 videos per request.',
    'Requires the video.list scope.',
    'Cover image URLs expire — use Query Videos to refresh them.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .number()
        .optional()
        .describe('Pagination cursor from a previous response. Omit for the first page.'),
      maxCount: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe('Number of videos to return per page (1-20, default 20).')
    })
  )
  .output(
    z.object({
      videos: z.array(videoOutputSchema).describe('List of video objects.'),
      cursor: z.number().describe('Cursor value for the next page.'),
      hasMore: z.boolean().describe('Whether more videos are available.')
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

    let result = await client.listVideos({
      fields,
      cursor: ctx.input.cursor,
      maxCount: ctx.input.maxCount
    });

    let videos = result.videos.map(v => ({
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
      output: {
        videos,
        cursor: result.cursor,
        hasMore: result.hasMore
      },
      message: `Retrieved **${videos.length}** video(s).${result.hasMore ? ' More videos available.' : ''}`
    };
  })
  .build();
