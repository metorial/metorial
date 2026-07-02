import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let updatePost = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update an existing post's text, media, or scheduled time. Only posts that have not yet been published (status: queued or scheduled) can be updated.`,
  constraints: [
    'Only posts with status "queued" or "scheduled" can be updated. Published or processing posts cannot be modified.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('Unique identifier of the post to update'),
      text: z.string().optional().describe('Updated text content'),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe('Updated list of media URLs (replaces existing media)'),
      scheduledAt: z
        .string()
        .optional()
        .describe('Updated ISO 8601 datetime for scheduled publishing')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier of the updated post'),
      platform: z.string().describe('Platform the post targets'),
      text: z.string().describe('Updated text content'),
      mediaUrls: z.array(z.string()).describe('Current media URLs'),
      status: z.string().describe('Current status of the post'),
      scheduledAt: z.string().nullable().describe('Scheduled publish time'),
      updatedAt: z.string().describe('Timestamp of the update'),
      accountId: z.string().describe('Account ID the post belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrowTerminalClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.info({ message: 'Updating post', postId: ctx.input.postId });

    let post = await client.updatePost(ctx.input.postId, {
      text: ctx.input.text,
      mediaUrls: ctx.input.mediaUrls,
      scheduledAt: ctx.input.scheduledAt
    });

    return {
      output: {
        postId: post.postId,
        platform: post.platform,
        text: post.text,
        mediaUrls: post.mediaUrls,
        status: post.status,
        scheduledAt: post.scheduledAt,
        updatedAt: post.updatedAt,
        accountId: post.accountId
      },
      message: `Post **${post.postId}** updated successfully on **${post.platform}**.`
    };
  })
  .build();
