import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, providerRecords, requireInput } from '../lib/response';
import { spec } from '../spec';

export let listAttributeOptions = SlateTool.create(spec, {
  key: 'list_attribute_options',
  name: 'List Attribute Options',
  description:
    'Retrieve the option IDs, names, colors, archive states, and ordering for a select, multiselect, or status attribute. Discover targetId with list_collections or list_lists, then attributeId with list_attributes.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      optionType: z
        .enum(['select', 'status'])
        .optional()
        .describe(
          'Use status for a status attribute; otherwise select/multiselect options are retrieved'
        ),
      target: z.enum(['collection', 'list']).describe('Resource containing the attribute'),
      targetId: z
        .string()
        .describe('Collection ID from list_collections or list ID from list_lists'),
      attributeId: z
        .string()
        .describe('Select or multiselect attribute ID from list_attributes')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      responseMessage: z.string(),
      options: z
        .array(z.record(z.string(), z.any()))
        .describe('Actual option objects returned by Zixflow'),
      raw: z.unknown().optional().describe('Complete response returned by Zixflow')
    })
  )
  .handleInvocation(async ctx => {
    requireInput(ctx.input.targetId, 'targetId');
    requireInput(ctx.input.attributeId, 'attributeId');
    let result = await new ZixflowClient(ctx.auth).getAttributeOptions(
      ctx.input.target,
      ctx.input.targetId,
      ctx.input.attributeId,
      ctx.input.optionType
    );
    return {
      output: { ...operationOutput(result), options: providerRecords(result.data) },
      message: 'Retrieved CRM attribute options.'
    };
  })
  .build();
