import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  message: z.string().optional().describe('Comment text'),
  authorName: z.string().optional().describe('Author name'),
  authorEmail: z.string().optional().describe('Author email'),
  createdAt: z.string().optional().describe('When the comment was created'),
  updatedAt: z.string().optional().describe('When the comment was last updated')
});

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `List, create, update, or delete comments on a Bugsnag error. Comments are used for team collaboration on error investigation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      projectId: z.string().describe('Project ID'),
      errorId: z.string().optional().describe('Error ID (required for list and create)'),
      commentId: z.string().optional().describe('Comment ID (required for update and delete)'),
      message: z.string().optional().describe('Comment text (required for create and update)')
    })
  )
  .output(
    z.object({
      comments: z
        .array(commentSchema)
        .optional()
        .describe('List of comments (for list action)'),
      comment: commentSchema.optional().describe('Created/updated comment'),
      deleted: z.boolean().optional().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    if (ctx.input.action === 'list') {
      if (!ctx.input.errorId) throw new Error('Error ID is required to list comments.');

      let comments = await client.listComments(projectId, ctx.input.errorId);
      let mapped = comments.map((c: any) => ({
        commentId: c.id,
        message: c.message,
        authorName: c.author?.name,
        authorEmail: c.author?.email,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }));

      return {
        output: { comments: mapped },
        message: `Found **${mapped.length}** comment(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.errorId) throw new Error('Error ID is required to create a comment.');
      if (!ctx.input.message) throw new Error('Message is required.');

      let result = await client.createComment(projectId, ctx.input.errorId, ctx.input.message);

      return {
        output: {
          comment: {
            commentId: result.id,
            message: result.message,
            authorName: result.author?.name,
            authorEmail: result.author?.email,
            createdAt: result.created_at
          }
        },
        message: `Created comment on error \`${ctx.input.errorId}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.commentId) throw new Error('Comment ID is required.');
      if (!ctx.input.message) throw new Error('Message is required.');

      let result = await client.updateComment(ctx.input.commentId, ctx.input.message);

      return {
        output: {
          comment: {
            commentId: result.id,
            message: result.message,
            authorName: result.author?.name,
            authorEmail: result.author?.email,
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Updated comment \`${ctx.input.commentId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.commentId) throw new Error('Comment ID is required.');

      await client.deleteComment(ctx.input.commentId);

      return {
        output: { deleted: true },
        message: `Deleted comment \`${ctx.input.commentId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
