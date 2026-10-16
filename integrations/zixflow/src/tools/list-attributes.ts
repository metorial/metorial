import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, providerRecords, requireInput } from '../lib/response';
import { spec } from '../spec';

export let listAttributes = SlateTool.create(spec, {
  key: 'list_attributes',
  name: 'List Attributes',
  description:
    'Discover collection or list attribute IDs, API key names, field types, required fields, and configuration before creating or updating CRM records. Supply attributeId to retrieve one attribute. Discover targetId with list_collections or list_lists.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      target: z.enum(['collection', 'list']).describe('Resource whose attributes to inspect'),
      targetId: z
        .string()
        .describe('Collection ID from list_collections or list ID from list_lists'),
      attributeId: z
        .string()
        .optional()
        .describe('Attribute ID from a previous list_attributes result')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      responseMessage: z.string(),
      attributes: z
        .array(z.record(z.string(), z.any()))
        .describe('Actual attribute objects, including configuration and nullable defaults'),
      raw: z.unknown().optional().describe('Complete response returned by Zixflow')
    })
  )
  .handleInvocation(async ctx => {
    requireInput(ctx.input.targetId, 'targetId');
    if (ctx.input.attributeId !== undefined)
      requireInput(ctx.input.attributeId, 'attributeId');
    let result = await new ZixflowClient(ctx.auth).getAttributes(
      ctx.input.target,
      ctx.input.targetId,
      ctx.input.attributeId
    );
    return {
      output: {
        ...operationOutput(result),
        attributes: providerRecords(ctx.input.attributeId ? [result.data] : result.data)
      },
      message: 'Retrieved CRM attribute definitions.'
    };
  })
  .build();
