import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { facebookServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Read, create, update, delete, or hide comments on a Facebook post or object.
Use \`action\` to specify the operation: **list** to retrieve comments, **create** to post a new comment, **update** to edit an existing comment, **delete** to remove a comment, or **hide** to toggle comment visibility.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'hide'])
        .describe('Action to perform'),
      objectId: z
        .string()
        .describe(
          'Post or object ID to list/create comments on, or comment ID for update/delete/hide'
        ),
      pageId: z
        .string()
        .optional()
        .describe('Page ID if acting on a Page post (used to obtain Page access token)'),
      message: z.string().optional().describe('Comment text (for create and update actions)'),
      isHidden: z
        .boolean()
        .optional()
        .describe('Whether to hide (true) or unhide (false) the comment (for hide action)'),
      limit: z
        .number()
        .optional()
        .describe('Max comments to return (for list action, default: 25)'),
      after: z.string().optional().describe('Pagination cursor (for list action)'),
      filter: z
        .enum(['toplevel', 'stream'])
        .optional()
        .describe('Comment filter for list action. Use stream to include replies.'),
      order: z
        .enum(['chronological', 'reverse_chronological'])
        .optional()
        .describe('Comment ordering for list action')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment ID'),
            message: z.string().describe('Comment text'),
            createdTime: z.string().describe('ISO timestamp of when the comment was created'),
            authorId: z.string().optional().describe('Comment author ID'),
            authorName: z.string().optional().describe('Comment author name'),
            likeCount: z.number().optional().describe('Number of likes on the comment'),
            replyCount: z.number().optional().describe('Number of replies to the comment'),
            parentCommentId: z.string().optional().describe('Parent comment ID for replies'),
            isHidden: z.boolean().optional().describe('Whether the comment is hidden')
          })
        )
        .optional()
        .describe('List of comments (for list action)'),
      commentId: z.string().optional().describe('Created or managed comment ID'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for update/delete/hide)'),
      nextCursor: z.string().optional().describe('Cursor for next page (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let pageAccessToken: string | undefined;
    if (ctx.input.pageId) {
      pageAccessToken = await client.getPageAccessToken(ctx.input.pageId);
    }

    if (ctx.input.action === 'list') {
      let result = await client.getComments(ctx.input.objectId, {
        limit: ctx.input.limit,
        after: ctx.input.after,
        filter: ctx.input.filter,
        order: ctx.input.order
      });

      return {
        output: {
          comments: result.data.map(c => ({
            commentId: c.id,
            message: c.message,
            createdTime: c.created_time,
            authorId: c.from?.id,
            authorName: c.from?.name,
            likeCount: c.like_count,
            replyCount: c.comment_count,
            parentCommentId: c.parent?.id,
            isHidden: c.is_hidden
          })),
          nextCursor: result.paging?.cursors?.after
        },
        message: `Retrieved **${result.data.length}** comment(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.message || ctx.input.message.trim().length === 0) {
        throw facebookServiceError('message is required for create action');
      }

      let result = await client.postComment(
        ctx.input.objectId,
        ctx.input.message,
        pageAccessToken
      );
      return {
        output: { commentId: result.id },
        message: `Created comment **${result.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.message || ctx.input.message.trim().length === 0) {
        throw facebookServiceError('message is required for update action');
      }

      await client.updateComment(ctx.input.objectId, ctx.input.message, pageAccessToken);
      return {
        output: { success: true, commentId: ctx.input.objectId },
        message: `Updated comment **${ctx.input.objectId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteComment(ctx.input.objectId, pageAccessToken);
      return {
        output: { success: true, commentId: ctx.input.objectId },
        message: `Deleted comment **${ctx.input.objectId}**.`
      };
    }

    // hide
    await client.hideComment(ctx.input.objectId, ctx.input.isHidden ?? true, pageAccessToken);
    return {
      output: { success: true, commentId: ctx.input.objectId },
      message:
        ctx.input.isHidden === false
          ? `Unhid comment **${ctx.input.objectId}**.`
          : `Hid comment **${ctx.input.objectId}**.`
    };
  })
  .build();
