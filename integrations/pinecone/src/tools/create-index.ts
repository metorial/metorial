import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createIndexTool = SlateTool.create(spec, {
  name: 'Create Index',
  key: 'create_index',
  description: `Create a new Pinecone vector index. Prefer serverless indexes for new projects; BYOC is supported when an environment has already been provisioned. Pod-based indexes are legacy and unavailable to new Pinecone customers.`,
  instructions: [
    'Provide exactly one deployment specification: serverless, byoc, or legacy pod.',
    'Dense indexes require dimension. Sparse indexes must omit dimension and use dotproduct metric.',
    'Index names must be 1-45 characters, start and end with an alphanumeric character, and contain only lowercase alphanumeric characters or hyphens.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      indexName: z
        .string()
        .min(1)
        .max(45)
        .describe('Name for the new index (lowercase alphanumeric and hyphens)'),
      dimension: z
        .number()
        .int()
        .min(1)
        .max(20000)
        .optional()
        .describe('Dimensionality of vectors to store'),
      metric: z
        .enum(['cosine', 'euclidean', 'dotproduct'])
        .optional()
        .describe('Distance metric for similarity search'),
      vectorType: z
        .enum(['dense', 'sparse'])
        .optional()
        .describe('Type of vectors to store (defaults to dense)'),
      deletionProtection: z
        .enum(['enabled', 'disabled'])
        .optional()
        .describe('Prevent accidental deletion'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value tags for the index'),
      serverless: z
        .object({
          cloud: z.enum(['aws', 'gcp', 'azure']).describe('Cloud provider'),
          region: z.string().describe('Cloud region (e.g. us-east-1)'),
          readCapacityMode: z
            .enum(['OnDemand', 'Dedicated'])
            .optional()
            .describe('Serverless read capacity mode. Defaults to OnDemand.'),
          readNodeType: z
            .string()
            .optional()
            .describe('Dedicated read node type, required when readCapacityMode is Dedicated'),
          readShards: z
            .number()
            .int()
            .optional()
            .describe('Manual dedicated read capacity shard count'),
          readReplicas: z
            .number()
            .int()
            .optional()
            .describe('Manual dedicated read capacity replica count')
        })
        .optional()
        .describe('Serverless deployment specification'),
      byoc: z
        .object({
          environment: z.string().describe('BYOC environment ID provisioned for the account')
        })
        .optional()
        .describe('Bring Your Own Cloud deployment specification'),
      pod: z
        .object({
          environment: z.string().describe('Deployment environment'),
          podType: z.string().describe('Pod type and size (e.g. p1.x1, s1.x1)'),
          pods: z.number().int().optional().describe('Number of pods'),
          replicas: z.number().int().optional().describe('Number of replicas'),
          shards: z.number().int().optional().describe('Number of shards')
        })
        .optional()
        .describe('Pod-based deployment specification')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('Name of the created index'),
      dimension: z.number().optional().describe('Dimensionality of dense indexes'),
      metric: z.string().describe('Distance metric'),
      host: z.string().describe('Host URL for data plane operations'),
      privateHost: z.string().optional().describe('Private host URL when available'),
      isReady: z.boolean().describe('Whether the index is ready'),
      state: z.string().describe('Current state of the index')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });

    let specCount = [ctx.input.serverless, ctx.input.byoc, ctx.input.pod].filter(
      Boolean
    ).length;
    if (specCount !== 1) {
      throw pineconeServiceError(
        'Provide exactly one index deployment specification: serverless, byoc, or pod.'
      );
    }

    let vectorType = ctx.input.vectorType ?? 'dense';
    if (vectorType === 'dense' && ctx.input.dimension === undefined) {
      throw pineconeServiceError('dimension is required when creating a dense index.');
    }
    if (vectorType === 'sparse') {
      if (ctx.input.dimension !== undefined) {
        throw pineconeServiceError('dimension must be omitted when creating a sparse index.');
      }
      if (ctx.input.metric && ctx.input.metric !== 'dotproduct') {
        throw pineconeServiceError('Sparse indexes require the dotproduct metric.');
      }
    }

    let specParam: any = {};
    if (ctx.input.serverless) {
      let readCapacity =
        ctx.input.serverless.readCapacityMode === 'Dedicated'
          ? {
              mode: 'Dedicated',
              dedicated: {
                node_type: ctx.input.serverless.readNodeType,
                scaling: 'Manual',
                manual: {
                  shards: ctx.input.serverless.readShards,
                  replicas: ctx.input.serverless.readReplicas
                }
              }
            }
          : ctx.input.serverless.readCapacityMode
            ? { mode: ctx.input.serverless.readCapacityMode }
            : undefined;

      if (
        ctx.input.serverless.readCapacityMode === 'Dedicated' &&
        !ctx.input.serverless.readNodeType
      ) {
        throw pineconeServiceError(
          'serverless.readNodeType is required when readCapacityMode is Dedicated.'
        );
      }

      specParam.serverless = {
        cloud: ctx.input.serverless.cloud,
        region: ctx.input.serverless.region,
        read_capacity: readCapacity
      };
    } else if (ctx.input.byoc) {
      specParam.byoc = {
        environment: ctx.input.byoc.environment
      };
    } else if (ctx.input.pod) {
      specParam.pod = {
        environment: ctx.input.pod.environment,
        pod_type: ctx.input.pod.podType,
        pods: ctx.input.pod.pods,
        replicas: ctx.input.pod.replicas,
        shards: ctx.input.pod.shards
      };
    }

    let result = await client.createIndex({
      name: ctx.input.indexName,
      dimension: ctx.input.dimension,
      metric: ctx.input.metric,
      spec: specParam,
      vector_type: vectorType,
      deletion_protection: ctx.input.deletionProtection,
      tags: ctx.input.tags
    });

    return {
      output: {
        indexName: result.name,
        dimension: result.dimension,
        metric: result.metric,
        host: result.host,
        privateHost: result.private_host,
        isReady: result.status.ready,
        state: result.status.state
      },
      message: `Created ${result.vector_type || vectorType} index \`${result.name}\`${result.dimension ? ` with dimension ${result.dimension}` : ''} and metric ${result.metric}. Host: \`${result.host}\`. State: ${result.status.state}.`
    };
  })
  .build();
