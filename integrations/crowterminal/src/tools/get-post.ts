import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let getPost = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve a single post by its ID, including its current publish status, platform details, and any associated media.
Also returns job delivery information if available, including failure reasons for failed posts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('Unique identifier of the post to retrieve')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier of the post'),
      platform: z.string().describe('Platform the post was created on'),
      text: z.string().describe('Text content of the post'),
      mediaUrls: z.array(z.string()).describe('Media URLs attached to the post'),
      status: z.string().describe('Current status of the post'),
      scheduledAt: z.string().nullable().describe('Scheduled publish time if set'),
      publishedAt: z.string().nullable().describe('Actual publish time if published'),
      createdAt: z.string().describe('Timestamp when the post was created'),
      updatedAt: z.string().describe('Timestamp of last update'),
      failureReason: z
        .string()
        .nullable()
        .describe('Reason for failure if the post failed to publish'),
      platformPostId: z.string().nullable().describe('Native post ID on the target platform'),
      platformPostUrl: z
        .string()
        .nullable()
        .describe('Direct URL to the post on the target platform'),
      accountId: z.string().describe('Account ID the post belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrowTerminalClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let post = await client.getPost(ctx.input.postId);

    return {
      output: {
        postId: post.postId,
        platform: post.platform,
        text: post.text,
        mediaUrls: post.mediaUrls,
        status: post.status,
        scheduledAt: post.scheduledAt,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        failureReason: post.failureReason,
        platformPostId: post.platformPostId,
        platformPostUrl: post.platformPostUrl,
        accountId: post.accountId
      },
      message: `Post **${post.postId}** on **${post.platform}** — status: **${post.status}**${post.platformPostUrl ? ` — [view on platform](${post.platformPostUrl})` : ''}.`
    };
  })
  .build();
