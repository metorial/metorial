import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let searchDocumentsTool = SlateTool.create(spec, {
  name: 'Search Documents',
  key: 'search_documents',
  description: `Search and query documents in Elasticsearch using the full Query DSL. Supports full-text search, term-level queries, compound queries, aggregations, sorting, pagination, and source filtering. Can target a specific index or search across all indices.`,
  instructions: [
    'Use the "query" field for Query DSL queries (match, term, bool, range, etc.)',
    'Use "aggregations" for analytics like metrics, bucketing, and pipeline aggregations',
    'Use "sort" to control result ordering, and "from"/"size" for pagination',
    'Use "sourceFilter" to limit which fields are returned in the results'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      indexName: z.string().optional().describe('Index to search. Omit to search all indices'),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Elasticsearch Query DSL query object (e.g. { "match": { "title": "hello" } })'
        ),
      aggregations: z
        .record(z.string(), z.any())
        .optional()
        .describe('Aggregation definitions for analytics'),
      sort: z
        .array(z.any())
        .optional()
        .describe('Sort criteria (e.g. [{ "timestamp": "desc" }])'),
      from: z.number().optional().describe('Starting offset for pagination (default: 0)'),
      size: z.number().optional().describe('Number of results to return (default: 10)'),
      sourceFilter: z
        .union([
          z.boolean(),
          z.array(z.string()),
          z.object({
            includes: z.array(z.string()).optional(),
            excludes: z.array(z.string()).optional()
          })
        ])
        .optional()
        .describe('Control which source fields are returned'),
      highlight: z
        .record(z.string(), z.any())
        .optional()
        .describe('Highlight configuration for search results')
    })
  )
  .output(
    z.object({
      totalHits: z.number().describe('Total number of matching documents'),
      totalRelation: z.string().describe('Whether total is exact (eq) or a lower bound (gte)'),
      maxScore: z.number().nullable().describe('Maximum relevance score across results'),
      hits: z
        .array(
          z.object({
            indexName: z.string().describe('Index containing the document'),
            documentId: z.string().describe('Document ID'),
            score: z.number().nullable().describe('Relevance score'),
            source: z
              .record(z.string(), z.any())
              .optional()
              .describe('Document source fields'),
            highlight: z.record(z.string(), z.any()).optional().describe('Highlighted fields')
          })
        )
        .describe('Matching documents'),
      aggregations: z.record(z.string(), z.any()).optional().describe('Aggregation results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let body: Record<string, any> = {};
    if (ctx.input.query) body.query = ctx.input.query;
    if (ctx.input.aggregations) body.aggs = ctx.input.aggregations;
    if (ctx.input.sort) body.sort = ctx.input.sort;
    if (ctx.input.from !== undefined) body.from = ctx.input.from;
    if (ctx.input.size !== undefined) body.size = ctx.input.size;
    if (ctx.input.sourceFilter !== undefined) body._source = ctx.input.sourceFilter;
    if (ctx.input.highlight) body.highlight = ctx.input.highlight;

    let result = await client.search(ctx.input.indexName, body);

    let hits = (result.hits?.hits || []).map((hit: any) => ({
      indexName: hit._index,
      documentId: hit._id,
      score: hit._score,
      source: hit._source,
      highlight: hit.highlight
    }));

    let total = result.hits?.total;
    let totalHits = typeof total === 'number' ? total : total?.value || 0;
    let totalRelation = typeof total === 'number' ? 'eq' : total?.relation || 'eq';

    return {
      output: {
        totalHits,
        totalRelation,
        maxScore: result.hits?.max_score ?? null,
        hits,
        aggregations: result.aggregations
      },
      message: `Found **${totalHits}** documents${ctx.input.indexName ? ` in index **${ctx.input.indexName}**` : ''}. Returned **${hits.length}** results.`
    };
  })
  .build();
