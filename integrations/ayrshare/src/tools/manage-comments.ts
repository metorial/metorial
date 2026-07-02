import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let platformEnum = z.enum([
  'bluesky',
  'facebook',
  'instagram',
  'linkedin',
  'reddit',
  'threads',
  'tiktok',
  'twitter',
  'youtube'
]);

export let getComments = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve comments on a post. Supports looking up by Ayrshare Post ID, Social Post ID, or Social Comment ID. Returns comment text, author, timestamps, like counts, and replies.`,
  instructions: [
    'By default, uses the Ayrshare Post ID. Set searchPlatformId to true to use a Social Post ID instead.',
    'Comment data is cached and updated every 10 minutes.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('Ayrshare Post ID, Social Post ID, or Social Comment ID'),
      searchPlatformId: z
        .boolean()
        .optional()
        .describe('Set to true if using a Social Post ID or Social Comment ID'),
      commentId: z
        .boolean()
        .optional()
        .describe(
          'Set to true if the ID is a Social Comment ID (requires searchPlatformId to be true)'
        ),
      platform: platformEnum
        .optional()
        .describe('Required when using searchPlatformId or commentId')
    })
  )
  .output(
    z.object({
      comments: z
        .record(z.string(), z.unknown())
        .describe(
          'Platform-keyed comment data with comment text, authors, timestamps, and like counts'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.getComments({
      postId: ctx.input.postId,
      searchPlatformId: ctx.input.searchPlatformId,
      commentId: ctx.input.commentId,
      platform: ctx.input.platform
    });

    return {
      output: {
        comments: result
      },
      message: `Retrieved comments for post **${ctx.input.postId}**.`
    };
  })
  .build();

export let postComment = SlateTool.create(spec, {
  name: 'Post Comment',
  key: 'post_comment',
  description: `Post a comment or reply on a social media post. Supports posting to multiple platforms simultaneously and optionally includes an image attachment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('Ayrshare Post ID or Social Post ID to comment on'),
      comment: z.string().describe('Text of the comment to post'),
      platforms: z.array(platformEnum).min(1).describe('Platforms to post the comment on'),
      searchPlatformId: z
        .boolean()
        .optional()
        .describe('Set to true if using a Social Post ID'),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe(
          'Image URL for the comment (max one, supports Facebook, LinkedIn, X/Twitter)'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Comment posting status'),
      commentId: z.string().optional().describe('Ayrshare Comment ID'),
      platformResults: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Per-platform comment results with social comment IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.postComment({
      postId: ctx.input.postId,
      comment: ctx.input.comment,
      platforms: ctx.input.platforms,
      searchPlatformId: ctx.input.searchPlatformId,
      mediaUrls: ctx.input.mediaUrls
    });

    return {
      output: {
        status: result.status || 'success',
        commentId: result.commentID,
        platformResults: result
      },
      message: `Comment posted on **${ctx.input.platforms.join(', ')}** for post **${ctx.input.postId}**.`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from social media posts across specified platforms.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('The comment ID to delete'),
      platforms: z.array(platformEnum).min(1).describe('Platforms to delete the comment from')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.deleteComment({
      commentId: ctx.input.commentId,
      platforms: ctx.input.platforms
    });

    return {
      output: {
        status: result.status || 'success'
      },
      message: `Comment **${ctx.input.commentId}** deleted from **${ctx.input.platforms.join(', ')}**.`
    };
  })
  .build();
