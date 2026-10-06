import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { commentOutput, mapComment, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';
export const listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description:
    'List one page of comments on a document or across a collection, with authors and thread structure. total counts this page only.',
  tags: { readOnly: true }
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
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Maximum number of comments to return'),
      offset: z.number().int().min(0).optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      comments: z.array(commentOutput),
      total: z.number().describe('Number of records on this page'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    const result = await client.listComments(ctx.input);
    const comments = result.data.map(mapComment);
    return {
      output: { comments, total: comments.length, pagination: result.pagination },
      message: `Returned ${comments.length} comments on this page.`
    };
  })
  .build();
