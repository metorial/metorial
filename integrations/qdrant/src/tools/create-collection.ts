import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

let vectorParamsSchema = z
  .object({
    size: z.number().int().min(1).max(65536).describe('Dimensionality of the vector'),
    distance: z
      .enum(['Cosine', 'Euclid', 'Dot', 'Manhattan'])
      .describe('Distance metric for similarity'),
    datatype: z
      .enum(['float32', 'float16', 'uint8'])
      .optional()
      .describe('Vector storage data type')
  })
  .describe('Vector parameters');

export let createCollection = SlateTool.create(spec, {
  name: 'Create Collection',
  key: 'create_collection',
  description: `Creates a new Qdrant collection with specified vector parameters. Supports single unnamed vectors or multiple named vector spaces for multi-modal data (e.g., text + image embeddings). Configure distance metric, dimensionality, and optional HNSW/quantization settings.`,
  instructions: [
    'For a single vector space, provide `vectors` as a single vector params object with `size` and `distance`.',
    'For named vector spaces, provide `namedVectors` as a map of name to vector params.',
    'Only one of `vectors` or `namedVectors` should be provided.',
    'For a sparse-only collection, provide sparseVectors without vectors or namedVectors.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name for the new collection'),
      vectors: vectorParamsSchema.optional().describe('Single (unnamed) vector configuration'),
      namedVectors: z
        .record(z.string(), vectorParamsSchema)
        .optional()
        .describe(
          'Named vector spaces, e.g. {"text": {size: 768, distance: "Cosine"}, "image": {size: 512, distance: "Dot"}}'
        ),
      shardNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of shards for the collection'),
      replicationFactor: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Replication factor for distributed deployments'),
      onDiskPayload: z.boolean().optional().describe('Whether to store payloads on disk'),
      hnswConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'HNSW index configuration using Qdrant API field names, such as m and ef_construct.'
        ),
      quantizationConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Qdrant scalar, product, or binary quantization configuration.'),
      optimizersConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optimizer configuration using Qdrant API field names, such as indexing_threshold.'
        ),
      sparseVectors: z
        .record(z.string(), z.any())
        .optional()
        .describe('Sparse vector configuration by name')
    })
  )
  .output(
    z.object({
      collectionName: z.string().describe('Name of the created collection'),
      success: z.boolean().describe('Whether the collection was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.vectors !== undefined && ctx.input.namedVectors !== undefined) {
      throw createApiServiceError('Provide only one of vectors or namedVectors.');
    }
    if (ctx.input.namedVectors && Object.keys(ctx.input.namedVectors).length === 0) {
      throw createApiServiceError(
        'namedVectors must contain at least one vector configuration.'
      );
    }
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint,
      token: ctx.auth.token
    });

    let vectorsConfig: any;
    if (ctx.input.namedVectors) {
      vectorsConfig = ctx.input.namedVectors;
    } else if (ctx.input.vectors) {
      vectorsConfig = ctx.input.vectors;
    } else if (ctx.input.sparseVectors && Object.keys(ctx.input.sparseVectors).length > 0) {
      vectorsConfig = {};
    } else {
      throw createApiServiceError(
        'Provide vectors, namedVectors, or at least one sparseVectors configuration.'
      );
    }

    await client.createCollection(ctx.input.collectionName, {
      vectors: vectorsConfig,
      shardNumber: ctx.input.shardNumber,
      replicationFactor: ctx.input.replicationFactor,
      onDiskPayload: ctx.input.onDiskPayload,
      hnswConfig: ctx.input.hnswConfig,
      quantizationConfig: ctx.input.quantizationConfig,
      optimizersConfig: ctx.input.optimizersConfig,
      sparseVectors: ctx.input.sparseVectors
    });

    return {
      output: {
        collectionName: ctx.input.collectionName,
        success: true
      },
      message: `Collection \`${ctx.input.collectionName}\` created successfully.`
    };
  })
  .build();
