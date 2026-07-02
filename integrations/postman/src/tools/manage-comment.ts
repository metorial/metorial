import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCommentTool = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `Create, list, update, or delete comments on Postman collections, folders, requests, responses, and APIs. Comments enable team collaboration directly on API artifacts.`,
  instructions: [
    'For entityType "folder", "request", or "response", you must also provide collectionId as the parent entity.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'update', 'delete']).describe('Operation to perform'),
      entityType: z
        .enum(['collection', 'folder', 'request', 'response', 'api'])
        .describe('Type of entity to comment on'),
      entityId: z
        .string()
        .describe(
          'ID of the entity (collection ID, folder ID, request ID, response ID, or API ID)'
        ),
      collectionId: z
        .string()
        .optional()
        .describe(
          'Parent collection ID (required when entityType is folder, request, or response)'
        ),
      commentId: z.number().optional().describe('Comment ID (required for update and delete)'),
      body: z.string().optional().describe('Comment text (required for create and update)')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.number().optional(),
            body: z.string().optional(),
            createdBy: z.number().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      comment: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, entityType, entityId, collectionId, commentId, body } = ctx.input;

    if (action === 'list') {
      let comments = await client.listComments(entityType, entityId, collectionId);
      let result = comments.map((c: any) => ({
        commentId: c.id,
        body: c.body,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }));
      return {
        output: { comments: result },
        message: `Found **${result.length}** comment(s) on ${entityType} **${entityId}**.`
      };
    }

    if (action === 'create') {
      if (!body) throw new Error('body is required for create.');
      let result = await client.createComment(entityType, entityId, body, collectionId);
      return {
        output: { comment: result },
        message: `Created comment on ${entityType} **${entityId}**.`
      };
    }

    if (action === 'update') {
      if (!commentId) throw new Error('commentId is required for update.');
      if (!body) throw new Error('body is required for update.');
      let result = await client.updateComment(
        entityType,
        entityId,
        commentId,
        body,
        collectionId
      );
      return {
        output: { comment: result },
        message: `Updated comment **${commentId}** on ${entityType} **${entityId}**.`
      };
    }

    if (!commentId) throw new Error('commentId is required for delete.');
    await client.deleteComment(entityType, entityId, commentId, collectionId);
    return {
      output: { comment: { commentId } },
      message: `Deleted comment **${commentId}** from ${entityType} **${entityId}**.`
    };
  })
  .build();
