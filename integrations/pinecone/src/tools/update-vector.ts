import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let updateVectorTool = SlateTool.create(spec, {
  name: 'Update Vector',
  key: 'update_vector',
  description: `Update an existing vector's values, sparse values, or metadata in a Pinecone index. Use this to modify a single vector without needing to re-upsert the entire record.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      vectorId: z.string().describe('ID of the vector to update'),
      namespace: z.string().optional().describe('Namespace of the vector'),
      values: z.array(z.number()).optional().describe('New dense vector values'),
      sparseValues: z
        .object({
          indices: z.array(z.number().int()).describe('Sparse vector indices'),
          values: z.array(z.number()).describe('Sparse vector values')
        })
        .optional()
        .describe('New sparse vector values'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata fields to set or update')
    })
  )
  .output(
    z.object({
      vectorId: z.string().describe('ID of the updated vector'),
      updated: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    await client.updateVector({
      id: ctx.input.vectorId,
      values: ctx.input.values,
      sparseValues: ctx.input.sparseValues,
      setMetadata: ctx.input.metadata,
      namespace: ctx.input.namespace
    });

    return {
      output: {
        vectorId: ctx.input.vectorId,
        updated: true
      },
      message: `Updated vector \`${ctx.input.vectorId}\`${ctx.input.namespace ? ` in namespace \`${ctx.input.namespace}\`` : ''}.`
    };
  })
  .build();
