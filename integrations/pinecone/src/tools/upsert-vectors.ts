import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let upsertVectorsTool = SlateTool.create(spec, {
  name: 'Upsert Vectors',
  key: 'upsert_vectors',
  description: `Insert or update vector records in a Pinecone index. Each vector has a unique ID and dense/sparse embedding values with optional metadata. If a vector with the same ID already exists, it will be overwritten. Supports batch upsert of up to 1000 vectors.`,
  constraints: [
    'Maximum 1000 vectors per upsert request.',
    'Vector dimension must match the index dimension.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index (from index description)'),
      namespace: z.string().optional().describe('Target namespace for the vectors'),
      vectors: z
        .array(
          z.object({
            vectorId: z.string().min(1).max(512).describe('Unique ID for the vector'),
            values: z.array(z.number()).optional().describe('Dense vector embedding values'),
            sparseValues: z
              .object({
                indices: z.array(z.number().int()).describe('Sparse vector indices'),
                values: z.array(z.number()).describe('Sparse vector values')
              })
              .optional()
              .describe('Sparse vector embedding for hybrid search'),
            metadata: z
              .record(z.string(), z.any())
              .optional()
              .describe('Key-value metadata for filtering')
          })
        )
        .min(1)
        .max(1000)
        .describe('Vectors to upsert')
    })
  )
  .output(
    z.object({
      upsertedCount: z.number().describe('Number of vectors successfully upserted')
    })
  )
  .handleInvocation(async ctx => {
    for (let vector of ctx.input.vectors) {
      if (!vector.values && !vector.sparseValues) {
        throw pineconeServiceError(
          `Vector ${vector.vectorId} must include values or sparseValues.`
        );
      }
    }

    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    let vectors = ctx.input.vectors.map(v => ({
      id: v.vectorId,
      values: v.values,
      sparseValues: v.sparseValues,
      metadata: v.metadata
    }));

    let result = await client.upsertVectors({
      vectors,
      namespace: ctx.input.namespace
    });

    return {
      output: { upsertedCount: result.upsertedCount },
      message: `Upserted **${result.upsertedCount}** vector${result.upsertedCount === 1 ? '' : 's'}${ctx.input.namespace ? ` into namespace \`${ctx.input.namespace}\`` : ''}.`
    };
  })
  .build();
