import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let platformEnum = z.enum([
  'bluesky',
  'facebook',
  'gmb',
  'instagram',
  'linkedin',
  'pinterest',
  'reddit',
  'snapchat',
  'telegram',
  'threads',
  'tiktok',
  'twitter',
  'youtube'
]);

export let createPost = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Publish or schedule a post to one or multiple social networks simultaneously. Supports text, images, and video content. Posts can be sent immediately or scheduled for a future date.
Supports platform-specific options, auto-hashtag generation, link shortening, and auto-reposting.`,
  instructions: [
    'Provide at least the post text and one platform.',
    'Use scheduleDate in UTC ISO 8601 format (e.g., "2026-07-08T12:30:00Z") for scheduling future posts.',
    'Media URLs must be publicly accessible. Use the Upload Media tool first if needed.'
  ],
  constraints: [
    'Published posts cannot be deleted from Instagram or TikTok via API.',
    'Auto-repost requires a minimum of 2 days between reposts.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      post: z.string().describe('The text content of the post'),
      platforms: z.array(platformEnum).min(1).describe('Target social networks to publish to'),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe('Publicly accessible URLs for images or videos to include'),
      scheduleDate: z
        .string()
        .optional()
        .describe('UTC ISO 8601 date to schedule the post (e.g., "2026-07-08T12:30:00Z")'),
      shortenLinks: z.boolean().optional().describe('Automatically shorten URLs in the post'),
      autoHashtag: z
        .boolean()
        .optional()
        .describe('Automatically add relevant hashtags to the post'),
      requiresApproval: z
        .boolean()
        .optional()
        .describe('Hold the post for approval before publishing'),
      isVideo: z
        .boolean()
        .optional()
        .describe('Set to true if media is a video with a non-standard extension'),
      title: z.string().optional().describe('Title for YouTube, Reddit, or Telegram posts'),
      unsplash: z
        .string()
        .optional()
        .describe('Search term for Unsplash image, or "random" for a random image'),
      firstComment: z
        .object({
          comment: z.string().describe('Text of the auto-comment'),
          mediaUrls: z.array(z.string()).optional().describe('Image URLs for the comment')
        })
        .optional()
        .describe('Automatically post a comment after publishing'),
      autoRepost: z
        .object({
          repeat: z.number().min(1).max(10).describe('Number of times to repost (1-10)'),
          days: z.number().min(2).describe('Days between reposts (minimum 2)'),
          startDate: z.string().optional().describe('ISO 8601 date to start reposting')
        })
        .optional()
        .describe('Automatically repost the content on a schedule'),
      platformOptions: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Platform-specific options keyed by platform name (e.g., { "youtube": { "visibility": "public" } })'
        )
    })
  )
  .output(
    z.object({
      postId: z.string().optional().describe('Ayrshare post ID'),
      status: z.string().optional().describe('Post status (e.g., "success", "error")'),
      postIds: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Platform-specific post IDs and statuses'),
      scheduleDate: z.string().optional().describe('Scheduled publication date if applicable'),
      errors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Any errors that occurred per platform')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let params: Record<string, unknown> = {
      post: ctx.input.post,
      platforms: ctx.input.platforms
    };

    if (ctx.input.mediaUrls) params.mediaUrls = ctx.input.mediaUrls;
    if (ctx.input.scheduleDate) params.scheduleDate = ctx.input.scheduleDate;
    if (ctx.input.shortenLinks !== undefined) params.shortenLinks = ctx.input.shortenLinks;
    if (ctx.input.autoHashtag !== undefined) params.autoHashtag = ctx.input.autoHashtag;
    if (ctx.input.requiresApproval !== undefined)
      params.requiresApproval = ctx.input.requiresApproval;
    if (ctx.input.isVideo !== undefined) params.isVideo = ctx.input.isVideo;
    if (ctx.input.title) params.title = ctx.input.title;
    if (ctx.input.unsplash) params.unsplash = ctx.input.unsplash;
    if (ctx.input.firstComment) params.firstComment = ctx.input.firstComment;
    if (ctx.input.autoRepost) params.autoRepost = ctx.input.autoRepost;

    if (ctx.input.platformOptions) {
      for (let [platform, options] of Object.entries(ctx.input.platformOptions)) {
        let optionsKey = `${platform}Options`;
        params[optionsKey] = options;
      }
    }

    let result = await client.createPost(params as any);

    let postId = result.id || result.postId;
    let scheduled = ctx.input.scheduleDate ? ` scheduled for ${ctx.input.scheduleDate}` : '';
    let platformList = ctx.input.platforms.join(', ');

    return {
      output: {
        postId,
        status: result.status,
        postIds: result.postIds,
        scheduleDate: result.scheduleDate,
        errors: result.errors
      },
      message: `Post **${postId}**${scheduled} created on **${platformList}**. Status: **${result.status}**.`
    };
  })
  .build();
