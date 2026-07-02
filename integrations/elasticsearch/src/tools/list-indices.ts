import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let listIndicesTool = SlateTool.create(spec, {
  name: 'List Indices',
  key: 'list_indices',
  description: `List all indices in the Elasticsearch cluster with their health status, document count, and storage size. Can also retrieve detailed information about a specific index including its mappings, settings, and aliases.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      indexName: z
        .string()
        .optional()
        .describe('Optional specific index name to get detailed information for')
    })
  )
  .output(
    z.object({
      indices: z
        .array(
          z.object({
            indexName: z.string().describe('Index name'),
            health: z.string().optional().describe('Index health (green, yellow, red)'),
            status: z.string().optional().describe('Index status (open, close)'),
            documentCount: z.string().optional().describe('Number of documents in the index'),
            storeSize: z.string().optional().describe('Total store size'),
            primaryShards: z.string().optional().describe('Number of primary shards'),
            replicaShards: z.string().optional().describe('Number of replica shards')
          })
        )
        .optional()
        .describe('List of indices (for list operation)'),
      indexDetails: z
        .record(z.string(), z.any())
        .optional()
        .describe('Detailed index information including mappings, settings, aliases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    if (ctx.input.indexName) {
      let result = await client.getIndex(ctx.input.indexName);
      return {
        output: {
          indexDetails: result
        },
        message: `Retrieved details for index **${ctx.input.indexName}**.`
      };
    }

    let result = await client.listIndices();
    let indices = (result || []).map((idx: any) => ({
      indexName: idx.index,
      health: idx.health,
      status: idx.status,
      documentCount: idx['docs.count'],
      storeSize: idx['store.size'],
      primaryShards: idx.pri,
      replicaShards: idx.rep
    }));

    return {
      output: {
        indices
      },
      message: `Found **${indices.length}** indices in the cluster.`
    };
  })
  .build();
