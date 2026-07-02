import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let configureIndexTool = SlateTool.create(spec, {
  name: 'Configure Index',
  key: 'configure_index',
  description: `Describe, update, or delete an existing Pinecone index. Update deletion protection, tags, legacy pod replicas, or integrated embedding field/read/write parameters.`,
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
        .describe('New number of replicas for legacy pod-based indexes'),
      embedFieldMap: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated field map for an integrated embedding index'),
      embedReadParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated read parameters for an integrated embedding index'),
      embedWriteParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated write parameters for an integrated embedding index')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('Name of the index'),
      dimension: z.number().optional().describe('Dimensionality of the index'),
      metric: z.string().optional().describe('Distance metric'),
      host: z.string().optional().describe('Host URL for data plane operations'),
      privateHost: z.string().optional().describe('Private host URL when available'),
      isReady: z.boolean().optional().describe('Whether the index is ready'),
      state: z.string().optional().describe('Current state of the index'),
      deletionProtection: z.string().optional().describe('Deletion protection status'),
      embed: z.any().optional().describe('Integrated embedding configuration when present'),
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
      if (
        ctx.input.embedFieldMap ||
        ctx.input.embedReadParameters ||
        ctx.input.embedWriteParameters
      ) {
        configParams.embed = {
          field_map: ctx.input.embedFieldMap,
          read_parameters: ctx.input.embedReadParameters,
          write_parameters: ctx.input.embedWriteParameters
        };
      }

      if (Object.keys(configParams).length === 0) {
        throw pineconeServiceError(
          'Provide at least one configuration field when action is "configure".'
        );
      }

      let result = await client.configureIndex(ctx.input.indexName, configParams);
      return {
        output: {
          indexName: result.name,
          dimension: result.dimension,
          metric: result.metric,
          host: result.host,
          privateHost: result.private_host,
          isReady: result.status.ready,
          state: result.status.state,
          deletionProtection: result.deletion_protection,
          embed: result.embed
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
        privateHost: result.private_host,
        isReady: result.status.ready,
        state: result.status.state,
        deletionProtection: result.deletion_protection,
        embed: result.embed
      },
      message: `Index \`${result.name}\`: dimension=${result.dimension}, metric=${result.metric}, state=${result.status.state}, ready=${result.status.ready}.`
    };
  })
  .build();
