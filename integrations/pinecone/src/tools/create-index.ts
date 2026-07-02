import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let createIndexTool = SlateTool.create(spec, {
  name: 'Create Index',
  key: 'create_index',
  description: `Create a new Pinecone vector index. Supports serverless indexes (auto-scaling, specify cloud and region) and pod-based indexes (dedicated resources, specify environment and pod type). Configure dimension, distance metric, vector type, and optional deletion protection.`,
  instructions: [
    'For serverless indexes, provide cloud (aws, gcp, azure) and region.',
    'For pod-based indexes, provide environment and podType.',
    'Index names must be 1-45 characters, lowercase alphanumeric or hyphens.'
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
          region: z.string().describe('Cloud region (e.g. us-east-1)')
        })
        .optional()
        .describe('Serverless deployment specification'),
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
      dimension: z.number().describe('Dimensionality of the index'),
      metric: z.string().describe('Distance metric'),
      host: z.string().describe('Host URL for data plane operations'),
      isReady: z.boolean().describe('Whether the index is ready'),
      state: z.string().describe('Current state of the index')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });

    let specParam: any = {};
    if (ctx.input.serverless) {
      specParam.serverless = {
        cloud: ctx.input.serverless.cloud,
        region: ctx.input.serverless.region
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
      vector_type: ctx.input.vectorType,
      deletion_protection: ctx.input.deletionProtection,
      tags: ctx.input.tags
    });

    return {
      output: {
        indexName: result.name,
        dimension: result.dimension,
        metric: result.metric,
        host: result.host,
        isReady: result.status.ready,
        state: result.status.state
      },
      message: `Created index \`${result.name}\` with dimension ${result.dimension} and metric ${result.metric}. Host: \`${result.host}\`. State: ${result.status.state}.`
    };
  })
  .build();
