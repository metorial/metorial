import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCommentsTool = SlateTool.create(spec, {
  name: 'Manage Card Comments',
  key: 'manage_comments',
  description: `Create, update, or delete comments on a card. Use action "create" to add a new comment, "update" to modify an existing one, or "delete" to remove a comment.`
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card'),
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      commentId: z.number().optional().describe('Comment ID (required for update and delete)'),
      text: z.string().optional().describe('Comment text (required for create and update)')
    })
  )
  .output(
    z.object({
      commentId: z.number().optional().describe('Comment ID'),
      text: z.string().optional().nullable().describe('Comment text'),
      authorUserId: z.number().optional().nullable().describe('Author user ID'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.text) throw new Error('Text is required to create a comment.');
      let comment = await client.createComment(ctx.input.cardId, ctx.input.text);
      return {
        output: {
          commentId: comment?.comment_id,
          text: comment?.text,
          authorUserId: comment?.author_user_id ?? comment?.user_id,
          createdAt: comment?.created_at
        },
        message: `Created comment on card **${ctx.input.cardId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.commentId) throw new Error('commentId is required to update a comment.');
      if (!ctx.input.text) throw new Error('Text is required to update a comment.');
      let comment = await client.updateComment(
        ctx.input.cardId,
        ctx.input.commentId,
        ctx.input.text
      );
      return {
        output: {
          commentId: comment?.comment_id ?? ctx.input.commentId,
          text: comment?.text,
          authorUserId: comment?.author_user_id ?? comment?.user_id,
          createdAt: comment?.created_at
        },
        message: `Updated comment **${ctx.input.commentId}** on card **${ctx.input.cardId}**.`
      };
    }

    // delete
    if (!ctx.input.commentId) throw new Error('commentId is required to delete a comment.');
    await client.deleteComment(ctx.input.cardId, ctx.input.commentId);
    return {
      output: {
        commentId: ctx.input.commentId,
        deleted: true
      },
      message: `Deleted comment **${ctx.input.commentId}** from card **${ctx.input.cardId}**.`
    };
  })
  .build();
