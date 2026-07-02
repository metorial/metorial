import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageComment = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `Add, edit, or delete a comment on a question or answer. Adding a comment requires the post ID; editing or deleting requires the comment ID. Requires OAuth with **write_access** scope.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'edit', 'delete']).describe('The action to perform'),
      postId: z
        .string()
        .optional()
        .describe('ID of the question or answer to comment on (required for "add")'),
      commentId: z
        .string()
        .optional()
        .describe('ID of the comment to edit or delete (required for "edit" and "delete")'),
      body: z.string().optional().describe('Comment text (required for "add" and "edit")')
    })
  )
  .output(
    z.object({
      commentId: z.number().optional().describe('ID of the created or edited comment'),
      body: z.string().optional().describe('Text of the comment'),
      creationDate: z.string().optional().describe('When the comment was created (ISO 8601)'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let { action, postId, commentId, body } = ctx.input;

    if (action === 'add') {
      if (!postId) throw new Error('postId is required to add a comment.');
      if (!body) throw new Error('body is required to add a comment.');
      let result = await client.addComment(postId, body);
      let comment = result.items[0];
      return {
        output: {
          commentId: comment?.comment_id,
          body: comment?.body,
          creationDate: comment?.creation_date
            ? new Date(comment.creation_date * 1000).toISOString()
            : undefined,
          success: true
        },
        message: `Comment added to post **#${postId}**.`
      };
    }

    if (action === 'edit') {
      if (!commentId) throw new Error('commentId is required to edit a comment.');
      if (!body) throw new Error('body is required to edit a comment.');
      let result = await client.editComment(commentId, body);
      let comment = result.items[0];
      return {
        output: {
          commentId: comment?.comment_id,
          body: comment?.body,
          creationDate: comment?.creation_date
            ? new Date(comment.creation_date * 1000).toISOString()
            : undefined,
          success: true
        },
        message: `Comment **#${commentId}** edited.`
      };
    }

    if (action === 'delete') {
      if (!commentId) throw new Error('commentId is required to delete a comment.');
      await client.deleteComment(commentId);
      return {
        output: { success: true },
        message: `Comment **#${commentId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
