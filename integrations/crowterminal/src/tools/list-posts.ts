import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let listPosts = SlateTool.create(spec, {
  name: 'List Posts',
  key: 'list_posts',
  description: `List posts across connected social media accounts with optional filtering by platform, account, and publish status.
Supports pagination for browsing large post histories.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z
        .enum(['tiktok', 'x', 'instagram'])
        .optional()
        .describe('Filter by target platform'),
      accountId: z.string().optional().describe('Filter by connected account ID'),
      status: z
        .enum(['queued', 'processing', 'published', 'failed', 'scheduled'])
        .optional()
        .describe('Filter by post status'),
      limit: z.number().optional().describe('Maximum number of posts to return (default 20)'),
      offset: z.number().optional().describe('Number of posts to skip for pagination')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Unique identifier of the post'),
            platform: z.string().describe('Target platform'),
            text: z.string().describe('Text content of the post'),
            status: z.string().describe('Current status'),
            scheduledAt: z.string().nullable().describe('Scheduled publish time'),
            publishedAt: z.string().nullable().describe('Actual publish time'),
            createdAt: z.string().describe('Creation timestamp'),
            accountId: z.string().describe('Account ID')
          })
        )
        .describe('List of posts'),
      total: z.number().describe('Total number of posts matching the filter'),
      limit: z.number().describe('Number of posts per page'),
      offset: z.number().describe('Current page offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrowTerminalClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listPosts({
      platform: ctx.input.platform,
      accountId: ctx.input.accountId,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let posts = result.items.map(p => ({
      postId: p.postId,
      platform: p.platform,
      text: p.text,
      status: p.status,
      scheduledAt: p.scheduledAt,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      accountId: p.accountId
    }));

    return {
      output: {
        posts,
        total: result.total,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.total}** post(s). Showing ${posts.length} result(s).`
    };
  })
  .build();
