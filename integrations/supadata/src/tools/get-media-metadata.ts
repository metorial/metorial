import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let authorSchema = z
  .object({
    username: z.string().optional().describe('Author username/handle'),
    name: z.string().optional().describe('Author display name'),
    avatar: z.string().optional().describe('Author avatar URL'),
    verified: z.boolean().optional().describe('Whether the author is verified')
  })
  .optional();

let statsSchema = z
  .object({
    views: z.number().optional().describe('View count'),
    likes: z.number().optional().describe('Like count'),
    comments: z.number().optional().describe('Comment count'),
    shares: z.number().optional().describe('Share count')
  })
  .optional();

export let getMediaMetadata = SlateTool.create(spec, {
  name: 'Get Media Metadata',
  key: 'get_media_metadata',
  description: `Fetch metadata from videos and posts hosted on YouTube, TikTok, Instagram, X (Twitter), or Facebook.
Returns a unified schema with platform, content type, author info, engagement stats, media details, tags, and creation date.
For YouTube-specific detailed metadata, use the "Get YouTube Video" tool instead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the video or post to fetch metadata for')
    })
  )
  .output(
    z.object({
      platform: z
        .string()
        .optional()
        .describe('Source platform (e.g. youtube, tiktok, instagram, x, facebook)'),
      contentType: z
        .string()
        .optional()
        .describe('Content type (video, image, carousel, post)'),
      title: z.string().optional().describe('Title of the content'),
      description: z.string().optional().describe('Description or caption'),
      author: authorSchema.describe('Author information'),
      stats: statsSchema.describe('Engagement statistics'),
      duration: z.number().optional().describe('Duration in seconds'),
      thumbnail: z.string().optional().describe('Thumbnail URL'),
      tags: z.array(z.string()).optional().describe('Content tags'),
      createdAt: z.string().optional().describe('Creation date'),
      additionalData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Platform-specific additional data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMetadata({ url: ctx.input.url });

    return {
      output: {
        platform: result.platform,
        contentType: result.type ?? result.contentType,
        title: result.title,
        description: result.description,
        author: result.author,
        stats: result.statistics ?? result.stats,
        duration: result.duration,
        thumbnail: result.thumbnail,
        tags: result.tags,
        createdAt: result.createdAt ?? result.publishedAt,
        additionalData: result.additionalData ?? result.extra
      },
      message: `Metadata fetched for **${result.title ?? 'content'}** on ${result.platform ?? 'unknown platform'}.`
    };
  })
  .build();
