import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Post, reply to, update, delete, or moderate comments on YouTube videos. Use "post" to create a new top-level comment, "reply" to respond to an existing comment, "update" to edit a comment, "delete" to remove one, or "moderate" to change moderation status.`,
  instructions: [
    'For posting a top-level comment: set action to "post" with videoId and text.',
    'For replying to a comment: set action to "reply" with parentCommentId and text.',
    'For updating: set action to "update" with commentId and text.',
    'For deleting: set action to "delete" with commentId.',
    'For moderating: set action to "moderate" with commentIds and moderationStatus.'
  ]
})
  .scopes(youtubeActionScopes.manageComments)
  .input(
    z.object({
      action: z
        .enum(['post', 'reply', 'update', 'delete', 'moderate'])
        .describe('Action to perform'),
      videoId: z.string().optional().describe('Video ID for posting a top-level comment'),
      channelId: z
        .string()
        .optional()
        .describe('Channel ID for posting a top-level comment (required for post)'),
      parentCommentId: z.string().optional().describe('Parent comment ID for replies'),
      commentId: z.string().optional().describe('Comment ID for update or delete'),
      commentIds: z.array(z.string()).optional().describe('Comment IDs for moderation'),
      text: z.string().optional().describe('Comment text (required for post, reply, update)'),
      moderationStatus: z
        .enum(['heldForReview', 'published', 'rejected'])
        .optional()
        .describe('Moderation status (for moderate action)'),
      banAuthor: z.boolean().optional().describe('Ban the author when moderating')
    })
  )
  .output(
    z.object({
      commentId: z.string().optional(),
      commentThreadId: z.string().optional(),
      authorName: z.string().optional(),
      textDisplay: z.string().optional(),
      publishedAt: z.string().optional(),
      deleted: z.boolean().optional(),
      moderated: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.action === 'post') {
      if (!ctx.input.videoId) throw youtubeServiceError('videoId is required for posting');
      if (!ctx.input.channelId) throw youtubeServiceError('channelId is required for posting');
      if (!ctx.input.text) throw youtubeServiceError('text is required for posting');

      let thread = await client.createCommentThread({
        part: ['snippet'],
        videoId: ctx.input.videoId,
        channelId: ctx.input.channelId,
        text: ctx.input.text
      });

      let topComment = thread.snippet?.topLevelComment;
      return {
        output: {
          commentThreadId: thread.id,
          commentId: topComment?.id,
          authorName: topComment?.snippet?.authorDisplayName,
          textDisplay: topComment?.snippet?.textDisplay,
          publishedAt: topComment?.snippet?.publishedAt
        },
        message: `Posted comment on video \`${ctx.input.videoId}\`.`
      };
    } else if (ctx.input.action === 'reply') {
      if (!ctx.input.parentCommentId)
        throw youtubeServiceError('parentCommentId is required for replies');
      if (!ctx.input.text) throw youtubeServiceError('text is required for replies');

      let comment = await client.createComment({
        part: ['snippet'],
        parentId: ctx.input.parentCommentId,
        text: ctx.input.text
      });

      return {
        output: {
          commentId: comment.id,
          authorName: comment.snippet?.authorDisplayName,
          textDisplay: comment.snippet?.textDisplay,
          publishedAt: comment.snippet?.publishedAt
        },
        message: `Replied to comment \`${ctx.input.parentCommentId}\`.`
      };
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.commentId)
        throw youtubeServiceError('commentId is required for updating');
      if (!ctx.input.text) throw youtubeServiceError('text is required for updating');

      let comment = await client.updateComment({
        part: ['snippet'],
        commentId: ctx.input.commentId,
        text: ctx.input.text
      });

      return {
        output: {
          commentId: comment.id,
          authorName: comment.snippet?.authorDisplayName,
          textDisplay: comment.snippet?.textDisplay,
          publishedAt: comment.snippet?.publishedAt
        },
        message: `Updated comment \`${ctx.input.commentId}\`.`
      };
    } else if (ctx.input.action === 'delete') {
      if (!ctx.input.commentId)
        throw youtubeServiceError('commentId is required for deleting');

      await client.deleteComment(ctx.input.commentId);

      return {
        output: { commentId: ctx.input.commentId, deleted: true },
        message: `Deleted comment \`${ctx.input.commentId}\`.`
      };
    } else {
      if (!ctx.input.commentIds || ctx.input.commentIds.length === 0)
        throw youtubeServiceError('commentIds is required for moderation');
      if (!ctx.input.moderationStatus)
        throw youtubeServiceError('moderationStatus is required for moderation');

      await client.setCommentModerationStatus({
        commentIds: ctx.input.commentIds,
        moderationStatus: ctx.input.moderationStatus,
        banAuthor: ctx.input.banAuthor
      });

      return {
        output: { moderated: true },
        message: `Set moderation status to **${ctx.input.moderationStatus}** for ${ctx.input.commentIds.length} comment(s).`
      };
    }
  })
  .build();
