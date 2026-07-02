import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let managePodioComment = SlateTool.create(spec, {
  name: 'Manage Podio Comment',
  key: 'manage_podio_comment',
  description: `Create, read, or delete comments on Podio items.
- **create**: Add a comment to a Podio item with optional hook and silent flags.
- **get**: Retrieve a comment's full payload by comment ID.
- **delete**: Remove a comment by its ID.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']).describe('The action to perform'),
      podioItemId: z.string().optional().describe('The Podio item ID (required for create)'),
      commentId: z
        .string()
        .optional()
        .describe('The comment ID (required for get and delete)'),
      text: z.string().optional().describe('The comment text (required for create)'),
      triggerHooks: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to trigger Podio hook events (create only)'),
      silent: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to suppress notifications (create only)')
    })
  )
  .output(
    z.object({
      commentId: z.string().optional().describe('The comment ID (for create and get)'),
      comment: z.any().optional().describe('The comment data (for get)'),
      result: z.any().optional().describe('The operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.podioItemId || !ctx.input.text) {
        throw new Error('podioItemId and text are required for creating a comment');
      }
      let result = await client.createComment(
        ctx.input.podioItemId,
        ctx.input.text,
        ctx.input.triggerHooks,
        ctx.input.silent
      );
      let commentId =
        typeof result === 'object' && result !== null
          ? String(result.comment_id ?? result)
          : String(result);

      return {
        output: { commentId, result },
        message: `Created comment **${commentId}** on item **${ctx.input.podioItemId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.commentId) {
        throw new Error('commentId is required for getting a comment');
      }
      let comment = await client.getCommentRaw(ctx.input.commentId);
      return {
        output: { commentId: ctx.input.commentId, comment },
        message: `Retrieved comment **${ctx.input.commentId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.commentId) {
        throw new Error('commentId is required for deleting a comment');
      }
      let result = await client.deleteComment(ctx.input.commentId);
      return {
        output: { commentId: ctx.input.commentId, result },
        message: `Deleted comment **${ctx.input.commentId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
