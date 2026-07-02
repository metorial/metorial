import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageComment = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `Create, update, or delete a comment on a document. Comments support threaded replies via parentCommentId.
The comment data uses ProseMirror JSON format for rich text.`,
  instructions: [
    'Comment data uses ProseMirror JSON format. For simple text, use: { "type": "doc", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Your comment" }] }] }'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      commentId: z.string().optional().describe('Comment ID (required for update and delete)'),
      documentId: z.string().optional().describe('Document ID (required for create)'),
      parentCommentId: z
        .string()
        .optional()
        .describe('Parent comment ID for creating a threaded reply'),
      content: z.any().optional().describe('Comment content in ProseMirror JSON format')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      documentId: z.string().optional(),
      action: z.string(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.documentId)
          throw new Error('documentId is required when creating a comment');
        if (!ctx.input.content) throw new Error('content is required when creating a comment');
        let comment = await client.createComment({
          documentId: ctx.input.documentId,
          parentCommentId: ctx.input.parentCommentId,
          data: ctx.input.content
        });
        return {
          output: {
            commentId: comment.id,
            documentId: comment.documentId,
            action,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt
          },
          message: `Created comment on document.`
        };
      }
      case 'update': {
        if (!ctx.input.commentId) throw new Error('commentId is required when updating');
        if (!ctx.input.content) throw new Error('content is required when updating a comment');
        let comment = await client.updateComment({
          id: ctx.input.commentId,
          data: ctx.input.content
        });
        return {
          output: {
            commentId: comment.id,
            documentId: comment.documentId,
            action,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt
          },
          message: `Updated comment.`
        };
      }
      case 'delete': {
        if (!ctx.input.commentId) throw new Error('commentId is required when deleting');
        await client.deleteComment(ctx.input.commentId);
        return {
          output: {
            commentId: ctx.input.commentId,
            action
          },
          message: `Deleted comment.`
        };
      }
    }
  })
  .build();
