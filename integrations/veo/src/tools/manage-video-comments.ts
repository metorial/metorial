import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageVideoComments = SlateTool.create(spec, {
  name: 'Manage Video Comments',
  key: 'manage_video_comments',
  description: `List, create, or delete comments on a VEO video. Comments support threaded replies (max 2 levels deep). You cannot reply to a reply.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      videoId: z.string().describe('ID of the video'),
      action: z
        .enum(['list', 'create', 'delete'])
        .describe(
          'Action: "list" to get comments, "create" to add a comment, "delete" to remove one'
        ),
      message: z.string().optional().describe('Comment text (required for "create")'),
      parentCommentId: z
        .number()
        .optional()
        .describe('ID of the parent comment for threaded replies (optional for "create")'),
      commentId: z
        .string()
        .optional()
        .describe('ID of the comment to delete (required for "delete")')
    })
  )
  .output(
    z.object({
      comments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of comments with nested replies (when action is "list")'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    if (ctx.input.action === 'list') {
      let comments = await client.getVideoComments(ctx.input.videoId);
      let commentList = Array.isArray(comments) ? comments : [];

      return {
        output: { comments: commentList, success: true },
        message: `Retrieved **${commentList.length}** comments for video \`${ctx.input.videoId}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.message) {
        throw new Error('message is required when creating a comment');
      }
      await client.createVideoComment(
        ctx.input.videoId,
        ctx.input.message,
        ctx.input.parentCommentId
      );

      return {
        output: { success: true },
        message: `Added comment to video \`${ctx.input.videoId}\`${ctx.input.parentCommentId ? ' (reply)' : ''}.`
      };
    }

    if (!ctx.input.commentId) {
      throw new Error('commentId is required when deleting a comment');
    }
    await client.deleteVideoComment(ctx.input.videoId, ctx.input.commentId);

    return {
      output: { success: true },
      message: `Deleted comment \`${ctx.input.commentId}\` from video \`${ctx.input.videoId}\`.`
    };
  })
  .build();
