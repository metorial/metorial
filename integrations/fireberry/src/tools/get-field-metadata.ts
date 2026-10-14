import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFieldMetadata = SlateTool.create(spec, {
  name: 'Get Field Metadata',
  key: 'get_field_metadata',
  description:
    'Retrieve the full metadata for one Fireberry field, including its label and type and any provider-specific configuration. Call list_objects and list_object_fields to discover object numbers and field names.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      objectId: z
        .union([z.number(), z.string()])
        .describe('Object type number. Call list_objects to discover object numbers.'),
      fieldName: z
        .string()
        .min(1)
        .describe(
          'Field system name. Call list_object_fields to discover available field names.'
        )
    })
  )
  .output(
    z.object({
      field: z
        .record(z.string(), z.any())
        .describe('Complete field metadata returned by Fireberry.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let field = await client.getFieldDetails(ctx.input.objectId, ctx.input.fieldName);
    return {
      output: { field },
      message: `Retrieved metadata for **${ctx.input.fieldName}** on object **${ctx.input.objectId}**.`
    };
  })
  .build();
