import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List comments on a document or across a collection. Returns comment content, author, and thread structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().optional().describe('Filter comments to a specific document'),
      collectionId: z
        .string()
        .optional()
        .describe('Filter comments to documents in a specific collection'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of comments to return'),
      offset: z.number().optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentId: z.string(),
          documentId: z.string(),
          parentCommentId: z.string().optional(),
          content: z.any().describe('Comment content in ProseMirror JSON format'),
          createdAt: z.string(),
          updatedAt: z.string(),
          createdBy: z.object({ userId: z.string(), name: z.string() })
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listComments({
      documentId: ctx.input.documentId,
      collectionId: ctx.input.collectionId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let comments = (result.data || []).map(c => ({
      commentId: c.id,
      documentId: c.documentId,
      parentCommentId: c.parentCommentId,
      content: c.data,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      createdBy: { userId: c.createdBy.id, name: c.createdBy.name }
    }));

    return {
      output: {
        comments,
        total: comments.length
      },
      message: `Found **${comments.length}** comments.`
    };
  })
  .build();
