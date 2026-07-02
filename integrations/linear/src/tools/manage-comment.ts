import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

let commentOutputSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  body: z.string().describe('Comment body in Markdown'),
  url: z.string().describe('URL to the comment'),
  authorId: z.string().nullable().describe('Author user ID'),
  authorName: z.string().nullable().describe('Author name'),
  authorEmail: z.string().nullable().describe('Author email'),
  issueId: z.string().describe('Parent issue ID'),
  issueIdentifier: z.string().describe('Parent issue identifier'),
  issueTitle: z.string().describe('Parent issue title'),
  createdAt: z.string(),
  updatedAt: z.string()
});

let mapCommentToOutput = (comment: any) => ({
  commentId: comment.id,
  body: comment.body,
  url: comment.url,
  authorId: comment.user?.id || null,
  authorName: comment.user?.displayName || comment.user?.name || null,
  authorEmail: comment.user?.email || null,
  issueId: comment.issue?.id || '',
  issueIdentifier: comment.issue?.identifier || '',
  issueTitle: comment.issue?.title || '',
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt
});

export let createCommentTool = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Creates a new comment on a Linear issue. Supports Markdown formatting and @mentions using resource URLs.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      issueId: z.string().describe('Issue ID (UUID or identifier like ENG-123) to comment on'),
      body: z.string().describe('Comment body in Markdown'),
      parentId: z.string().optional().describe('Parent comment ID for threaded replies')
    })
  )
  .output(commentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {
      issueId: ctx.input.issueId,
      body: ctx.input.body
    };

    if (ctx.input.parentId) input.parentId = ctx.input.parentId;

    let result = await client.createComment(input);

    if (!result.success) {
      throw linearServiceError('Failed to create comment');
    }

    return {
      output: mapCommentToOutput(result.comment),
      message: `Added comment to issue **${result.comment.issue?.identifier || ctx.input.issueId}**`
    };
  })
  .build();

export let updateCommentTool = SlateTool.create(spec, {
  name: 'Update Comment',
  key: 'update_comment',
  description: `Updates an existing comment on a Linear issue.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('Comment ID to update'),
      body: z.string().describe('New comment body in Markdown')
    })
  )
  .output(commentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let result = await client.updateComment(ctx.input.commentId, {
      body: ctx.input.body
    });

    if (!result.success) {
      throw linearServiceError('Failed to update comment');
    }

    return {
      output: mapCommentToOutput(result.comment),
      message: `Updated comment on issue **${result.comment.issue?.identifier || 'unknown'}**`
    };
  })
  .build();

export let deleteCommentTool = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Permanently deletes a comment from a Linear issue.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('Comment ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.deleteComment(ctx.input.commentId);

    return {
      output: { success: result.success },
      message: result.success
        ? `Deleted comment **${ctx.input.commentId}**`
        : `Failed to delete comment ${ctx.input.commentId}`
    };
  })
  .build();
