import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let updateCollection = SlateTool.create(spec, {
  name: 'Update Collection',
  key: 'update_collection',
  description:
    'Updates Qdrant collection indexing, optimization, replication, or vector storage settings. Existing points remain in the collection. Call get_collection to inspect the current configuration.',
  tags: { destructive: false }
})
  .input(
    z.object({
      collectionName: z.string(),
      optimizersConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optimizer parameters using Qdrant API field names, such as indexing_threshold.'
        ),
      hnswConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('HNSW index parameters using Qdrant API field names.'),
      quantizationConfig: z
        .union([z.record(z.string(), z.unknown()), z.literal('Disabled')])
        .optional()
        .describe(
          'Qdrant quantization configuration. Use the string "Disabled" to disable quantization.'
        ),
      vectors: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Vector parameter changes keyed by vector name. Use an empty string key for an unnamed vector.'
        ),
      sparseVectors: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Sparse vector configuration changes keyed by vector name.'),
      replicationFactor: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of replicas for distributed deployments'),
      writeConsistencyFactor: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of replicas that must apply a write')
    })
  )
  .output(z.object({ collectionName: z.string(), success: z.boolean() }))
  .handleInvocation(async ctx => {
    let params = {
      optimizers_config: ctx.input.optimizersConfig,
      hnsw_config: ctx.input.hnswConfig,
      quantization_config: ctx.input.quantizationConfig,
      vectors: ctx.input.vectors,
      sparse_vectors: ctx.input.sparseVectors,
      params:
        ctx.input.replicationFactor !== undefined ||
        ctx.input.writeConsistencyFactor !== undefined
          ? {
              replication_factor: ctx.input.replicationFactor,
              write_consistency_factor: ctx.input.writeConsistencyFactor
            }
          : undefined
    };
    if (!Object.values(params).some(value => value !== undefined)) {
      throw createApiServiceError('Provide at least one collection setting to update.');
    }
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint,
      token: ctx.auth.token
    });
    let result = await client.updateCollection(ctx.input.collectionName, params);
    return {
      output: { collectionName: ctx.input.collectionName, success: result.result === true },
      message: `Updated collection \`${ctx.input.collectionName}\`.`
    };
  })
  .build();
