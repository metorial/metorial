import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

let vectorParamsSchema = z
  .object({
    size: z.number().describe('Dimensionality of the vector'),
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
    'Only one of `vectors` or `namedVectors` should be provided.'
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
      shardNumber: z.number().optional().describe('Number of shards for the collection'),
      replicationFactor: z
        .number()
        .optional()
        .describe('Replication factor for distributed deployments'),
      onDiskPayload: z.boolean().optional().describe('Whether to store payloads on disk'),
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
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let vectorsConfig: any;
    if (ctx.input.namedVectors) {
      vectorsConfig = ctx.input.namedVectors;
    } else if (ctx.input.vectors) {
      vectorsConfig = ctx.input.vectors;
    } else {
      throw new Error('Either vectors or namedVectors must be provided');
    }

    await client.createCollection(ctx.input.collectionName, {
      vectors: vectorsConfig,
      shardNumber: ctx.input.shardNumber,
      replicationFactor: ctx.input.replicationFactor,
      onDiskPayload: ctx.input.onDiskPayload,
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
