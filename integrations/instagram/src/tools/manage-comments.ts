import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { instagramServiceError } from '../lib/errors';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  text: z.string().optional().describe('Comment text'),
  timestamp: z.string().optional().describe('ISO 8601 timestamp'),
  commenterId: z.string().optional().describe('Instagram-scoped ID of the commenter'),
  username: z.string().optional().describe('Username of the commenter'),
  hidden: z.boolean().optional().describe('Whether the comment is hidden'),
  likeCount: z.number().optional().describe('Number of likes on the comment'),
  replies: z
    .array(
      z.object({
        commentId: z.string().describe('Reply ID'),
        text: z.string().optional().describe('Reply text'),
        timestamp: z.string().optional().describe('ISO 8601 timestamp'),
        commenterId: z.string().optional().describe('Instagram-scoped ID of the replier'),
        username: z.string().optional().describe('Username of the replier'),
        hidden: z.boolean().optional().describe('Whether the reply is hidden'),
        likeCount: z.number().optional().describe('Number of likes on the reply')
      })
    )
    .optional()
    .describe('Replies to the comment')
});

let mapComment = (comment: any) => ({
  commentId: comment.id,
  text: comment.text,
  timestamp: comment.timestamp,
  commenterId: comment.from?.id,
  username: comment.username ?? comment.from?.username,
  hidden: comment.hidden,
  likeCount: comment.like_count,
  replies: comment.replies?.data?.map(mapComment)
});

export let manageCommentsTool = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Create, retrieve, reply to, delete, or hide/unhide comments on Instagram media. Also supports listing replies and enabling or disabling comments on a specific post. Use the \`action\` field to specify what operation to perform.`,
  instructions: [
    'Use action "list" to get all comments on a post.',
    'Use action "list_replies" to get replies for a specific comment.',
    'Use action "comment" to add a top-level comment on a post.',
    'Use action "reply" to reply to a specific comment.',
    'Use action "delete" to remove a comment.',
    'Use action "hide" / "unhide" to toggle comment visibility.',
    'Use action "enable" / "disable" to toggle commenting on a post.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'list_replies',
          'comment',
          'reply',
          'delete',
          'hide',
          'unhide',
          'enable',
          'disable'
        ])
        .describe('The comment action to perform'),
      mediaId: z
        .string()
        .optional()
        .describe(
          'Media ID — required for "list", "comment", "enable", and "disable" actions'
        ),
      commentId: z
        .string()
        .optional()
        .describe(
          'Comment ID — required for "list_replies", "reply", "delete", "hide", and "unhide" actions'
        ),
      message: z
        .string()
        .optional()
        .describe('Comment text — required for "comment" and "reply" actions'),
      limit: z
        .number()
        .optional()
        .describe('Number of comments/replies to return for list actions (default: 50)'),
      cursor: z.string().optional().describe('Pagination cursor for list actions')
    })
  )
  .output(
    z.object({
      comments: z
        .array(commentSchema)
        .optional()
        .describe('List of comments (for "list" action)'),
      commentId: z.string().optional().describe('ID of the created reply or affected comment'),
      success: z.boolean().describe('Whether the action was successful'),
      nextCursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.mediaId)
        throw instagramServiceError('mediaId is required for "list" action');
      let result = await client.getComments(ctx.input.mediaId, {
        limit: ctx.input.limit,
        after: ctx.input.cursor
      });

      let comments = (result.data || []).map(mapComment);

      return {
        output: {
          comments,
          success: true,
          nextCursor: result.paging?.cursors?.after
        },
        message: `Retrieved **${comments.length}** comments on media ${ctx.input.mediaId}.`
      };
    }

    if (action === 'list_replies') {
      if (!ctx.input.commentId)
        throw instagramServiceError('commentId is required for "list_replies" action');
      let result = await client.getCommentReplies(ctx.input.commentId, {
        limit: ctx.input.limit,
        after: ctx.input.cursor
      });

      let comments = (result.data || []).map(mapComment);

      return {
        output: {
          comments,
          success: true,
          nextCursor: result.paging?.cursors?.after
        },
        message: `Retrieved **${comments.length}** replies for comment ${ctx.input.commentId}.`
      };
    }

    if (action === 'comment') {
      if (!ctx.input.mediaId)
        throw instagramServiceError('mediaId is required for "comment" action');
      if (!ctx.input.message)
        throw instagramServiceError('message is required for "comment" action');

      let result = await client.createComment(ctx.input.mediaId, ctx.input.message);
      return {
        output: {
          commentId: result.id,
          success: true
        },
        message: `Commented on media ${ctx.input.mediaId}.`
      };
    }

    if (action === 'reply') {
      if (!ctx.input.commentId)
        throw instagramServiceError('commentId is required for "reply" action');
      if (!ctx.input.message)
        throw instagramServiceError('message is required for "reply" action');

      let result = await client.replyToComment(ctx.input.commentId, ctx.input.message);
      return {
        output: {
          commentId: result.id,
          success: true
        },
        message: `Replied to comment ${ctx.input.commentId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.commentId)
        throw instagramServiceError('commentId is required for "delete" action');
      await client.deleteComment(ctx.input.commentId);
      return {
        output: {
          commentId: ctx.input.commentId,
          success: true
        },
        message: `Deleted comment ${ctx.input.commentId}.`
      };
    }

    if (action === 'hide' || action === 'unhide') {
      if (!ctx.input.commentId)
        throw instagramServiceError('commentId is required for "hide"/"unhide" action');
      await client.hideComment(ctx.input.commentId, action === 'hide');
      return {
        output: {
          commentId: ctx.input.commentId,
          success: true
        },
        message: `${action === 'hide' ? 'Hidden' : 'Unhidden'} comment ${ctx.input.commentId}.`
      };
    }

    if (action === 'enable' || action === 'disable') {
      if (!ctx.input.mediaId)
        throw instagramServiceError('mediaId is required for "enable"/"disable" action');
      await client.toggleComments(ctx.input.mediaId, action === 'enable');
      return {
        output: {
          success: true
        },
        message: `Comments ${action === 'enable' ? 'enabled' : 'disabled'} on media ${ctx.input.mediaId}.`
      };
    }

    throw instagramServiceError(`Unknown action: ${action}`);
  })
  .build();
