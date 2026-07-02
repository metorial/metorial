import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let managePayload = SlateTool.create(spec, {
  name: 'Manage Payload',
  key: 'manage_payload',
  description: `Sets, overwrites, deletes, or clears payload data on points. Supports targeting points by IDs or filter conditions. Use **set** to merge new payload fields, **overwrite** to replace the entire payload, **deleteKeys** to remove specific keys, or **clear** to remove all payload data.`,
  instructions: [
    'For `set`: merges the provided payload with existing data. Provide `payload` object.',
    'For `overwrite`: replaces the entire payload. Provide `payload` object.',
    'For `deleteKeys`: removes specific keys. Provide `keys` array.',
    'For `clear`: removes all payload data from the targeted points.',
    'Target points using either `pointIds` or `filter`, not both.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      action: z
        .enum(['set', 'overwrite', 'deleteKeys', 'clear'])
        .describe('Payload operation to perform'),
      pointIds: z
        .array(z.union([z.number(), z.string()]))
        .optional()
        .describe('Point IDs to target'),
      filter: z
        .any()
        .optional()
        .describe('Filter condition to target points (Qdrant filter syntax)'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('Payload data to set or overwrite (required for set/overwrite actions)'),
      keys: z
        .array(z.string())
        .optional()
        .describe('Payload keys to delete (required for deleteKeys action)'),
      nestedKey: z
        .string()
        .optional()
        .describe('Nested key path for set action (e.g., "metadata.source")'),
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

    if (ctx.input.action === 'set') {
      if (!ctx.input.payload) throw new Error('payload is required for set action');
      result = await client.setPayload(
        ctx.input.collectionName,
        {
          payload: ctx.input.payload,
          points: ctx.input.pointIds,
          filter: ctx.input.filter,
          key: ctx.input.nestedKey
        },
        wait
      );
    } else if (ctx.input.action === 'overwrite') {
      if (!ctx.input.payload) throw new Error('payload is required for overwrite action');
      result = await client.overwritePayload(
        ctx.input.collectionName,
        {
          payload: ctx.input.payload,
          points: ctx.input.pointIds,
          filter: ctx.input.filter
        },
        wait
      );
    } else if (ctx.input.action === 'deleteKeys') {
      if (!ctx.input.keys) throw new Error('keys is required for deleteKeys action');
      result = await client.deletePayloadKeys(
        ctx.input.collectionName,
        {
          keys: ctx.input.keys,
          points: ctx.input.pointIds,
          filter: ctx.input.filter
        },
        wait
      );
    } else if (ctx.input.action === 'clear') {
      result = await client.clearPayload(
        ctx.input.collectionName,
        {
          points: ctx.input.pointIds,
          filter: ctx.input.filter
        },
        wait
      );
    } else {
      throw new Error(`Unknown action: ${ctx.input.action}`);
    }

    return {
      output: {
        operationId: result.result?.operation_id,
        status: result.result?.status ?? 'completed'
      },
      message: `Payload **${ctx.input.action}** operation completed on \`${ctx.input.collectionName}\`. Status: **${result.result?.status ?? 'completed'}**.`
    };
  })
  .build();
