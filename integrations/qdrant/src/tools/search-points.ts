import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let searchPoints = SlateTool.create(spec, {
  name: 'Search Points',
  key: 'search_points',
  description: `Performs vector similarity search using the universal query API. Finds the closest points to a query vector, with optional filtering, score thresholds, and support for named vector spaces. This is the primary search mechanism for semantic/neural search.`,
  instructions: [
    'Provide a `queryVector` as an array of numbers for dense vector similarity search.',
    'For named vector collections, specify the `vectorName` to search against.',
    'Use `filter` with Qdrant filter syntax (must/should/must_not clauses) to narrow results.',
    'Use `prefetch` for hybrid search combining dense and sparse vectors with fusion.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to search'),
      queryVector: z
        .any()
        .optional()
        .describe(
          'Query vector (array of numbers) or a complex query object (e.g., {fusion: "rrf"} for hybrid search)'
        ),
      filter: z
        .any()
        .optional()
        .describe('Filter conditions to narrow search (Qdrant filter syntax)'),
      limit: z.number().optional().describe('Maximum number of results (default: 10)'),
      offset: z.number().optional().describe('Number of results to skip'),
      scoreThreshold: z.number().optional().describe('Minimum score threshold for results'),
      vectorName: z
        .string()
        .optional()
        .describe('Name of the vector space to search (for named vector collections)'),
      withPayload: z
        .boolean()
        .optional()
        .describe('Include payloads in results (default: true)'),
      withVector: z
        .boolean()
        .optional()
        .describe('Include vectors in results (default: false)'),
      prefetch: z
        .any()
        .optional()
        .describe('Prefetch configuration for hybrid/multi-stage search'),
      searchParams: z
        .object({
          hnswEf: z.number().optional().describe('HNSW ef parameter for search accuracy'),
          exact: z.boolean().optional().describe('Use exact search instead of approximate')
        })
        .optional()
        .describe('Search algorithm parameters')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            pointId: z.union([z.number(), z.string()]).describe('Point identifier'),
            score: z.number().describe('Similarity score'),
            version: z.number().optional().describe('Point version'),
            payload: z.any().optional().describe('Point payload'),
            vector: z.any().optional().describe('Point vector (if requested)')
          })
        )
        .describe('Search results ordered by similarity score')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let params: any;
    if (ctx.input.searchParams) {
      params = {};
      if (ctx.input.searchParams.hnswEf !== undefined)
        params.hnsw_ef = ctx.input.searchParams.hnswEf;
      if (ctx.input.searchParams.exact !== undefined)
        params.exact = ctx.input.searchParams.exact;
    }

    let results = await client.queryPoints(ctx.input.collectionName, {
      query: ctx.input.queryVector,
      filter: ctx.input.filter,
      limit: ctx.input.limit ?? 10,
      offset: ctx.input.offset,
      withPayload: ctx.input.withPayload ?? true,
      withVector: ctx.input.withVector ?? false,
      scoreThreshold: ctx.input.scoreThreshold,
      using: ctx.input.vectorName,
      params,
      prefetch: ctx.input.prefetch
    });

    let mapped = results.map((r: any) => ({
      pointId: r.id,
      score: r.score,
      version: r.version,
      payload: r.payload,
      vector: r.vector
    }));

    return {
      output: { results: mapped },
      message: `Found **${mapped.length}** result(s) in \`${ctx.input.collectionName}\`.${mapped.length > 0 ? ` Top score: **${mapped[0]!.score}**.` : ''}`
    };
  })
  .build();
