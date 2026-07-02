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

export let getPostHistory = SlateTool.create(spec, {
  name: 'Get Post History',
  key: 'get_post_history',
  description: `Retrieve the history and status of posts sent via Ayrshare. Filter by platform, date range, status, or type. Returns detailed metadata for each post including content, platforms, status, and engagement URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of posts to return (default: 25, max: 1000)'),
      platforms: z.array(platformEnum).optional().describe('Filter by social networks'),
      startDate: z.string().optional().describe('Inclusive start date in ISO 8601 format'),
      endDate: z.string().optional().describe('Inclusive end date in ISO 8601 format'),
      lastDays: z
        .number()
        .optional()
        .describe('Return posts from the last N days (default: 30, 0 for all)'),
      status: z
        .enum([
          'success',
          'error',
          'processing',
          'pending',
          'paused',
          'deleted',
          'awaiting approval'
        ])
        .optional()
        .describe('Filter by post status'),
      type: z.enum(['immediate', 'scheduled']).optional().describe('Filter by post type')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().optional().describe('Ayrshare Post ID'),
            post: z.string().optional().describe('Post text content'),
            platforms: z.array(z.string()).optional().describe('Target platforms'),
            status: z.string().optional().describe('Current status'),
            type: z.string().optional().describe('Post type (immediate or scheduled)'),
            created: z.string().optional().describe('Creation timestamp'),
            scheduleDate: z.string().optional().describe('Scheduled publication date'),
            mediaUrls: z.array(z.string()).optional().describe('Media attachments')
          })
        )
        .describe('List of posts'),
      count: z.number().optional().describe('Number of posts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.getHistory({
      limit: ctx.input.limit,
      platforms: ctx.input.platforms,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      lastDays: ctx.input.lastDays,
      status: ctx.input.status,
      type: ctx.input.type
    });

    let history = result.history || [];
    let posts = history.map((item: any) => ({
      postId: item.id,
      post: item.post,
      platforms: item.platforms,
      status: item.status,
      type: item.type,
      created: item.created,
      scheduleDate: item.scheduleDate,
      mediaUrls: item.mediaUrls
    }));

    return {
      output: {
        posts,
        count: result.count || posts.length
      },
      message: `Retrieved **${posts.length}** posts from history.`
    };
  })
  .build();
