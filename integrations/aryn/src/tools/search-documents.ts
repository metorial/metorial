import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchDocuments = SlateTool.create(spec, {
  name: 'Search Documents',
  key: 'search_documents',
  description: `Search over documents and metadata in a DocSet using vector, keyword, lexical, or hybrid search. Returns matching documents or elements (chunks) based on search criteria.

Supports property-based filtering to narrow results, and can return results at the document level or the element (chunk) level.`,
  instructions: [
    'Use queryType "hybrid" for best results combining semantic and keyword matching.',
    'Use returnType "element" to get chunk-level results, or "doc" for document-level results.',
    'Use propertiesFilter for boolean expressions to filter by document properties, e.g. "status == \'active\'".'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to search'),
      query: z.string().optional().describe('Search query text'),
      queryType: z
        .enum(['keyword', 'lexical', 'vector', 'hybrid'])
        .optional()
        .default('lexical')
        .describe(
          'Search type: keyword (substring match), lexical (full text), vector (semantic), or hybrid (combined)'
        ),
      propertiesFilter: z
        .string()
        .optional()
        .describe('Boolean filter expression on document properties'),
      returnType: z
        .enum(['doc', 'element'])
        .optional()
        .default('doc')
        .describe('Return documents or individual elements/chunks'),
      includeFields: z
        .array(z.string())
        .optional()
        .describe('JsonPath fields to include in results'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)'),
      pageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Search results (documents or elements)'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.info(`Searching documents in DocSet ${ctx.input.docsetId}`);

    let result = await client.search(ctx.input.docsetId, {
      query: ctx.input.query,
      queryType: ctx.input.queryType,
      propertiesFilter: ctx.input.propertiesFilter,
      returnType: ctx.input.returnType,
      includeFields: ctx.input.includeFields,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    return {
      output: {
        results: result.results ?? [],
        nextPageToken: result.next_page_token
      },
      message: `Found **${result.results?.length ?? 0}** result(s) using **${ctx.input.queryType}** search.`
    };
  })
  .build();
