import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchDocuments = SlateTool.create(spec, {
  name: 'Search Documents',
  key: 'search_documents',
  description: `Search across all documents in the Outline workspace using full-text search.
Returns matching documents with relevant context snippets and ranking scores.
Supports filtering by collection, user, date range, and document status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      collectionId: z.string().optional().describe('Filter results to a specific collection'),
      userId: z
        .string()
        .optional()
        .describe('Filter results to documents created by a specific user'),
      dateFilter: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe('Filter by time period'),
      statusFilter: z
        .array(z.enum(['published', 'draft', 'archived']))
        .optional()
        .describe('Filter by document status'),
      limit: z.number().optional().default(25).describe('Maximum number of results to return'),
      offset: z.number().optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          documentId: z.string(),
          title: z.string(),
          context: z.string().describe('Matching text snippet'),
          ranking: z.number(),
          collectionId: z.string().optional(),
          updatedAt: z.string(),
          createdBy: z.object({
            userId: z.string(),
            name: z.string()
          })
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

    let result = await client.searchDocuments({
      query: ctx.input.query,
      collectionId: ctx.input.collectionId,
      userId: ctx.input.userId,
      dateFilter: ctx.input.dateFilter,
      statusFilter: ctx.input.statusFilter,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let results = (result.data || []).map(item => ({
      documentId: item.document.id,
      title: item.document.title,
      context: item.context,
      ranking: item.ranking,
      collectionId: item.document.collectionId,
      updatedAt: item.document.updatedAt,
      createdBy: {
        userId: item.document.createdBy.id,
        name: item.document.createdBy.name
      }
    }));

    return {
      output: {
        results,
        total: results.length
      },
      message: `Found **${results.length}** documents matching "${ctx.input.query}".`
    };
  })
  .build();
