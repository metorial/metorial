import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createCluster = SlateTool.create(spec, {
  name: 'Create Cluster',
  key: 'create_cluster',
  description: `Create an unsupervised cluster model to group data instances by similarity. Computes centroids representing the center of each cluster.
After creation, use predictions to assign new data points to the nearest cluster centroid.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z
        .string()
        .describe('Dataset resource ID to cluster (e.g., "dataset/abc123")'),
      name: z.string().optional().describe('Name for the cluster'),
      k: z
        .number()
        .optional()
        .describe(
          'Number of clusters to create. If omitted, BigML selects the optimal k automatically.'
        ),
      inputFields: z
        .array(z.string())
        .optional()
        .describe('List of field IDs to use for clustering'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      projectId: z.string().optional().describe('Project to associate with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the cluster'),
      name: z.string().optional().describe('Name of the cluster'),
      statusCode: z.number().describe('Status code'),
      statusMessage: z.string().describe('Status message'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      dataset: ctx.input.datasetId
    };

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.k !== undefined) body.k = ctx.input.k;
    if (ctx.input.inputFields) body.input_fields = ctx.input.inputFields;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let result = await client.createResource('cluster', body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `Cluster **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}${ctx.input.k ? ` with k=${ctx.input.k}` : ''}. Status: ${result.status?.message ?? 'pending'}.`
    };
  })
  .build();
