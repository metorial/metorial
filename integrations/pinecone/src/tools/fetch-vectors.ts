import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let fetchVectorsTool = SlateTool.create(spec, {
  name: 'Fetch Vectors',
  key: 'fetch_vectors',
  description: `Retrieve specific vectors by their IDs from a Pinecone index. Returns the full vector data including values, sparse values, and metadata. Use this when you know the exact vector IDs you want to look up.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      vectorIds: z.array(z.string()).min(1).describe('IDs of vectors to fetch'),
      namespace: z.string().optional().describe('Namespace to fetch from')
    })
  )
  .output(
    z.object({
      vectors: z
        .array(
          z.object({
            vectorId: z.string().describe('ID of the vector'),
            values: z.array(z.number()).optional().describe('Dense vector values'),
            sparseValues: z
              .object({
                indices: z.array(z.number().int()).describe('Sparse indices'),
                values: z.array(z.number()).describe('Sparse values')
              })
              .optional()
              .describe('Sparse vector values'),
            metadata: z.record(z.string(), z.any()).optional().describe('Vector metadata')
          })
        )
        .describe('Fetched vectors'),
      namespace: z.string().describe('Namespace vectors were fetched from')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    let result = await client.fetchVectors({
      ids: ctx.input.vectorIds,
      namespace: ctx.input.namespace
    });

    let vectors = Object.entries(result.vectors || {}).map(([id, vec]) => ({
      vectorId: id,
      values: vec.values,
      sparseValues: vec.sparseValues,
      metadata: vec.metadata
    }));

    return {
      output: {
        vectors,
        namespace: result.namespace || ''
      },
      message: `Fetched **${vectors.length}** of ${ctx.input.vectorIds.length} requested vector${ctx.input.vectorIds.length === 1 ? '' : 's'}.`
    };
  })
  .build();
