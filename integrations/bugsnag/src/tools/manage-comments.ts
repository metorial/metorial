import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
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
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...pageInput,
      perPage: z.number().optional().describe('Comments per page for list (1 to 100)'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      projectId: z.string().describe('Project ID'),
      errorId: z.string().optional().describe('Error ID (required for list and create)'),
      commentId: z.string().optional().describe('Comment ID (required for update and delete)'),
      message: z.string().optional().describe('Comment text (required for create and update)')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      comments: z
        .array(commentSchema)
        .optional()
        .describe('List of comments (for list action)'),
      comment: commentSchema.optional().describe('Created/updated comment'),
      deleted: z.boolean().optional().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    if (ctx.input.action === 'list') {
      if (!ctx.input.errorId)
        throw createApiServiceError('Error ID is required to list comments.');

      let comments = await client.listComments(projectId, ctx.input.errorId, ctx.input);
      let mapped = comments.map(c => ({
        commentId: c.id ?? undefined,
        message: c.message ?? undefined,
        authorName: c.collaborator?.name ?? undefined,
        authorEmail: c.collaborator?.email ?? undefined,
        createdAt: c.created_at ?? undefined,
        updatedAt: c.updated_at ?? undefined
      }));

      return {
        output: { comments: mapped, ...client.pageInfo },
        message: `Found **${mapped.length}** comment(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.errorId)
        throw createApiServiceError('Error ID is required to create a comment.');
      if (!ctx.input.message?.trim()) throw createApiServiceError('Message is required.');

      let result = await client.createComment(projectId, ctx.input.errorId, ctx.input.message);

      return {
        output: {
          comment: {
            commentId: result.id ?? undefined,
            message: result.message ?? undefined,
            authorName: result.collaborator?.name ?? undefined,
            authorEmail: result.collaborator?.email ?? undefined,
            createdAt: result.created_at ?? undefined
          }
        },
        message: `Created comment on error \`${ctx.input.errorId}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.commentId) throw createApiServiceError('Comment ID is required.');
      if (!ctx.input.message?.trim()) throw createApiServiceError('Message is required.');

      let result = await client.updateComment(ctx.input.commentId, ctx.input.message);

      return {
        output: {
          comment: {
            commentId: result.id ?? undefined,
            message: result.message ?? undefined,
            authorName: result.collaborator?.name ?? undefined,
            authorEmail: result.collaborator?.email ?? undefined,
            createdAt: result.created_at ?? undefined,
            updatedAt: result.updated_at ?? undefined
          }
        },
        message: `Updated comment \`${ctx.input.commentId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.commentId) throw createApiServiceError('Comment ID is required.');

      await client.deleteComment(ctx.input.commentId);

      return {
        output: { deleted: true },
        message: `Deleted comment \`${ctx.input.commentId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
