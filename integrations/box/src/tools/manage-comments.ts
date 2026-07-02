import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { boxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Add, list, update, or delete comments on a Box file. Use tagged messages to @mention users in comments.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'update', 'delete'])
        .describe('The comment operation to perform'),
      fileId: z.string().optional().describe('File ID (required for create and list)'),
      commentId: z.string().optional().describe('Comment ID (required for update and delete)'),
      message: z.string().optional().describe('Comment message text (for create and update)'),
      taggedMessage: z
        .string()
        .optional()
        .describe('Comment with @mentions using format @[user_id:user_name] (for create)')
    })
  )
  .output(
    z.object({
      commentId: z.string().optional().describe('ID of the created/updated comment'),
      message: z.string().optional().describe('Comment message text'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      createdBy: z.string().optional().describe('Name of the comment author'),
      deleted: z.boolean().optional().describe('True if the comment was deleted'),
      comments: z
        .array(
          z.object({
            commentId: z.string(),
            message: z.string().optional(),
            createdAt: z.string().optional(),
            createdBy: z.string().optional()
          })
        )
        .optional()
        .describe('List of comments on the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, fileId, commentId, message: msg, taggedMessage } = ctx.input;

    if (action === 'list') {
      if (!fileId) throw boxServiceError('fileId is required for list action');
      let comments = await client.getComments(fileId);
      let mapped = comments.map((c: any) => ({
        commentId: c.id,
        message: c.message,
        createdAt: c.created_at,
        createdBy: c.created_by?.name
      }));
      return {
        output: { comments: mapped },
        message: `Found ${mapped.length} comment(s) on file ${fileId}.`
      };
    }

    if (action === 'create') {
      if (!fileId) throw boxServiceError('fileId is required for create action');
      if (!msg && !taggedMessage)
        throw boxServiceError('message or taggedMessage is required for create action');
      let comment = await client.addComment(fileId, msg || '', taggedMessage);
      return {
        output: {
          commentId: comment.id,
          message: comment.message,
          createdAt: comment.created_at,
          createdBy: comment.created_by?.name
        },
        message: `Added comment to file ${fileId}.`
      };
    }

    if (action === 'update') {
      if (!commentId) throw boxServiceError('commentId is required for update action');
      if (!msg) throw boxServiceError('message is required for update action');
      let comment = await client.updateComment(commentId, msg);
      return {
        output: {
          commentId: comment.id,
          message: comment.message,
          createdAt: comment.created_at,
          createdBy: comment.created_by?.name
        },
        message: `Updated comment ${commentId}.`
      };
    }

    // delete
    if (!commentId) throw boxServiceError('commentId is required for delete action');
    await client.deleteComment(commentId);
    return {
      output: { commentId, deleted: true },
      message: `Deleted comment ${commentId}.`
    };
  });
