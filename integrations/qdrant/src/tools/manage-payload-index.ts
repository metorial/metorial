import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let managePayloadIndex = SlateTool.create(spec, {
  name: 'Manage Payload Index',
  key: 'manage_payload_index',
  description: `Creates or deletes payload field indexes on a collection. Indexes improve filter performance during search. Supported field types: \`keyword\`, \`integer\`, \`float\`, \`geo\`, \`text\`, \`bool\`, \`datetime\`, \`uuid\`. Text indexes support tokenizer configuration.`,
  instructions: [
    'For `create`: provide `fieldName` and `fieldSchema`. The schema can be a simple type string (e.g., "keyword") or a detailed config object for text indexes.',
    'For `delete`: provide only `fieldName`.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      action: z.enum(['create', 'delete']).describe('Whether to create or delete the index'),
      fieldName: z.string().describe('Name of the payload field to index'),
      fieldSchema: z
        .any()
        .optional()
        .describe(
          'Field type ("keyword", "integer", "float", "geo", "text", "bool", "datetime", "uuid") or a detailed config object. Required for create.'
        ),
      wait: z.boolean().optional().describe('Wait for operation to complete (default: true)')
    })
  )
  .output(
    z.object({
      operationId: z.number().optional().describe('Operation ID'),
      status: z.string().describe('Operation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let wait = ctx.input.wait ?? true;
    let result: any;

    if (ctx.input.action === 'create') {
      if (!ctx.input.fieldSchema) throw new Error('fieldSchema is required for create action');
      result = await client.createPayloadIndex(
        ctx.input.collectionName,
        ctx.input.fieldName,
        ctx.input.fieldSchema,
        wait
      );
    } else {
      result = await client.deletePayloadIndex(
        ctx.input.collectionName,
        ctx.input.fieldName,
        wait
      );
    }

    return {
      output: {
        operationId: result.result?.operation_id,
        status: result.result?.status ?? 'completed'
      },
      message:
        ctx.input.action === 'create'
          ? `Created payload index on \`${ctx.input.fieldName}\` in \`${ctx.input.collectionName}\`. Status: **${result.result?.status ?? 'completed'}**.`
          : `Deleted payload index on \`${ctx.input.fieldName}\` from \`${ctx.input.collectionName}\`. Status: **${result.result?.status ?? 'completed'}**.`
    };
  })
  .build();
