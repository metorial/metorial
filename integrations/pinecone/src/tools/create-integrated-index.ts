import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createIntegratedIndexTool = SlateTool.create(spec, {
  name: 'Create Integrated Index',
  key: 'create_integrated_index',
  description: `Create a Pinecone serverless index with integrated embedding. Use this when users want to upsert source text and search with text while Pinecone automatically generates vectors from a hosted embedding model.`,
  instructions: [
    'Integrated embedding indexes are serverless and require cloud, region, model, metric, and a field map.',
    'The embedding model cannot be changed after creation; field map and read/write parameters can be updated later with Configure Index.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      indexName: z.string().min(1).max(45).describe('Name for the new index'),
      cloud: z.enum(['aws', 'gcp', 'azure']).describe('Cloud provider'),
      region: z.string().describe('Cloud region (e.g. us-east-1)'),
      model: z.string().describe('Hosted embedding model (for example llama-text-embed-v2)'),
      metric: z
        .enum(['cosine', 'euclidean', 'dotproduct'])
        .optional()
        .describe('Similarity metric for the generated vectors'),
      fieldMap: z
        .record(z.string(), z.string())
        .describe(
          'Maps embedding input names to source text fields, for example { "text": "chunk_text" }'
        ),
      readParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Embedding read parameters for search, such as input_type and truncate'),
      writeParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Embedding write parameters for upsert, such as input_type and truncate'),
      deletionProtection: z
        .enum(['enabled', 'disabled'])
        .optional()
        .describe('Prevent accidental deletion'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value tags for the index'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional metadata indexing schema for filterable fields')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('Name of the created index'),
      dimension: z.number().optional().describe('Embedding dimension selected by the model'),
      metric: z.string().describe('Distance metric'),
      host: z.string().describe('Host URL for data plane operations'),
      privateHost: z.string().optional().describe('Private host URL when available'),
      isReady: z.boolean().describe('Whether the index is ready'),
      state: z.string().describe('Current state of the index'),
      embed: z.any().optional().describe('Integrated embedding configuration')
    })
  )
  .handleInvocation(async ctx => {
    let fieldMapEntries = Object.entries(ctx.input.fieldMap);
    if (fieldMapEntries.length === 0) {
      throw pineconeServiceError(
        'fieldMap must include at least one embedding input mapping.'
      );
    }

    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });
    let result = await client.createIntegratedIndex({
      name: ctx.input.indexName,
      cloud: ctx.input.cloud,
      region: ctx.input.region,
      embed: {
        model: ctx.input.model,
        metric: ctx.input.metric,
        field_map: ctx.input.fieldMap,
        read_parameters: ctx.input.readParameters,
        write_parameters: ctx.input.writeParameters
      },
      deletion_protection: ctx.input.deletionProtection,
      tags: ctx.input.tags,
      schema: ctx.input.schema
    });

    return {
      output: {
        indexName: result.name,
        dimension: result.dimension,
        metric: result.metric,
        host: result.host,
        privateHost: result.private_host,
        isReady: result.status.ready,
        state: result.status.state,
        embed: result.embed
      },
      message: `Created integrated embedding index \`${result.name}\` using \`${ctx.input.model}\`. Host: \`${result.host}\`. State: ${result.status.state}.`
    };
  })
  .build();
