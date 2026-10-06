import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { authorOutput, optionalText, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';
export const searchDocuments = SlateTool.create(spec, {
  name: 'Search Documents',
  key: 'search_documents',
  description:
    'Search one page of authorized documents by text, collection, editor, updated period or status. total counts this page only.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      collectionId: z.string().optional().describe('Filter results to a specific collection'),
      userId: z
        .string()
        .optional()
        .describe('Filter results to documents edited by a specific user'),
      dateFilter: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe('Filter by time period'),
      statusFilter: z
        .array(z.enum(['published', 'draft', 'archived']))
        .optional()
        .describe('Filter by document status'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Maximum number of results to return'),
      offset: z.number().int().min(0).optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          documentId: z.string(),
          title: z.string(),
          context: z.string(),
          ranking: z.number(),
          collectionId: optionalText,
          updatedAt: z.string(),
          createdBy: authorOutput
        })
      ),
      total: z.number(),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    const result = await client.searchDocuments(ctx.input);
    const results = result.data.map(item => ({
      documentId: item.document.id,
      title: item.document.title,
      context: item.context,
      ranking: item.ranking,
      collectionId: item.document.collectionId,
      updatedAt: item.document.updatedAt,
      createdBy: { userId: item.document.createdBy.id, name: item.document.createdBy.name }
    }));
    return {
      output: { results, total: results.length, pagination: result.pagination },
      message: `Returned ${results.length} matching documents on this page.`
    };
  })
  .build();
