import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let configureIndexTool = SlateTool.create(spec, {
  name: 'Configure Index',
  key: 'configure_index',
  description: `Update the configuration of an existing Pinecone index. Modify deletion protection, tags, and pod-based index settings like replicas. Can also be used to describe or delete an index.`,
  instructions: [
    'To get index details, set action to "describe".',
    'To update settings, set action to "configure" with the desired changes.',
    'To delete an index, set action to "delete". Deletion protection must be disabled first.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      indexName: z.string().describe('Name of the index'),
      action: z
        .enum(['describe', 'configure', 'delete'])
        .describe('Action to perform on the index'),
      deletionProtection: z
        .enum(['enabled', 'disabled'])
        .optional()
        .describe('Enable or disable deletion protection'),
      tags: z.record(z.string(), z.string()).optional().describe('Updated tags for the index'),
      podReplicas: z
        .number()
        .int()
        .optional()
        .describe('New number of replicas for pod-based indexes')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('Name of the index'),
      dimension: z.number().optional().describe('Dimensionality of the index'),
      metric: z.string().optional().describe('Distance metric'),
      host: z.string().optional().describe('Host URL for data plane operations'),
      isReady: z.boolean().optional().describe('Whether the index is ready'),
      state: z.string().optional().describe('Current state of the index'),
      deletionProtection: z.string().optional().describe('Deletion protection status'),
      deleted: z.boolean().optional().describe('Whether the index was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deleteIndex(ctx.input.indexName);
      return {
        output: {
          indexName: ctx.input.indexName,
          deleted: true
        },
        message: `Deleted index \`${ctx.input.indexName}\`.`
      };
    }

    if (ctx.input.action === 'configure') {
      let configParams: any = {};
      if (ctx.input.deletionProtection) {
        configParams.deletion_protection = ctx.input.deletionProtection;
      }
      if (ctx.input.tags) {
        configParams.tags = ctx.input.tags;
      }
      if (ctx.input.podReplicas !== undefined) {
        configParams.spec = { pod: { replicas: ctx.input.podReplicas } };
      }

      let result = await client.configureIndex(ctx.input.indexName, configParams);
      return {
        output: {
          indexName: result.name,
          dimension: result.dimension,
          metric: result.metric,
          host: result.host,
          isReady: result.status.ready,
          state: result.status.state,
          deletionProtection: result.deletion_protection
        },
        message: `Updated configuration for index \`${result.name}\`.`
      };
    }

    // describe
    let result = await client.describeIndex(ctx.input.indexName);
    return {
      output: {
        indexName: result.name,
        dimension: result.dimension,
        metric: result.metric,
        host: result.host,
        isReady: result.status.ready,
        state: result.status.state,
        deletionProtection: result.deletion_protection
      },
      message: `Index \`${result.name}\`: dimension=${result.dimension}, metric=${result.metric}, state=${result.status.state}, ready=${result.status.ready}.`
    };
  })
  .build();
