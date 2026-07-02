import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let createPost = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create and publish a new social media post to a connected platform (TikTok, X, or Instagram).
Supports text content with optional media attachments and scheduling for future publication.
An **idempotency key** can be provided to prevent duplicate posts when retrying.`,
  instructions: [
    'Provide the target platform and account ID for the connected social account.',
    'Use scheduledAt (ISO 8601 format) to schedule a post for future publishing instead of immediate posting.',
    'Include an idempotency key when retrying to avoid duplicate posts.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      platform: z.enum(['tiktok', 'x', 'instagram']).describe('Target social media platform'),
      accountId: z.string().describe('ID of the connected social media account to post from'),
      text: z.string().describe('Text content of the post'),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of media files to attach to the post'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 datetime to schedule the post for future publishing'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate posts on retries')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier of the created post'),
      platform: z.string().describe('Platform the post was created on'),
      text: z.string().describe('Text content of the post'),
      mediaUrls: z.array(z.string()).describe('Media URLs attached to the post'),
      status: z
        .string()
        .describe(
          'Current status of the post (queued, scheduled, processing, published, failed)'
        ),
      scheduledAt: z.string().nullable().describe('Scheduled publish time if set'),
      createdAt: z.string().describe('Timestamp when the post was created'),
      accountId: z.string().describe('Account ID the post belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrowTerminalClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.info({
      message: 'Creating post',
      platform: ctx.input.platform,
      accountId: ctx.input.accountId
    });

    let post = await client.createPost({
      platform: ctx.input.platform,
      accountId: ctx.input.accountId,
      text: ctx.input.text,
      mediaUrls: ctx.input.mediaUrls,
      scheduledAt: ctx.input.scheduledAt,
      idempotencyKey: ctx.input.idempotencyKey
    });

    let statusLabel = post.scheduledAt ? `scheduled for ${post.scheduledAt}` : post.status;

    return {
      output: {
        postId: post.postId,
        platform: post.platform,
        text: post.text,
        mediaUrls: post.mediaUrls,
        status: post.status,
        scheduledAt: post.scheduledAt,
        createdAt: post.createdAt,
        accountId: post.accountId
      },
      message: `Post **${post.postId}** created on **${post.platform}** — status: ${statusLabel}.`
    };
  })
  .build();
