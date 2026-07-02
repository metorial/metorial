import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let searchRecordsTool = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Search a Pinecone namespace with text, a vector, or a record ID. This endpoint supports integrated-embedding text search and optional reranking.`,
  instructions: [
    'For text search, use an integrated-embedding index.',
    'Set queryMode to text, vector, or id and provide only the matching query field.',
    'If rerankRankFields is provided, include those fields in returnedFields as well.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      namespace: z.string().describe('Namespace to search'),
      queryMode: z.enum(['text', 'vector', 'id']).describe('How to query records'),
      topK: z.number().int().min(1).max(10000).describe('Number of records to retrieve'),
      queryText: z.string().optional().describe('Text query, required when queryMode is text'),
      vector: z
        .array(z.number())
        .optional()
        .describe('Dense query vector, required when queryMode is vector'),
      sparseVector: z
        .object({
          indices: z.array(z.number().int()).describe('Sparse vector indices'),
          values: z.array(z.number()).describe('Sparse vector values')
        })
        .optional()
        .describe('Optional sparse query vector when queryMode is vector'),
      recordId: z
        .string()
        .optional()
        .describe('Existing record ID to use as the query when queryMode is id'),
      filter: z.record(z.string(), z.any()).optional().describe('Metadata filter object'),
      returnedFields: z
        .array(z.string())
        .optional()
        .describe('Record fields to include in returned hits'),
      rerankModel: z.string().optional().describe('Optional reranking model'),
      rerankQuery: z
        .string()
        .optional()
        .describe('Optional reranking query. Defaults to queryText for text queries.'),
      rerankTopN: z.number().int().optional().describe('Number of reranked results to return'),
      rerankRankFields: z
        .array(z.string())
        .optional()
        .describe('Fields used by the reranking model')
    })
  )
  .output(
    z.object({
      hits: z
        .array(
          z.object({
            recordId: z.string().describe('Matched record ID'),
            score: z.number().optional().describe('Similarity score'),
            fields: z.record(z.string(), z.any()).optional().describe('Returned record fields')
          })
        )
        .describe('Search hits'),
      usage: z
        .record(z.string(), z.any())
        .optional()
        .describe('Usage metrics returned by Pinecone')
    })
  )
  .handleInvocation(async ctx => {
    let hasText = Boolean(ctx.input.queryText);
    let hasVector = Boolean(ctx.input.vector);
    let hasId = Boolean(ctx.input.recordId);

    if (ctx.input.queryMode === 'text' && (!hasText || hasVector || hasId)) {
      throw pineconeServiceError(
        'queryMode "text" requires queryText and no vector or recordId.'
      );
    }
    if (ctx.input.queryMode === 'vector' && (!hasVector || hasText || hasId)) {
      throw pineconeServiceError(
        'queryMode "vector" requires vector and no queryText or recordId.'
      );
    }
    if (ctx.input.queryMode === 'id' && (!hasId || hasText || hasVector)) {
      throw pineconeServiceError(
        'queryMode "id" requires recordId and no queryText or vector.'
      );
    }
    if (ctx.input.sparseVector && ctx.input.queryMode !== 'vector') {
      throw pineconeServiceError('sparseVector can only be used when queryMode is "vector".');
    }
    if (ctx.input.rerankRankFields && !ctx.input.rerankModel) {
      throw pineconeServiceError('rerankModel is required when rerankRankFields is provided.');
    }

    let query =
      ctx.input.queryMode === 'text'
        ? {
            inputs: { text: ctx.input.queryText },
            top_k: ctx.input.topK,
            filter: ctx.input.filter
          }
        : ctx.input.queryMode === 'vector'
          ? {
              vector: {
                values: ctx.input.vector!,
                sparse_values: ctx.input.sparseVector
              },
              top_k: ctx.input.topK,
              filter: ctx.input.filter
            }
          : {
              id: ctx.input.recordId,
              top_k: ctx.input.topK,
              filter: ctx.input.filter
            };

    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    let result = await client.searchRecords({
      namespace: ctx.input.namespace,
      query,
      fields: ctx.input.returnedFields,
      rerank: ctx.input.rerankModel
        ? {
            model: ctx.input.rerankModel,
            query: ctx.input.rerankQuery ?? ctx.input.queryText,
            top_n: ctx.input.rerankTopN,
            rank_fields: ctx.input.rerankRankFields
          }
        : undefined
    });

    let hits = (result.result?.hits || []).map(hit => ({
      recordId: String(hit._id ?? hit.id ?? ''),
      score: typeof hit._score === 'number' ? hit._score : undefined,
      fields: typeof hit.fields === 'object' && hit.fields !== null ? hit.fields : undefined
    }));

    return {
      output: {
        hits,
        usage: result.usage
      },
      message: `Found **${hits.length}** record${hits.length === 1 ? '' : 's'}${hits.length > 0 && hits[0]?.score !== undefined ? ` (top score: ${hits[0].score.toFixed(4)})` : ''}.`
    };
  })
  .build();
