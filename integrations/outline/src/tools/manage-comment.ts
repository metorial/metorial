import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { commentOutput, mapComment } from '../lib/schemas';
import { rejectFields, requireValue, validateJson } from '../lib/validation';
import { spec } from '../spec';
export const manageComment = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description:
    'Create, read, update or delete a comment. Provide rich-text ProseMirror JSON content or Markdown text; comments may notify workspace members.'
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'get']),
      commentId: z
        .string()
        .optional()
        .describe('Exact comment ID required for get, update and delete'),
      documentId: z.string().optional().describe('Document UUID required for create'),
      parentCommentId: z.string().optional().describe('Parent comment for a threaded create'),
      content: z
        .any()
        .optional()
        .describe('ProseMirror JSON document; mutually exclusive with text'),
      text: z.string().optional().describe('Markdown comment; mutually exclusive with content')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      documentId: z.string().optional(),
      action: z.string(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      comment: commentOutput.optional()
    })
  )
  .handleInvocation(async ctx => {
    const { action } = ctx.input;
    rejectFields(ctx.input, [
      'action',
      ...(action === 'create'
        ? ['documentId', 'parentCommentId', 'content', 'text']
        : ['commentId', ...(action === 'update' ? ['content', 'text'] : [])])
    ]);
    requireValue(
      action === 'create' ? ctx.input.documentId : ctx.input.commentId,
      'Provide documentId for create, or commentId for the other actions.'
    );
    if (action === 'create' || action === 'update') {
      requireValue(
        (ctx.input.content !== undefined) !== (ctx.input.text !== undefined),
        'Provide exactly one of content or text.'
      );
      requireValue(
        ctx.input.content === undefined ||
          (validateJson(ctx.input.content) &&
            ctx.input.content !== null &&
            typeof ctx.input.content === 'object' &&
            !Array.isArray(ctx.input.content) &&
            ctx.input.content.type === 'doc'),
        'content must be a finite, acyclic ProseMirror JSON document with type doc.'
      );
      requireValue(
        ctx.input.text === undefined ||
          (ctx.input.text.length > 0 && ctx.input.text.length <= 10_000),
        'Use nonempty Markdown text up to 10,000 characters.'
      );
    }
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    if (action === 'delete') {
      await client.deleteComment(ctx.input.commentId!);
      return {
        output: { commentId: ctx.input.commentId!, action },
        message:
          'Outline accepted comment deletion. Notifications and event history may remain.'
      };
    }
    const comment =
      action === 'create'
        ? await client.createComment({
            documentId: ctx.input.documentId,
            parentCommentId: ctx.input.parentCommentId,
            data: ctx.input.content,
            text: ctx.input.text
          })
        : action === 'update'
          ? await client.updateComment({
              id: ctx.input.commentId!,
              data: ctx.input.content,
              text: ctx.input.text
            })
          : await client.getComment(ctx.input.commentId!);
    requireValue(
      action !== 'create' ||
        (comment.documentId === ctx.input.documentId &&
          (ctx.input.parentCommentId === undefined ||
            comment.parentCommentId === ctx.input.parentCommentId)),
      'Comment receipt belongs to a different document or thread. Inspect comments before retrying.'
    );
    return {
      output: {
        commentId: comment.id,
        documentId: comment.documentId,
        action,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        comment: mapComment(comment)
      },
      message: `Outline confirmed comment ${action}.`
    };
  })
  .build();
