import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCommentsTool = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List all comments on an issue. Returns comment content, authors, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueId: z.number().describe('The issue ID to get comments for')
    })
  )
  .output(
    z.object({
      comments: z.array(z.any()).describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listComments(ctx.input.issueId);

    let comments = response.data || [];

    return {
      output: { comments },
      message: `Found **${comments.length}** comment(s) on issue #${ctx.input.issueId}.`
    };
  })
  .build();

export let addCommentTool = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to an issue. Optionally reply to an existing comment by specifying the parent comment ID.`
})
  .input(
    z.object({
      issueId: z.number().describe('The issue ID to comment on'),
      content: z.string().describe('Comment content (supports markdown)'),
      parentCommentId: z.number().optional().describe('Parent comment ID for replies')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the comment was added'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.addComment({
      issueId: ctx.input.issueId,
      content: ctx.input.content,
      parentId: ctx.input.parentCommentId
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to add comment');
    }

    return {
      output: { success: true, raw: response.data },
      message: `Added comment to issue **#${ctx.input.issueId}**.`
    };
  })
  .build();

export let updateCommentTool = SlateTool.create(spec, {
  name: 'Update Comment',
  key: 'update_comment',
  description: `Update the content of an existing comment.`
})
  .input(
    z.object({
      commentId: z.number().describe('The comment ID to update'),
      content: z.string().describe('New comment content')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.updateComment({
      commentId: ctx.input.commentId,
      content: ctx.input.content
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to update comment');
    }

    return {
      output: { success: true },
      message: `Updated comment **#${ctx.input.commentId}**.`
    };
  })
  .build();

export let deleteCommentTool = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from an issue.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.number().describe('The comment ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.deleteComment(ctx.input.commentId);

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to delete comment');
    }

    return {
      output: { success: true },
      message: `Deleted comment **#${ctx.input.commentId}**.`
    };
  })
  .build();
