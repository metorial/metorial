import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let describeIndexStatsTool = SlateTool.create(spec, {
  name: 'Index Stats',
  key: 'describe_index_stats',
  description: `Get statistics about a Pinecone index including total vector count, vector count per namespace, dimension, fullness, and metric. Use this to monitor index usage and capacity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata filter to scope the stats')
    })
  )
  .output(
    z.object({
      totalVectorCount: z.number().describe('Total number of vectors across all namespaces'),
      dimension: z.number().describe('Dimensionality of vectors in the index'),
      indexFullness: z
        .number()
        .describe('Index fullness ratio (relevant for pod-based indexes)'),
      metric: z.string().optional().describe('Distance metric used by the index'),
      vectorType: z.string().optional().describe('Type of vectors stored'),
      namespaces: z
        .record(
          z.string(),
          z.object({
            vectorCount: z.number().describe('Number of vectors in this namespace')
          })
        )
        .describe('Vector counts broken down by namespace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    let result = await client.describeIndexStats(
      ctx.input.filter ? { filter: ctx.input.filter } : undefined
    );

    let namespaceCount = Object.keys(result.namespaces || {}).length;

    return {
      output: {
        totalVectorCount: result.totalVectorCount,
        dimension: result.dimension,
        indexFullness: result.indexFullness,
        metric: result.metric,
        vectorType: result.vectorType,
        namespaces: result.namespaces || {}
      },
      message: `Index has **${result.totalVectorCount}** vectors across **${namespaceCount}** namespace${namespaceCount === 1 ? '' : 's'}. Dimension: ${result.dimension}, fullness: ${(result.indexFullness * 100).toFixed(2)}%.`
    };
  })
  .build();
