import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let fetchVectorsByMetadataTool = SlateTool.create(spec, {
  name: 'Fetch Records by Metadata',
  key: 'fetch_vectors_by_metadata',
  description: `Fetch Pinecone records from a namespace by metadata filter. Use this when you need complete records matching metadata conditions and do not know their IDs yet.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      namespace: z.string().optional().describe('Namespace to fetch from'),
      filter: z.record(z.string(), z.any()).describe('Metadata filter expression'),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Maximum number of records to return'),
      paginationToken: z.string().optional().describe('Token for fetching the next page')
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
      namespace: z.string().describe('Namespace vectors were fetched from'),
      nextPaginationToken: z.string().optional().describe('Token for the next page'),
      readUnits: z.number().optional().describe('Read units consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    let result = await client.fetchVectorsByMetadata({
      namespace: ctx.input.namespace,
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      paginationToken: ctx.input.paginationToken
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
        namespace: result.namespace || '',
        nextPaginationToken: result.pagination?.next,
        readUnits: result.usage?.readUnits ?? result.usage?.read_units
      },
      message: `Fetched **${vectors.length}** record${vectors.length === 1 ? '' : 's'} by metadata${result.pagination?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
