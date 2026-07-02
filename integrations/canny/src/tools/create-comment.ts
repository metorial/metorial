import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let createCommentTool = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a feedback post. Supports threaded replies via parentId, internal-only comments, image attachments, and optional voter notifications.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      authorId: z.string().describe('Canny user ID of the comment author'),
      postId: z.string().describe('Post ID to comment on'),
      value: z.string().describe('Comment text content (supports Markdown)'),
      imageURLs: z
        .array(z.string())
        .optional()
        .describe('Image URLs to attach to the comment'),
      parentId: z.string().optional().describe('Parent comment ID for threaded replies'),
      internal: z
        .boolean()
        .optional()
        .describe('Whether this comment is internal-only (not visible to end users)'),
      shouldNotifyVoters: z
        .boolean()
        .optional()
        .describe('Whether to email voters about this comment'),
      createdAt: z.string().optional().describe('Override creation timestamp (ISO 8601)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.createComment({
      authorID: ctx.input.authorId,
      postID: ctx.input.postId,
      value: ctx.input.value,
      imageURLs: ctx.input.imageURLs,
      parentID: ctx.input.parentId,
      internal: ctx.input.internal,
      shouldNotifyVoters: ctx.input.shouldNotifyVoters,
      createdAt: ctx.input.createdAt
    });

    return {
      output: { commentId: result.id },
      message: `Created comment on post **${ctx.input.postId}**${ctx.input.internal ? ' (internal)' : ''}.`
    };
  })
  .build();
