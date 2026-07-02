import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.number().describe('Comment ID'),
  content: z.string().describe('Comment text'),
  commentType: z.string().describe('Comment type: System or User'),
  createdAt: z.string().describe('Creation timestamp'),
  deletedAt: z.string().nullable().optional().describe('Deletion timestamp'),
  userId: z.number().optional().describe('Author user ID'),
  userName: z.string().optional().describe('Author display name')
});

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve all comments on a specific expense. Returns both user comments and system-generated comments (e.g., change tracking).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      expenseId: z.number().describe('The expense ID to get comments for')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('Comments on the expense')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let comments = await client.getComments(ctx.input.expenseId);

    let mapped = (comments || []).map((c: any) => ({
      commentId: c.id,
      content: c.content,
      commentType: c.comment_type,
      createdAt: c.created_at,
      deletedAt: c.deleted_at ?? null,
      userId: c.user?.id,
      userName: c.user
        ? [c.user.first_name, c.user.last_name].filter(Boolean).join(' ')
        : undefined
    }));

    return {
      output: { comments: mapped },
      message: `Found **${mapped.length}** comment(s) on expense ${ctx.input.expenseId}`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a Splitwise expense. Comments are visible to all users involved in the expense.`
})
  .input(
    z.object({
      expenseId: z.number().describe('The expense ID to comment on'),
      content: z.string().describe('Comment text')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Created comment ID'),
      content: z.string().describe('Comment text'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let comment = await client.createComment(ctx.input.expenseId, ctx.input.content);

    return {
      output: {
        commentId: comment.id,
        content: comment.content,
        createdAt: comment.created_at
      },
      message: `Added comment to expense ${ctx.input.expenseId}`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from a Splitwise expense.`,
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
    let result = await client.deleteComment(ctx.input.commentId);

    return {
      output: { success: result.success !== false },
      message: `Deleted comment ${ctx.input.commentId}`
    };
  })
  .build();
