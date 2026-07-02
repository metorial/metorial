import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listIndexesTool = SlateTool.create(spec, {
  name: 'List Indexes',
  key: 'list_indexes',
  description: `List all vector indexes in the current Pinecone project. Returns index names, dimensions, metrics, hosting details, and operational status. Use this to discover available indexes before performing vector operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      indexes: z
        .array(
          z.object({
            indexName: z.string().describe('Name of the index'),
            dimension: z
              .number()
              .optional()
              .describe('Dimensionality of vectors in dense indexes'),
            metric: z
              .string()
              .describe('Distance metric used (cosine, euclidean, dotproduct)'),
            host: z.string().describe('Host URL for data plane operations'),
            privateHost: z
              .string()
              .optional()
              .describe('Private host URL when private endpoints are enabled'),
            vectorType: z.string().optional().describe('Type of vectors (dense or sparse)'),
            deletionProtection: z
              .string()
              .optional()
              .describe('Whether deletion protection is enabled'),
            isReady: z.boolean().describe('Whether the index is ready for operations'),
            state: z.string().describe('Current operational state of the index'),
            spec: z.any().optional().describe('Deployment specification (serverless or pod)'),
            tags: z
              .record(z.string(), z.string())
              .optional()
              .describe('Custom tags on the index')
          })
        )
        .describe('List of indexes in the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });
    let result = await client.listIndexes();

    let indexes = (result.indexes || []).map(idx => ({
      indexName: idx.name,
      dimension: idx.dimension,
      metric: idx.metric,
      host: idx.host,
      privateHost: idx.private_host,
      vectorType: idx.vector_type,
      deletionProtection: idx.deletion_protection,
      isReady: idx.status.ready,
      state: idx.status.state,
      spec: idx.spec,
      tags: idx.tags ?? undefined
    }));

    return {
      output: { indexes },
      message: `Found **${indexes.length}** index${indexes.length === 1 ? '' : 'es'}${indexes.length > 0 ? `: ${indexes.map(i => `\`${i.indexName}\``).join(', ')}` : ''}.`
    };
  })
  .build();
