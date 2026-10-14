import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateField = SlateTool.create(spec, {
  name: 'Update Field',
  key: 'update_field',
  description:
    'Updates the label and merge tag of a custom field. Call list_fields to discover field IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      fieldId: z
        .number()
        .int()
        .positive()
        .describe('Field ID. Call list_fields to discover field IDs.'),
      fieldLabel: z.string().describe('Updated display label of the field'),
      fieldMergeTag: z.string().describe('Updated merge tag key of the field')
    })
  )
  .output(
    z.object({
      fieldId: z.number().describe('ID of the updated field'),
      fieldLabel: z.string().describe('Display label of the updated field'),
      fieldMergeTag: z.string().describe('Merge tag key of the updated field'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let field = await client.updateField(
      ctx.input.fieldId,
      ctx.input.fieldLabel,
      ctx.input.fieldMergeTag
    );
    return {
      output: {
        fieldId: field.id,
        fieldLabel: field.fieldLabel,
        fieldMergeTag: field.fieldMergeTag,
        createdAt: field.createdAt,
        updatedAt: field.updatedAt
      },
      message: `Custom field **${field.fieldLabel}** updated successfully.`
    };
  })
  .build();
