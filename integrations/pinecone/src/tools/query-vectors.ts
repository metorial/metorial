import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let queryVectorsTool = SlateTool.create(spec, {
  name: 'Query Vectors',
  key: 'query_vectors',
  description: `Search for the most similar vectors in a Pinecone index. Query by providing a dense vector or an existing vector ID. Results include similarity scores and optionally the vector values and metadata. Supports metadata filtering and sparse vectors for hybrid search.`,
  instructions: [
    'Provide either a query vector or a vector ID to query by, but not both.',
    'Use metadata filters to narrow search scope (supports $eq, $ne, $gt, $lt, $in, $nin operators).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      topK: z.number().int().min(1).max(10000).describe('Number of similar results to return'),
      vector: z.array(z.number()).optional().describe('Dense query vector values'),
      vectorId: z.string().optional().describe('ID of an existing vector to use as the query'),
      namespace: z.string().optional().describe('Namespace to search within'),
      filter: z.record(z.string(), z.any()).optional().describe('Metadata filter object'),
      includeValues: z.boolean().optional().describe('Include vector values in results'),
      includeMetadata: z.boolean().optional().describe('Include metadata in results'),
      sparseVector: z
        .object({
          indices: z.array(z.number().int()).describe('Sparse vector indices'),
          values: z.array(z.number()).describe('Sparse vector values')
        })
        .optional()
        .describe('Sparse query vector for hybrid search')
    })
  )
  .output(
    z.object({
      matches: z
        .array(
          z.object({
            vectorId: z.string().describe('ID of the matching vector'),
            score: z.number().describe('Similarity score'),
            values: z.array(z.number()).optional().describe('Vector values if requested'),
            metadata: z
              .record(z.string(), z.any())
              .optional()
              .describe('Vector metadata if requested')
          })
        )
        .describe('Matching vectors sorted by similarity'),
      namespace: z.string().describe('Namespace that was searched'),
      readUnits: z.number().optional().describe('Read units consumed by the query')
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.vector ? 1 : 0) + (ctx.input.vectorId ? 1 : 0) !== 1) {
      throw pineconeServiceError('Provide exactly one query input: vector or vectorId.');
    }

    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    let result = await client.queryVectors({
      vector: ctx.input.vector,
      id: ctx.input.vectorId,
      topK: ctx.input.topK,
      namespace: ctx.input.namespace,
      filter: ctx.input.filter,
      includeValues: ctx.input.includeValues,
      includeMetadata: ctx.input.includeMetadata,
      sparseVector: ctx.input.sparseVector
    });

    let matches = (result.matches || []).map(m => ({
      vectorId: m.id,
      score: m.score,
      values: m.values,
      metadata: m.metadata
    }));

    return {
      output: {
        matches,
        namespace: result.namespace || '',
        readUnits: result.usage?.readUnits ?? result.usage?.read_units
      },
      message: `Found **${matches.length}** match${matches.length === 1 ? '' : 'es'}${matches.length > 0 && matches[0] ? ` (top score: ${matches[0].score.toFixed(4)})` : ''}.`
    };
  })
  .build();
