import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add an internal comment to a conversation or reply to an existing comment. Comments are visible only to teammates, not external contacts. Supports @mentions by including teammate handles in the body.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID to add a new comment to'),
      parentCommentId: z
        .string()
        .optional()
        .describe('Comment ID to reply to (for threaded comments)'),
      authorId: z.string().optional().describe('Teammate ID of the comment author'),
      body: z.string().describe('Comment body text. Use @mentions to notify teammates.')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      body: z.string(),
      postedAt: z.number(),
      authorEmail: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let comment: any;
    if (ctx.input.parentCommentId) {
      comment = await client.replyToComment(ctx.input.parentCommentId, {
        author_id: ctx.input.authorId,
        body: ctx.input.body
      });
    } else if (ctx.input.conversationId) {
      comment = await client.addComment(ctx.input.conversationId, {
        author_id: ctx.input.authorId,
        body: ctx.input.body
      });
    } else {
      throw new Error('Either conversationId or parentCommentId must be provided.');
    }

    return {
      output: {
        commentId: comment.id,
        body: comment.body,
        postedAt: comment.posted_at,
        authorEmail: comment.author?.email
      },
      message: ctx.input.parentCommentId
        ? `Replied to comment ${ctx.input.parentCommentId}.`
        : `Added comment to conversation ${ctx.input.conversationId}.`
    };
  });
